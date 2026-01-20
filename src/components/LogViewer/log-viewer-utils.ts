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
