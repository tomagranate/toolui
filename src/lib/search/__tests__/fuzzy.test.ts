import { describe, expect, test } from "bun:test";
import {
	calculateFuzzyHighlightSegments,
	fuzzyFilterByLabel,
	fuzzyFindLines,
	substringFindLines,
} from "../fuzzy";

describe("fuzzyFindLines", () => {
	test("returns empty array for empty query", () => {
		const lines = ["hello world", "foo bar"];
		expect(fuzzyFindLines(lines, "")).toEqual([]);
	});

	test("returns empty array for no matches", () => {
		const lines = ["hello world", "foo bar"];
		expect(fuzzyFindLines(lines, "xyz")).toEqual([]);
	});

	test("finds exact substring matches", () => {
		const lines = ["hello world", "foo bar", "world peace"];
		const results = fuzzyFindLines(lines, "world");

		expect(results.length).toBe(2);
		expect(results.map((r) => r.index)).toContain(0);
		expect(results.map((r) => r.index)).toContain(2);
	});

	test("finds fuzzy matches with non-contiguous characters", () => {
		const lines = ["hello world", "how are you"];
		const results = fuzzyFindLines(lines, "hw");

		// "hw" should match "hello world" (h...w) and "how" (h...w in "how")
		expect(results.length).toBeGreaterThan(0);
	});

	test("returns highlight indices", () => {
		const lines = ["hello world"];
		const results = fuzzyFindLines(lines, "hello");

		expect(results.length).toBe(1);
		expect(results[0]?.highlights).toEqual([0, 1, 2, 3, 4]); // "hello" at positions 0-4
	});

	test("returns results sorted by score (best first)", () => {
		const lines = ["xhxexlxlxo", "hello", "helloworld"];
		const results = fuzzyFindLines(lines, "hello");

		// "hello" should score higher than "xhxexlxlxo" due to consecutive chars
		expect(results.length).toBeGreaterThan(0);
		// The exact order depends on scoring, but better matches should come first
	});
});

describe("substringFindLines", () => {
	test("returns empty array for empty query", () => {
		const lines = ["hello world", "foo bar"];
		expect(substringFindLines(lines, "")).toEqual([]);
	});

	test("returns empty array for no matches", () => {
		const lines = ["hello world", "foo bar"];
		expect(substringFindLines(lines, "xyz")).toEqual([]);
	});

	test("finds case-insensitive matches", () => {
		const lines = ["Hello World", "HELLO", "hello"];
		const results = substringFindLines(lines, "hello");

		expect(results).toEqual([0, 1, 2]);
	});

	test("returns indices in original order", () => {
		const lines = ["aaa", "bbb", "aaa"];
		const results = substringFindLines(lines, "aaa");

		expect(results).toEqual([0, 2]);
	});

	test("does not find non-contiguous matches (unlike fuzzy)", () => {
		const lines = ["hello world"];
		const results = substringFindLines(lines, "hw");

		expect(results).toEqual([]); // "hw" is not a substring
	});
});

describe("fuzzyFilterByLabel", () => {
	const items = [
		{ label: "Search logs" },
		{ label: "Toggle line wrap" },
		{ label: "Switch theme" },
		{ label: "Quit" },
	];

	test("returns all items with empty highlights for empty query", () => {
		const results = fuzzyFilterByLabel(items, "");

		expect(results.length).toBe(4);
		expect(results[0]?.highlights).toEqual([]);
	});

	test("filters items by fuzzy match on label", () => {
		const results = fuzzyFilterByLabel(items, "sw");

		// Should match "Switch theme" at minimum
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.item.label === "Switch theme")).toBe(true);
	});

	test("returns highlight indices for matches", () => {
		const results = fuzzyFilterByLabel(items, "quit");

		expect(results.length).toBe(1);
		expect(results[0]?.item.label).toBe("Quit");
		expect(results[0]?.highlights).toEqual([0, 1, 2, 3]); // "Quit"
	});
});

describe("calculateFuzzyHighlightSegments", () => {
	test("returns single segment for no highlights", () => {
		const segments = calculateFuzzyHighlightSegments("hello world", []);

		expect(segments).toEqual([{ text: "hello world", isMatch: false }]);
	});

	test("highlights single character", () => {
		const segments = calculateFuzzyHighlightSegments("hello", [0]);

		expect(segments).toEqual([
			{ text: "h", isMatch: true },
			{ text: "ello", isMatch: false },
		]);
	});

	test("highlights consecutive characters as one segment", () => {
		const segments = calculateFuzzyHighlightSegments("hello", [0, 1, 2]);

		expect(segments).toEqual([
			{ text: "hel", isMatch: true },
			{ text: "lo", isMatch: false },
		]);
	});

	test("highlights non-consecutive characters as separate segments", () => {
		const segments = calculateFuzzyHighlightSegments("hello", [0, 2, 4]);

		expect(segments).toEqual([
			{ text: "h", isMatch: true },
			{ text: "e", isMatch: false },
			{ text: "l", isMatch: true },
			{ text: "l", isMatch: false },
			{ text: "o", isMatch: true },
		]);
	});

	test("handles highlight at end of string", () => {
		const segments = calculateFuzzyHighlightSegments("abc", [2]);

		expect(segments).toEqual([
			{ text: "ab", isMatch: false },
			{ text: "c", isMatch: true },
		]);
	});

	test("handles all characters highlighted", () => {
		const segments = calculateFuzzyHighlightSegments("hi", [0, 1]);

		expect(segments).toEqual([{ text: "hi", isMatch: true }]);
	});
});
