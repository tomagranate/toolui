/** Calculate the width needed for line numbers */
export function getLineNumberWidth(totalLines: number): number {
	return Math.max(3, String(totalLines).length);
}

/**
 * Calculate word wrap break points for a line of text.
 * Returns an array of starting character indices for each visual row.
 * e.g., [0, 45, 92] means row 0 starts at char 0, row 1 at char 45, row 2 at char 92.
 *
 * This mimics terminal word wrapping behavior:
 * - Wraps at word boundaries (spaces) when possible
 * - If a word is longer than wrapWidth, wraps mid-word
 */
export function calculateWordWrapPoints(
	text: string,
	wrapWidth: number,
): number[] {
	if (wrapWidth <= 0 || text.length <= wrapWidth) {
		return [0]; // No wrapping needed
	}

	const breakPoints = [0];
	let currentPos = 0;

	while (currentPos < text.length) {
		const remaining = text.length - currentPos;
		if (remaining <= wrapWidth) {
			// Remaining text fits on one line
			break;
		}

		// Find where this visual row should end
		const endPos = currentPos + wrapWidth;

		// Look backwards for a space to wrap at word boundary
		let wrapPos = endPos;
		while (wrapPos > currentPos && text[wrapPos] !== " ") {
			wrapPos--;
		}

		if (wrapPos === currentPos) {
			// No space found in this segment - word is longer than wrapWidth
			// Force wrap at the width
			wrapPos = endPos;
		} else {
			// Found a space - wrap after it (space stays at end of current row)
			wrapPos++;
		}

		breakPoints.push(wrapPos);
		currentPos = wrapPos;
	}

	return breakPoints;
}

/**
 * Convert a visual row and local X position to a character column in the original line.
 * Accounts for word wrapping by using calculated break points.
 */
export function visualPositionToColumn(
	visualRow: number,
	localX: number,
	text: string,
	wrapWidth: number,
): number {
	const wrapPoints = calculateWordWrapPoints(text, wrapWidth);

	// Get the starting position for this visual row
	const rowStart =
		wrapPoints[visualRow] ?? wrapPoints[wrapPoints.length - 1] ?? 0;

	// Column is the row start plus the local X offset
	const col = rowStart + localX;

	// Clamp to valid range
	return Math.max(0, Math.min(col, text.length));
}

/** Find all indices where the search query matches (case-insensitive) */
export function findMatchingLines(lines: string[], query: string): number[] {
	if (!query) return [];
	const lowerQuery = query.toLowerCase();
	const matches: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line?.toLowerCase().includes(lowerQuery)) {
			matches.push(i);
		}
	}
	return matches;
}

/** Minimum terminal width to show line numbers in "auto" mode */
export const LINE_NUMBER_WIDTH_THRESHOLD = 80;

/** Width of the line number gutter (number + separator) */
export const LINE_NUMBER_GUTTER_WIDTH = 6;

interface ContentWidthParams {
	terminalWidth: number;
	sidebarWidth: number;
	showLineNumbers: boolean;
	lineNumberWidth: number;
}

/**
 * Calculate the available width for line content (for truncation when lineWrap is off).
 * Accounts for all nested container widths:
 * - Sidebar (when in vertical layout): sidebarWidth (width + border, but borders overlap)
 * - LogViewer border box: 2 (left + right)
 * - Line number gutter (when shown): lineNumberWidth + 2 (number + border + padding)
 * - Content padding left (when line numbers shown): 1
 * - Scrollbar area: 2 (scrollbar + paddingLeft)
 */
export function calculateContentWidth({
	terminalWidth,
	sidebarWidth,
	showLineNumbers,
	lineNumberWidth,
}: ContentWidthParams): number {
	const logViewerBorder = 2;
	const gutterWidth = showLineNumbers ? lineNumberWidth + 2 : 0;
	const contentPadding = showLineNumbers ? 1 : 0;
	const scrollbarWidth = 2;

	// When sidebar is present, the sidebar's border is already included in sidebarWidth (22 = 20 + 2),
	// but we're also counting logViewerBorder (2). Empirically adjusted to get correct truncation.
	const effectiveSidebarWidth = sidebarWidth > 0 ? sidebarWidth - 3 : 0;

	return Math.max(
		20,
		terminalWidth -
			effectiveSidebarWidth -
			logViewerBorder -
			gutterWidth -
			contentPadding -
			scrollbarWidth,
	);
}

/**
 * Truncate a line to fit within the given width, adding ellipsis if needed.
 * Returns the original line if it fits or if lineWrap is enabled.
 */
export function truncateLine(
	line: string,
	contentWidth: number,
	lineWrap: boolean,
): string {
	if (lineWrap || line.length <= contentWidth) return line;
	return `${line.substring(0, contentWidth - 1)}…`;
}

interface ScrollInfoParams {
	scrollTop: number;
	viewportHeight: number;
	contentHeight: number;
	totalLines: number;
}

interface ScrollInfo {
	linesAbove: number;
	linesBelow: number;
}

