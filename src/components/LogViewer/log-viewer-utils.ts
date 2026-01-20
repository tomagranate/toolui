/** Calculate the width needed for line numbers */
export function getLineNumberWidth(totalLines: number): number {
	return Math.max(3, String(totalLines).length);
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
