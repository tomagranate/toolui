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