/**
 * Calculate the number of lines above and below the viewport.
 * Uses scroll ratio to correctly handle wrapped lines.
 */
export function calculateScrollInfo({
	scrollTop,
	viewportHeight,
	contentHeight,
	totalLines,
}: ScrollInfoParams): ScrollInfo {
	// If content fits in viewport, no scroll indicators needed
	if (contentHeight <= viewportHeight) {
		return { linesAbove: 0, linesBelow: 0 };
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

	return { linesAbove, linesBelow };
}

// ============================================================================
// Selection utilities
// ============================================================================

/** Selection position: line index + character column */
export interface SelectionPosition {
	line: number;
	col: number;
}

/** Normalized selection with start always before end */
export interface NormalizedSelection {
	start: SelectionPosition;
	end: SelectionPosition;
}

/** Line selection range */
export interface LineSelectionRange {
	startCol: number;
	endCol: number;
}

/**
 * Normalize selection so start is always before end.
 * Returns null if either position is null.
 */
export function normalizeSelection(
	start: SelectionPosition | null,
	end: SelectionPosition | null,
): NormalizedSelection | null {
	if (!start || !end) return null;
	// Compare positions: first by line, then by column
	if (
		start.line < end.line ||
		(start.line === end.line && start.col <= end.col)
	) {
		return { start, end };
	}
	return { start: end, end: start };
}

/**
 * Get selected text from character-level selection.
 * Returns empty string if no valid selection.
 */
export function getSelectedText(
	start: SelectionPosition | null,
	end: SelectionPosition | null,
	lines: string[],
): string {
	const normalized = normalizeSelection(start, end);
	if (!normalized) return "";

	const { start: normStart, end: normEnd } = normalized;

	if (normStart.line === normEnd.line) {
		// Single line selection
		const line = lines[normStart.line] ?? "";
		return line.substring(normStart.col, normEnd.col);
	}

	// Multi-line selection
	const selectedLines: string[] = [];
	for (let i = normStart.line; i <= normEnd.line; i++) {
		const line = lines[i] ?? "";
		if (i === normStart.line) {
			// First line: from start col to end
			selectedLines.push(line.substring(normStart.col));
		} else if (i === normEnd.line) {
			// Last line: from start to end col
			selectedLines.push(line.substring(0, normEnd.col));
		} else {
			// Middle lines: entire line
			selectedLines.push(line);
		}
	}
	return selectedLines.join("\n");
}

/**
 * Get selection range for a specific line.
 * Returns null if line is not in selection.
 */
export function getLineSelection(
	lineIndex: number,
	lineLength: number,
	start: SelectionPosition | null,
	end: SelectionPosition | null,
): LineSelectionRange | null {
	const normalized = normalizeSelection(start, end);
	if (!normalized) return null;

	const { start: normStart, end: normEnd } = normalized;

	if (lineIndex < normStart.line || lineIndex > normEnd.line) {
		return null; // Line not in selection
	}

	if (normStart.line === normEnd.line && lineIndex === normStart.line) {
		// Single line selection
		return { startCol: normStart.col, endCol: normEnd.col };
	}

	if (lineIndex === normStart.line) {
		// First line of multi-line selection
		return { startCol: normStart.col, endCol: lineLength };
	}

	if (lineIndex === normEnd.line) {
		// Last line of multi-line selection
		return { startCol: 0, endCol: normEnd.col };
	}

	// Middle line - entire line selected
	return { startCol: 0, endCol: lineLength };
}

// ============================================================================
// Highlight matching utilities
// ============================================================================

/** A segment of text with match information */
export interface HighlightSegment {
	text: string;
	isMatch: boolean;
}

/**
 * Calculate highlight segments for a line based on a search query.
 * Splits the line into segments marking which parts match the query (case-insensitive).
 * Returns a single segment with the full line if no query or no matches.
 */
export function calculateHighlightSegments(
	line: string,
	query: string,
): HighlightSegment[] {
	if (!query) {
		return [{ text: line, isMatch: false }];
	}

	const segments: HighlightSegment[] = [];
	const lowerLine = line.toLowerCase();
	const lowerQuery = query.toLowerCase();
	let lastIndex = 0;
	let matchIndex = lowerLine.indexOf(lowerQuery);

	// No matches found
	if (matchIndex === -1) {
		return [{ text: line, isMatch: false }];
	}

	while (matchIndex !== -1) {
		// Add text before match
		if (matchIndex > lastIndex) {
			segments.push({
				text: line.substring(lastIndex, matchIndex),
				isMatch: false,
			});
		}
		// Add highlighted match
		segments.push({
			text: line.substring(matchIndex, matchIndex + query.length),
			isMatch: true,
		});
		lastIndex = matchIndex + query.length;
		matchIndex = lowerLine.indexOf(lowerQuery, lastIndex);
	}

	// Add remaining text
	if (lastIndex < line.length) {
		segments.push({
			text: line.substring(lastIndex),
			isMatch: false,
		});
	}

	return segments;
}
