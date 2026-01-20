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
	findMatchingLines,
	getLineNumberWidth,
	LINE_NUMBER_WIDTH_THRESHOLD,
	truncateLine,
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

/** Selection position: line index + character column */
interface SelectionPosition {
	line: number;
	col: number;
}

// Highlight search matches in a line by splitting into segments
function highlightMatches(
	line: string,
	query: string,
	matchColor: string,
	textColor: string,
): React.ReactNode[] {
	if (!query) return [line];

	const parts: React.ReactNode[] = [];
	const lowerLine = line.toLowerCase();
	const lowerQuery = query.toLowerCase();
	let lastIndex = 0;
	let matchIndex = lowerLine.indexOf(lowerQuery);
	let keyIndex = 0;

	while (matchIndex !== -1) {
		// Add text before match
		if (matchIndex > lastIndex) {
			parts.push(
				<span key={keyIndex++} fg={textColor}>
					{line.substring(lastIndex, matchIndex)}
				</span>,
			);
		}
		// Add highlighted match
		parts.push(
			<span key={keyIndex++} fg={matchColor}>
				{line.substring(matchIndex, matchIndex + query.length)}
			</span>,
		);
		lastIndex = matchIndex + query.length;
		matchIndex = lowerLine.indexOf(lowerQuery, lastIndex);
	}

	// Add remaining text
	if (lastIndex < line.length) {
		parts.push(
			<span key={keyIndex++} fg={textColor}>
				{line.substring(lastIndex)}
			</span>,
		);
	}

	return parts;
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

		const scrollTop = scrollbox.scrollTop;
		const viewportHeight = scrollbox.viewport.height;
		const contentHeight = scrollbox.scrollHeight;

		// If content fits in viewport, no scroll indicators needed
		if (contentHeight <= viewportHeight) {
			setScrollInfo({ linesAbove: 0, linesBelow: 0 });
			return;
		}

		// Calculate as percentage of total scrollable area, then apply to logical lines
		// This correctly handles wrapped lines by using scroll ratio instead of raw heights
		const maxScroll = contentHeight - viewportHeight;
		const scrollRatio = maxScroll > 0 ? scrollTop / maxScroll : 0;

		// Estimate visible lines (may be less than viewport if lines are wrapped)
		const estimatedVisibleLines = Math.min(viewportHeight, totalLines);
		const scrollableLines = Math.max(0, totalLines - estimatedVisibleLines);

		const linesAbove = Math.round(scrollRatio * scrollableLines);
		const linesBelow = Math.max(0, scrollableLines - linesAbove);

		setScrollInfo({ linesAbove, linesBelow });
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

	// Convert mouse x position to character column within line content
	// x is global terminal coordinate, targetX is the element's absolute x position
	const xToCol = useCallback(
		(globalX: number, targetX: number, lineLength: number): number => {
			// Calculate local x position within the line box
			// The target's x already points to the start of this element
			const localX = globalX - targetX;
			// Note: We don't subtract the gutter here because the event target
			// is the content text, which is already positioned after the gutter
			return Math.max(0, Math.min(localX, lineLength));
		},
		[],
	);

	// Normalize selection so start is always before end
	const normalizeSelection = useCallback(
		(
			start: SelectionPosition | null,
			end: SelectionPosition | null,
		): { start: SelectionPosition; end: SelectionPosition } | null => {
			if (!start || !end) return null;
			// Compare positions: first by line, then by column
			if (
				start.line < end.line ||
				(start.line === end.line && start.col <= end.col)
			) {
				return { start, end };
			}
			return { start: end, end: start };
		},
		[],
	);

	// Get selected text from character-level selection
	const getSelectedText = useCallback((): string => {
		const normalized = normalizeSelection(selectionStart, selectionEnd);
		if (!normalized) return "";

		const { start, end } = normalized;

		if (start.line === end.line) {
			// Single line selection
			const line = logLines[start.line] ?? "";
			return line.substring(start.col, end.col);
		}

		// Multi-line selection
		const lines: string[] = [];
		for (let i = start.line; i <= end.line; i++) {
			const line = logLines[i] ?? "";
			if (i === start.line) {
				// First line: from start col to end
				lines.push(line.substring(start.col));
			} else if (i === end.line) {
				// Last line: from start to end col
				lines.push(line.substring(0, end.col));
			} else {
				// Middle lines: entire line
				lines.push(line);
			}
		}
		return lines.join("\n");
	}, [selectionStart, selectionEnd, logLines, normalizeSelection]);

	// Get selection range for a specific line (returns null if line not in selection)
	const getLineSelection = useCallback(
		(
			lineIndex: number,
			lineLength: number,
		): { startCol: number; endCol: number } | null => {
			const normalized = normalizeSelection(selectionStart, selectionEnd);
			if (!normalized) return null;

			const { start, end } = normalized;

			if (lineIndex < start.line || lineIndex > end.line) {
				return null; // Line not in selection
			}

			if (start.line === end.line && lineIndex === start.line) {
				// Single line selection
				return { startCol: start.col, endCol: end.col };
			}

			if (lineIndex === start.line) {
				// First line of multi-line selection
				return { startCol: start.col, endCol: lineLength };
			}

			if (lineIndex === end.line) {
				// Last line of multi-line selection
				return { startCol: 0, endCol: end.col };
			}

			// Middle line - entire line selected
			return { startCol: 0, endCol: lineLength };
		},
		[selectionStart, selectionEnd, normalizeSelection],
	);

	// Handle mouse down - start potential selection
	const handleMouseDown = useCallback(
		(lineIndex: number, event: MouseEvent) => {
			event.preventDefault(); // Prevent native selection
			isDraggingRef.current = true;
			const line = logLines[lineIndex] ?? "";
			const targetX = event.target?.x ?? 0;
			const col = xToCol(event.x, targetX, line.length);
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
		[logLines, xToCol],
	);

	// Handle mouse drag - update selection end
	const handleMouseDrag = useCallback(
		(lineIndex: number, event: MouseEvent) => {
			if (!isDraggingRef.current) return;
			const line = logLines[lineIndex] ?? "";
			const targetX = event.target?.x ?? 0;
			const col = xToCol(event.x, targetX, line.length);
			setSelectionEnd({ line: lineIndex, col });
		},
		[logLines, xToCol],
	);

	// Handle mouse up - finish selection and copy
	const handleMouseUp = useCallback(
		(lineIndex: number, event: MouseEvent) => {
			if (!isDraggingRef.current) return;
			isDraggingRef.current = false;

			const line = logLines[lineIndex] ?? "";
			const targetX = event.target?.x ?? 0;
			const col = xToCol(event.x, targetX, line.length);
			const endPos = { line: lineIndex, col };
			setSelectionEnd(endPos);

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
		[logLines, xToCol, copyText, getSelectedText],
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
