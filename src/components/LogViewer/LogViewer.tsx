import {
	type MouseEvent,
	type ScrollBoxRenderable,
	TextAttributes,
} from "@opentui/core";
import {
	useKeyboard,
	useRenderer,
	useTerminalDimensions,
} from "@opentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copyToClipboard } from "../../lib/clipboard";
import type { Theme } from "../../lib/theme";
import type { ToolState } from "../../types";
import { TextInput } from "../TextInput";
import { toast } from "../Toast";
import {
	calculateContentWidth,
	calculateHighlightSegments,
	calculateScrollInfo,
	findMatchingLines,
	getLineNumberWidth,
	getLineSelection as getLineSelectionUtil,
	getSelectedText as getSelectedTextUtil,
	LINE_NUMBER_WIDTH_THRESHOLD,
	type SelectionPosition,
	truncateLine,
	visualPositionToColumn,
} from "./log-viewer-utils";

interface LogViewerProps {
	tool: ToolState;
	theme: Theme;
	searchMode: boolean;
	searchQuery: string;
	filterMode: boolean;
	currentMatchIndex: number;
	onSearchModeChange: (active: boolean) => void;
	onSearchQueryChange: (query: string) => void;
	onFilterModeChange: (filter: boolean) => void;
	/** Control line number visibility: true = always, false = never, "auto" = based on terminal width */
	showLineNumbers?: boolean | "auto";
	/** Whether to wrap long lines (true) or truncate them (false) */
	lineWrap?: boolean;
	/** Width of sidebar (when in vertical layout mode), used for truncation calculation */
	sidebarWidth?: number;
}

interface ScrollInfo {
	linesAbove: number;
	linesBelow: number;
}

// Highlight search matches in a line by splitting into segments
function highlightMatches(
	line: string,
	query: string,
	matchColor: string,
	textColor: string,
): React.ReactNode[] {
	const segments = calculateHighlightSegments(line, query);

	// If single segment with no match, return plain text
	if (segments.length === 1 && !segments[0]?.isMatch) {
		return [line];
	}

	// Build keys based on cumulative position to ensure uniqueness
	let pos = 0;
	return segments.map((segment) => {
		const key = `${pos}-${segment.isMatch ? "m" : "t"}`;
		pos += segment.text.length;
		return (
			<span key={key} fg={segment.isMatch ? matchColor : textColor}>
				{segment.text}
			</span>
		);
	});
}

