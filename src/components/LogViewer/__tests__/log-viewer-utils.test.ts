import { describe, expect, test } from "bun:test";
import { findMatchingLines, getLineNumberWidth } from "../log-viewer-utils";

describe("getLineNumberWidth", () => {
	test("returns minimum width of 3 for small line counts", () => {
		expect(getLineNumberWidth(0)).toBe(3);
		expect(getLineNumberWidth(1)).toBe(3);
		expect(getLineNumberWidth(9)).toBe(3);
		expect(getLineNumberWidth(99)).toBe(3);
		expect(getLineNumberWidth(999)).toBe(3);
	});

	test("returns 4 for 1000-9999 lines", () => {
		expect(getLineNumberWidth(1000)).toBe(4);
		expect(getLineNumberWidth(5000)).toBe(4);
		expect(getLineNumberWidth(9999)).toBe(4);
	});

	test("returns 5 for 10000-99999 lines", () => {
		expect(getLineNumberWidth(10000)).toBe(5);
		expect(getLineNumberWidth(50000)).toBe(5);
		expect(getLineNumberWidth(99999)).toBe(5);
	});

	test("returns 6 for 100000+ lines", () => {
		expect(getLineNumberWidth(100000)).toBe(6);
		expect(getLineNumberWidth(999999)).toBe(6);
	});

	test("returns 7 for 1000000+ lines", () => {
		expect(getLineNumberWidth(1000000)).toBe(7);
	});
});

describe("findMatchingLines", () => {
	const sampleLines = [
		"First line of log output",
		"Second line with ERROR message",
		"Third line is normal",
		"Fourth line has error too",
		"Fifth line with WARNING",
		"Sixth line mentions Error again",
	];

	test("returns empty array for empty query", () => {
		expect(findMatchingLines(sampleLines, "")).toEqual([]);
	});

	test("returns empty array for empty lines", () => {
		expect(findMatchingLines([], "error")).toEqual([]);
	});

	test("finds single match", () => {
		expect(findMatchingLines(sampleLines, "WARNING")).toEqual([4]);
	});

	test("finds multiple matches", () => {
		// "error" should match lines 1, 3, 5 (case-insensitive)
		expect(findMatchingLines(sampleLines, "error")).toEqual([1, 3, 5]);
	});

	test("is case-insensitive", () => {
		expect(findMatchingLines(sampleLines, "ERROR")).toEqual([1, 3, 5]);
		expect(findMatchingLines(sampleLines, "Error")).toEqual([1, 3, 5]);
		expect(findMatchingLines(sampleLines, "eRrOr")).toEqual([1, 3, 5]);
	});

	test("finds partial matches", () => {
		expect(findMatchingLines(sampleLines, "line")).toEqual([0, 1, 2, 3, 4, 5]);
	});

	test("returns empty array when no matches found", () => {
		expect(findMatchingLines(sampleLines, "CRITICAL")).toEqual([]);
	});

	test("handles special regex characters as literal text", () => {
		const linesWithSpecialChars = [
			"Error: [object Object]",
			"Warning: price is $100.00",
			"Path: /usr/bin/*",
		];
		expect(findMatchingLines(linesWithSpecialChars, "[object")).toEqual([0]);
		expect(findMatchingLines(linesWithSpecialChars, "$100")).toEqual([1]);
		expect(findMatchingLines(linesWithSpecialChars, "*")).toEqual([2]);
	});

	test("handles empty strings in lines array", () => {
		const linesWithEmpty = ["", "has content", "", "more content"];
		expect(findMatchingLines(linesWithEmpty, "content")).toEqual([1, 3]);
	});

	test("matches at start of line", () => {
		expect(findMatchingLines(sampleLines, "First")).toEqual([0]);
	});

	test("matches at end of line", () => {
		expect(findMatchingLines(sampleLines, "again")).toEqual([5]);
	});

	test("matches entire line", () => {
		expect(findMatchingLines(sampleLines, "Third line is normal")).toEqual([2]);
	});

	test("handles unicode search", () => {
		const unicodeLines = [
			"Normal ASCII text",
			"日本語のテキスト",
			"Mixed: Hello 世界",
		];
		expect(findMatchingLines(unicodeLines, "日本語")).toEqual([1]);
		expect(findMatchingLines(unicodeLines, "世界")).toEqual([2]);
	});

	test("preserves order of matches", () => {
		const lines = ["z match", "a match", "m match"];
		// Should return indices in order they appear, not alphabetically
		expect(findMatchingLines(lines, "match")).toEqual([0, 1, 2]);
	});
});
