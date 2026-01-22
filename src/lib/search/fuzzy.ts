import fuzzysort from "fuzzysort";

/**
 * Result of a fuzzy match with highlight information
 */
export interface FuzzyMatch {
	/** Original index in the source array */
	index: number;
	/** Match score (higher is better) */
	score: number;
	/** Character indices that matched (for highlighting) */
	highlights: number[];
}

/**
 * Result of fuzzy filtering with highlight information
 */
export interface FuzzyFilterResult<T> {
	/** The matched item */
	item: T;
	/** Character indices that matched in the label (for highlighting) */
	highlights: number[];
}

/**
 * Find matching lines using fuzzy search.
 * Returns matches sorted by relevance with highlight indices.
 */
export function fuzzyFindLines(lines: string[], query: string): FuzzyMatch[] {
	if (!query) return [];

	const prepared = lines.map((line, index) => ({ line, index }));
	const results = fuzzysort.go(query, prepared, {
		key: "line",
		threshold: 0.3, // Require reasonable match quality (0-1 scale)
	});

	// Map results and sort by original line index (preserve log order)
	return results
		.map((r) => ({
			index: r.obj.index,
			score: r.score,
			highlights: r.indexes ? Array.from(r.indexes) : [],
		}))
		.sort((a, b) => a.index - b.index);
}

/**
 * Find matching lines using substring search (case-insensitive).
 * Returns indices of matching lines in their original order.
 */
export function substringFindLines(lines: string[], query: string): number[] {
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

/**
 * Filter items using fuzzy search on their label property.
 * Returns items sorted by relevance with highlight indices.
 */
export function fuzzyFilterByLabel<T extends { label: string }>(
	items: T[],
	query: string,
): FuzzyFilterResult<T>[] {
	if (!query.trim()) {
		return items.map((item) => ({ item, highlights: [] }));
	}

	const results = fuzzysort.go(query, items, {
		key: "label",
		threshold: 0.3, // Require reasonable match quality (0-1 scale)
	});

	return results.map((r) => ({
		item: r.obj,
		highlights: r.indexes ? Array.from(r.indexes) : [],
	}));
}

/**
 * Calculate highlight segments for a line based on matched character indices.
 * Used to render fuzzy match highlights in the UI.
 */
export interface HighlightSegment {
	text: string;
	isMatch: boolean;
}

export function calculateFuzzyHighlightSegments(
	line: string,
	highlights: number[],
): HighlightSegment[] {
	if (highlights.length === 0) {
		return [{ text: line, isMatch: false }];
	}

	// Create a Set for O(1) lookup
	const highlightSet = new Set(highlights);
	const segments: HighlightSegment[] = [];

	let currentText = "";
	let currentIsMatch = highlightSet.has(0);

	for (let i = 0; i < line.length; i++) {
		const isMatch = highlightSet.has(i);

		if (isMatch !== currentIsMatch) {
			// State changed, push current segment
			if (currentText) {
				segments.push({ text: currentText, isMatch: currentIsMatch });
			}
			currentText = line[i] ?? "";
			currentIsMatch = isMatch;
		} else {
			currentText += line[i] ?? "";
		}
	}

	// Push final segment
	if (currentText) {
		segments.push({ text: currentText, isMatch: currentIsMatch });
	}

	return segments;
}