export function LogViewer({
	tool,
	theme,
	searchMode,
	searchQuery,
	filterMode,
	currentMatchIndex,
	onSearchModeChange,
	onSearchQueryChange,
	onFilterModeChange,
	showLineNumbers = "auto",
	lineWrap = true,
	sidebarWidth = 0,
}: LogViewerProps) {
	const { colors } = theme;
	const scrollboxRef = useRef<ScrollBoxRenderable>(null);
	const renderer = useRenderer();
	const { width: terminalWidth } = useTerminalDimensions();
	const [scrollInfo, setScrollInfo] = useState<ScrollInfo>({
		linesAbove: 0,
		linesBelow: 0,
	});

	// Flash state for copy feedback
	const [flashingLine, setFlashingLine] = useState<number | null>(null);

	// Double-click detection - tracks the PREVIOUS completed click
	const lastClickRef = useRef<{ lineIndex: number; time: number } | null>(null);
	const isDoubleClickRef = useRef(false);
	const DOUBLE_CLICK_THRESHOLD = 400; // ms

	// Character-level selection state
	const [selectionStart, setSelectionStart] =
		useState<SelectionPosition | null>(null);
	const [selectionEnd, setSelectionEnd] = useState<SelectionPosition | null>(
		null,
	);
	const isDraggingRef = useRef(false);
	// Store start position in ref for reliable comparison (avoids async state issues)
	const selectionStartRef = useRef<SelectionPosition | null>(null);
	// Store the reference target position from mouseDown for consistent column calculation during drag
	// This prevents issues where event.target changes as mouse moves over different elements
	const dragTargetRefPos = useRef<{ x: number; y: number } | null>(null);

	// Determine if line numbers should be shown
	const shouldShowLineNumbers =
		showLineNumbers === true ||
		(showLineNumbers === "auto" &&
			terminalWidth >= LINE_NUMBER_WIDTH_THRESHOLD);

	// Convert logs to plain text (just concatenate segment text)
	// Note: tool.logs.length is intentionally included to detect array mutations
	// since the logs array reference stays the same when items are pushed
	// biome-ignore lint/correctness/useExhaustiveDependencies: length detects array mutations
	const logLines = useMemo(
		() =>
			tool.logs.map((segments) =>
				segments.map((segment) => segment.text).join(""),
			),
		[tool.logs, tool.logs.length],
	);

	const totalLines = logLines.length;
	const lineNumberWidth = getLineNumberWidth(totalLines);

	// Find matching lines for search
	const matchingLines = useMemo(
		() => findMatchingLines(logLines, searchQuery),
		[logLines, searchQuery],
	);

	// Calculate available width for line content (for truncation when lineWrap is off)
	const contentWidth = calculateContentWidth({
		terminalWidth,
		sidebarWidth,
		showLineNumbers: shouldShowLineNumbers,
		lineNumberWidth,
	});

	// Update scroll info based on current scroll position
	const updateScrollInfo = useCallback(() => {
		const scrollbox = scrollboxRef.current;
		if (!scrollbox) return;

		const info = calculateScrollInfo({
			scrollTop: scrollbox.scrollTop,
			viewportHeight: scrollbox.viewport.height,
			contentHeight: scrollbox.scrollHeight,
			totalLines,
		});

		setScrollInfo(info);
	}, [totalLines]);

	// Scroll to bottom when switching tabs (tool changes)
	// biome-ignore lint/correctness/useExhaustiveDependencies: only trigger on tool name change
	useEffect(() => {
		// Use setTimeout to ensure the scrollbox has rendered with new content
		const timeout = setTimeout(() => {
			const scrollbox = scrollboxRef.current;
			if (scrollbox) {
				scrollbox.scrollTo(scrollbox.scrollHeight);
			}
		}, 0);
		return () => clearTimeout(timeout);
	}, [tool.config.name]);

	// Update scroll info when logs change
	// biome-ignore lint/correctness/useExhaustiveDependencies: totalLines triggers update when new logs arrive
	useEffect(() => {
		updateScrollInfo();
	}, [updateScrollInfo, totalLines]);

	// Set up an interval to check scroll position periodically
	useEffect(() => {
		const interval = setInterval(updateScrollInfo, 100);
		return () => clearInterval(interval);
	}, [updateScrollInfo]);

	// Scroll to a specific line
	const scrollToLine = useCallback((lineIndex: number) => {
		const scrollbox = scrollboxRef.current;
		if (scrollbox) {
			// Scroll so the line is in the middle of the viewport if possible
			const viewportHeight = scrollbox.viewport.height;
			const targetScroll = Math.max(
				0,
				lineIndex - Math.floor(viewportHeight / 2),
			);
			scrollbox.scrollTo(targetScroll);
		}
	}, []);

	const scrollToTop = useCallback(() => {
		scrollboxRef.current?.scrollTo(0);
	}, []);

	const scrollToBottom = useCallback(() => {
		const scrollbox = scrollboxRef.current;
		if (scrollbox) {
			scrollbox.scrollTo(scrollbox.scrollHeight);
		}
	}, []);

	// Handle keyboard input
	useKeyboard((key) => {
		// Handle search mode input
		if (searchMode) {
			if (key.name === "escape") {
				onSearchModeChange(false);
				return;
			}
			// Toggle filter mode with Ctrl+H
			if (key.ctrl && key.name === "h") {
				onFilterModeChange(!filterMode);
				return;
			}
			// Let TextInput and the input component handle text editing
			return;
		}

		// Normal mode keyboard handling
		if (key.name === "/") {
			// Enter search mode
			onSearchModeChange(true);
			return;
		}

		if (key.name === "escape") {
			// Clear search
			onSearchQueryChange("");
			return;
		}
	});

	// Helper to copy text to clipboard using the renderer's real stdout
	const copyText = useCallback(
		(text: string) => {
			const realWrite = (
				renderer as unknown as {
					realStdoutWrite?: typeof process.stdout.write;
				}
			).realStdoutWrite;
			if (realWrite) {
				copyToClipboard(text, (data) => realWrite.call(process.stdout, data));
			} else {
				copyToClipboard(text);
			}
		},
		[renderer],
	);

	// Convert mouse position to character column within line content
	// Handles word-wrapped lines by calculating actual wrap break points
	const positionToCol = useCallback(
		(
			globalX: number,
			globalY: number,
			targetX: number,
			targetY: number,
			lineText: string,
			wrapWidth: number,
		): number => {
			// Calculate local position within the text element
			const localX = globalX - targetX;
			const localY = globalY - targetY;

			// Calculate which visual row we're on (0-indexed)
			// Each visual row is 1 unit tall in terminal coordinates
			const visualRow = Math.max(0, Math.floor(localY));

			// Use word-wrap-aware calculation to get the actual column
			return visualPositionToColumn(visualRow, localX, lineText, wrapWidth);
		},
		[],
	);

	// Get selected text from character-level selection
	const getSelectedText = useCallback((): string => {
		return getSelectedTextUtil(selectionStart, selectionEnd, logLines);
	}, [selectionStart, selectionEnd, logLines]);

	// Get selection range for a specific line (returns null if line not in selection)
	const getLineSelection = useCallback(
		(
			lineIndex: number,
			lineLength: number,
		): { startCol: number; endCol: number } | null => {
			return getLineSelectionUtil(
				lineIndex,
				lineLength,
				selectionStart,
				selectionEnd,
			);
		},
		[selectionStart, selectionEnd],
	);

	// Handle mouse down - start potential selection
	const handleMouseDown = useCallback(
		(lineIndex: number, event: MouseEvent) => {
			event.preventDefault(); // Prevent native selection
			isDraggingRef.current = true;
			const line = logLines[lineIndex] ?? "";
			const targetX = event.target?.x ?? 0;
			const targetY = event.target?.y ?? 0;
			// Store the reference position for consistent calculations during drag
			// This prevents issues when event.target changes as mouse moves over different elements
			dragTargetRefPos.current = { x: targetX, y: targetY };
			const col = positionToCol(
				event.x,
				event.y,
				targetX,
				targetY,
				line,
				contentWidth,
			);
			const pos = { line: lineIndex, col };
			setSelectionStart(pos);
			setSelectionEnd(pos);
			// Store in ref for reliable comparison in mouseUp
			selectionStartRef.current = pos;

			// Check for double-click based on PREVIOUS click
			const now = Date.now();
			const lastClick = lastClickRef.current;
			isDoubleClickRef.current =
				lastClick !== null &&
				lastClick.lineIndex === lineIndex &&
				now - lastClick.time < DOUBLE_CLICK_THRESHOLD;
		},
		[logLines, positionToCol, contentWidth],
	);

	// Handle mouse drag - update selection end
	const handleMouseDrag = useCallback(
		(lineIndex: number, event: MouseEvent) => {
			if (!isDraggingRef.current) return;
			const line = logLines[lineIndex] ?? "";
			// Use the stored reference position from mouseDown for consistent column calculation
			// This prevents offset jumps when dragging across different elements
			const refPos = dragTargetRefPos.current;
			const targetX = refPos?.x ?? event.target?.x ?? 0;
			const targetY = refPos?.y ?? event.target?.y ?? 0;
			const col = positionToCol(
				event.x,
				event.y,
				targetX,
				targetY,
				line,
				contentWidth,
			);
			setSelectionEnd({ line: lineIndex, col });
		},
		[logLines, positionToCol, contentWidth],
	);

	// Handle mouse up - finish selection and copy
	const handleMouseUp = useCallback(
		(lineIndex: number, event: MouseEvent) => {
			if (!isDraggingRef.current) return;
			isDraggingRef.current = false;

			const line = logLines[lineIndex] ?? "";
			// Use the stored reference position from mouseDown for consistent column calculation
			const refPos = dragTargetRefPos.current;
			const targetX = refPos?.x ?? event.target?.x ?? 0;
			const targetY = refPos?.y ?? event.target?.y ?? 0;
			const col = positionToCol(
				event.x,
				event.y,
				targetX,
				targetY,
				line,
				contentWidth,
			);
			const endPos = { line: lineIndex, col };
			setSelectionEnd(endPos);
			// Clear the reference position
			dragTargetRefPos.current = null;

			// Use ref for start position (more reliable than async state)
			const startPos = selectionStartRef.current;

			// Check if this was detected as a double-click in mouseDown
			if (isDoubleClickRef.current) {
				// Double-click: copy entire line
				const fullLine = logLines[lineIndex];
				if (fullLine !== undefined) {
					copyText(fullLine);
					setFlashingLine(lineIndex);
					setTimeout(() => setFlashingLine(null), 150);
					toast.success("Copied line to clipboard");
				}
				// Reset double-click detection
				isDoubleClickRef.current = false;
				lastClickRef.current = null;
				selectionStartRef.current = null;
				setSelectionStart(null);
				setSelectionEnd(null);
			} else {
				// Check if there's actually a drag selection (not just a single click)
				// Must have different line OR moved at least 2 columns to avoid accidental selections
				const MIN_SELECTION_CHARS = 2;
				const hasRealSelection =
					startPos &&
					(startPos.line !== endPos.line ||
						Math.abs(startPos.col - endPos.col) >= MIN_SELECTION_CHARS);

				if (hasRealSelection) {
					// Drag selection: copy selected text
					const selectedText = getSelectedText();
					if (selectedText && selectedText.length > 0) {
						copyText(selectedText);
						const charCount = selectedText.length;
						const lineCount = selectedText.split("\n").length;
						if (lineCount > 1) {
							toast.success(`Copied ${lineCount} lines to clipboard`);
						} else {
							toast.success(
								`Copied ${charCount} character${charCount > 1 ? "s" : ""} to clipboard`,
							);
						}
						// Clear selection after brief delay
						setTimeout(() => {
							setSelectionStart(null);
							setSelectionEnd(null);
							selectionStartRef.current = null;
						}, 150);
					} else {
						setSelectionStart(null);
						setSelectionEnd(null);
						selectionStartRef.current = null;
					}
					// Reset click tracking since this was a drag
					lastClickRef.current = null;
				} else {
					// Single click without drag - record for potential double-click
					lastClickRef.current = { lineIndex, time: Date.now() };
					setSelectionStart(null);
					setSelectionEnd(null);
					selectionStartRef.current = null;
				}
			}
		},
		[logLines, positionToCol, contentWidth, copyText, getSelectedText],
	);

	return (
		<box flexGrow={1} height="100%" flexDirection="column">
			{/* Search bar */}
			{(searchMode || searchQuery) && (
				<box
					height={3}
					width="100%"
					border
					borderStyle="single"
					borderColor={colors.lineNumberText}
					backgroundColor={colors.background}
					paddingLeft={1}
					paddingRight={1}
					flexDirection="row"
				>
					{searchMode ? (
						<TextInput
							value={searchQuery}
							onValueChange={onSearchQueryChange}
							onEmpty={() => onSearchModeChange(false)}
							onSubmit={() => {
								onSearchModeChange(false);
								if (matchingLines.length > 0) {
									const lineIndex = matchingLines[currentMatchIndex];
									if (lineIndex !== undefined) {
										scrollToLine(lineIndex);
									}
								}
							}}
							focused={searchMode}
							theme={theme}
							prefix="/"
							prefixBold
							prefixColor={colors.searchSlash}
						/>
					) : (
						<>
							<text attributes={TextAttributes.BOLD} fg={colors.searchSlash}>
								/
							</text>
							<text fg={colors.text} flexGrow={1}>
								{searchQuery}
							</text>
						</>
					)}
					<text fg={colors.lineNumberText}>
						{matchingLines.length > 0 && !searchMode && (
							<span>
								{" "}
								({currentMatchIndex + 1}/{matchingLines.length})
							</span>
						)}
						{searchQuery && matchingLines.length === 0 && (
							<span fg={colors.statusError}> (no matches)</span>
						)}
						<span> [Filter: {filterMode ? "ON" : "OFF"}]</span>
					</text>
				</box>
			)}

			{/* Top scroll indicator */}
			{scrollInfo.linesAbove > 0 && (
				<box
					height={1}
					width="100%"
					justifyContent="center"
					alignItems="center"
					backgroundColor={colors.background}
					onMouseUp={scrollToTop}
				>
					<text fg={colors.inactiveTabText}>
						↑ {scrollInfo.linesAbove} more ↑
					</text>
				</box>
			)}

			<scrollbox
				ref={scrollboxRef}
				flexGrow={1}
				height="100%"
				backgroundColor={colors.background}
				stickyScroll
				stickyStart="bottom"
				scrollbarOptions={{
					paddingLeft: 1,
				}}
			>
				{tool.logs.length === 0 ? (
					<box paddingLeft={1} paddingRight={1}>
						<text fg={colors.text}>
							{tool.status === "running"
								? "Waiting for output..."
								: tool.status === "shuttingDown"
									? "Shutting down gracefully..."
									: tool.status === "error"
										? `Process error (exit code: ${tool.exitCode ?? "unknown"})`
										: "Process not started"}
						</text>
					</box>
				) : (
					(() => {
						// Build display list: filter lines if filter mode is ON with active search
						const displayItems =
							filterMode && searchQuery
								? matchingLines.map((originalIndex) => ({
										originalIndex,
										line: logLines[originalIndex] ?? "",
									}))
								: logLines.map((line, index) => ({
										originalIndex: index,
										line,
									}));

						return displayItems.map(({ originalIndex, line }) => {
							const isFlashing = flashingLine === originalIndex;
							const isMatch =
								searchQuery && matchingLines.includes(originalIndex);
							const lineNumber = String(originalIndex + 1).padStart(
								lineNumberWidth,
								" ",
							);
							const lineSelection = getLineSelection(
								originalIndex,
								line.length,
							);

							// Get display line (truncated if lineWrap is off)
							const displayLine = truncateLine(line, contentWidth, lineWrap);

							// Render line content with character-level selection highlighting
							const renderLineContent = () => {
								// If flashing, highlight entire line (use display line for visual)
								if (isFlashing) {
									return (
										<span bg={colors.selectedLineBackground} fg={colors.text}>
											{displayLine}
										</span>
									);
								}

								// If line has selection (apply to display line for visual)
								if (lineSelection) {
									const { startCol, endCol } = lineSelection;
									// Clamp selection to display line length
									const displayStartCol = Math.min(
										startCol,
										displayLine.length,
									);
									const displayEndCol = Math.min(endCol, displayLine.length);
									const before = displayLine.substring(0, displayStartCol);
									const selected = displayLine.substring(
										displayStartCol,
										displayEndCol,
									);
									const after = displayLine.substring(displayEndCol);

									return (
										<>
											{before && <span fg={colors.text}>{before}</span>}
											{selected && (
												<span
													bg={colors.selectedLineBackground}
													fg={colors.text}
												>
													{selected}
												</span>
											)}
											{after && <span fg={colors.text}>{after}</span>}
										</>
									);
								}

								// Search match highlighting (use display line)
								if (searchQuery && isMatch) {
									return highlightMatches(
										displayLine,
										searchQuery,
										colors.searchMatchText,
										colors.text,
									);
								}

								// Plain text
								return displayLine;
							};

							// Calculate gutter width for proper column sizing
							const gutterColumnWidth = lineNumberWidth + 1; // line number + space before border

							return (
								<box
									key={`log-${tool.config.name}-${originalIndex}`}
									flexDirection="row"
									backgroundColor={colors.background}
									onMouseDown={(e: MouseEvent) =>
										handleMouseDown(originalIndex, e)
									}
									onMouseDrag={(e: MouseEvent) =>
										handleMouseDrag(originalIndex, e)
									}
									onMouseUp={(e: MouseEvent) => handleMouseUp(originalIndex, e)}
								>
									{/* Line number gutter - fixed width column with right border */}
									{shouldShowLineNumbers && (
										<box
											width={gutterColumnWidth}
											flexShrink={0}
											border={["right"]}
											borderStyle="single"
											borderColor={colors.lineNumberText}
										>
											<text fg={colors.lineNumberText}>{lineNumber}</text>
										</box>
									)}
									{/* Log content - flexible column */}
									<box flexGrow={1} paddingLeft={shouldShowLineNumbers ? 1 : 0}>
										<text fg={colors.text}>{renderLineContent()}</text>
									</box>
								</box>
							);
						});
					})()
				)}
			</scrollbox>

			{/* Bottom scroll indicator */}
			{scrollInfo.linesBelow > 0 && (
				<box
					height={1}
					width="100%"
					justifyContent="center"
					alignItems="center"
					backgroundColor={colors.background}
					onMouseUp={scrollToBottom}
				>
					<text fg={colors.inactiveTabText}>
						↓ {scrollInfo.linesBelow} more ↓
					</text>
				</box>
			)}
		</box>
	);
}
