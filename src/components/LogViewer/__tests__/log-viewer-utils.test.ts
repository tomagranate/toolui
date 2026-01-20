import { describe, expect, test } from "bun:test";
import {
	calculateContentWidth,
	calculateHighlightSegments,
	calculateScrollInfo,
	findMatchingLines,
	getLineNumberWidth,
	getLineSelection,
	getSelectedText,
	normalizeSelection,
	truncateLine,
} from "../log-viewer-utils";

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

describe("truncateLine", () => {
	test("returns original line when lineWrap is true", () => {
		const longLine = "a".repeat(100);
		expect(truncateLine(longLine, 50, true)).toBe(longLine);
	});

	test("returns original line when line fits within width", () => {
		const line = "short line";
		expect(truncateLine(line, 50, false)).toBe(line);
	});

	test("returns original line when exactly at width", () => {
		const line = "exactly20characters!";
		expect(truncateLine(line, 20, false)).toBe(line);
	});

	test("truncates and adds ellipsis when line exceeds width", () => {
		const line = "this is a very long line that needs truncation";
		const result = truncateLine(line, 20, false);
		expect(result.length).toBe(20);
		expect(result.endsWith("…")).toBe(true);
		expect(result).toBe("this is a very long…");
	});

	test("handles empty string", () => {
		expect(truncateLine("", 50, false)).toBe("");
		expect(truncateLine("", 50, true)).toBe("");
	});

	test("handles single character line", () => {
		expect(truncateLine("x", 50, false)).toBe("x");
		expect(truncateLine("x", 1, false)).toBe("x");
	});

	test("handles width of 1 with longer line", () => {
		// Width 1 means we can fit 0 chars + ellipsis
		const result = truncateLine("hello", 1, false);
		expect(result).toBe("…");
	});

	test("handles width of 2", () => {
		const result = truncateLine("hello", 2, false);
		expect(result).toBe("h…");
	});

	test("preserves unicode characters", () => {
		const line = "Hello 世界 emoji 🎉 test";
		// Note: JS string length counts emoji as 2 chars
		expect(truncateLine(line, 100, false)).toBe(line);
	});

	test("truncates unicode line correctly", () => {
		const line = "Hello 世界!";
		const result = truncateLine(line, 8, false);
		expect(result.length).toBe(8);
		expect(result.endsWith("…")).toBe(true);
	});
});

describe("calculateContentWidth", () => {
	test("calculates width without sidebar or line numbers", () => {
		const result = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 0,
			showLineNumbers: false,
			lineNumberWidth: 3,
		});
		// terminalWidth (100) - logViewerBorder (2) - scrollbarWidth (2) = 96
		expect(result).toBe(96);
	});

	test("accounts for sidebar when present", () => {
		const withoutSidebar = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 0,
			showLineNumbers: false,
			lineNumberWidth: 3,
		});
		const withSidebar = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 22, // Standard sidebar width (20 + 2 border)
			showLineNumbers: false,
			lineNumberWidth: 3,
		});
		// effectiveSidebarWidth = 22 - 3 = 19
		expect(withSidebar).toBe(withoutSidebar - 19);
	});

	test("accounts for line numbers when shown", () => {
		const withoutLineNumbers = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 0,
			showLineNumbers: false,
			lineNumberWidth: 3,
		});
		const withLineNumbers = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 0,
			showLineNumbers: true,
			lineNumberWidth: 3,
		});
		// gutterWidth = lineNumberWidth (3) + 2 = 5
		// contentPadding = 1
		// Total difference = 6
		expect(withLineNumbers).toBe(withoutLineNumbers - 6);
	});

	test("accounts for larger line number width", () => {
		const smallLineNumbers = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 0,
			showLineNumbers: true,
			lineNumberWidth: 3,
		});
		const largeLineNumbers = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 0,
			showLineNumbers: true,
			lineNumberWidth: 6,
		});
		// Difference should be 3 (6 - 3)
		expect(smallLineNumbers - largeLineNumbers).toBe(3);
	});

	test("accounts for both sidebar and line numbers", () => {
		const result = calculateContentWidth({
			terminalWidth: 100,
			sidebarWidth: 22,
			showLineNumbers: true,
			lineNumberWidth: 4,
		});
		// terminalWidth (100) - effectiveSidebarWidth (19) - logViewerBorder (2)
		// - gutterWidth (4+2=6) - contentPadding (1) - scrollbarWidth (2) = 70
		expect(result).toBe(70);
	});

	test("enforces minimum width of 20", () => {
		const result = calculateContentWidth({
			terminalWidth: 30,
			sidebarWidth: 22,
			showLineNumbers: true,
			lineNumberWidth: 5,
		});
		expect(result).toBe(20);
	});

	test("handles very narrow terminal", () => {
		const result = calculateContentWidth({
			terminalWidth: 10,
			sidebarWidth: 0,
			showLineNumbers: false,
			lineNumberWidth: 3,
		});
		expect(result).toBe(20); // Floor of 20
	});

	test("handles zero sidebar width correctly", () => {
		const result = calculateContentWidth({
			terminalWidth: 80,
			sidebarWidth: 0,
			showLineNumbers: false,
			lineNumberWidth: 3,
		});
		// No sidebar adjustment when sidebarWidth is 0
		expect(result).toBe(76); // 80 - 2 - 2
	});
});

describe("calculateScrollInfo", () => {
	test("returns zeros when content fits in viewport", () => {
		const result = calculateScrollInfo({
			scrollTop: 0,
			viewportHeight: 100,
			contentHeight: 50,
			totalLines: 50,
		});
		expect(result).toEqual({ linesAbove: 0, linesBelow: 0 });
	});

	test("returns zeros when content equals viewport", () => {
		const result = calculateScrollInfo({
			scrollTop: 0,
			viewportHeight: 100,
			contentHeight: 100,
			totalLines: 100,
		});
		expect(result).toEqual({ linesAbove: 0, linesBelow: 0 });
	});

	test("shows linesBelow when scrolled to top", () => {
		const result = calculateScrollInfo({
			scrollTop: 0,
			viewportHeight: 50,
			contentHeight: 200,
			totalLines: 200,
		});
		expect(result.linesAbove).toBe(0);
		expect(result.linesBelow).toBeGreaterThan(0);
	});

	test("shows linesAbove when scrolled to bottom", () => {
		const result = calculateScrollInfo({
			scrollTop: 150, // maxScroll = 200 - 50 = 150
			viewportHeight: 50,
			contentHeight: 200,
			totalLines: 200,
		});
		expect(result.linesAbove).toBeGreaterThan(0);
		expect(result.linesBelow).toBe(0);
	});

	test("shows both when scrolled to middle", () => {
		const result = calculateScrollInfo({
			scrollTop: 75, // 50% of maxScroll (150)
			viewportHeight: 50,
			contentHeight: 200,
			totalLines: 200,
		});
		expect(result.linesAbove).toBeGreaterThan(0);
		expect(result.linesBelow).toBeGreaterThan(0);
	});

	test("handles wrapped lines via scroll ratio", () => {
		// When lines are wrapped, contentHeight > totalLines
		// 100 lines but each wraps to 2 rows = contentHeight of 200
		const result = calculateScrollInfo({
			scrollTop: 100, // 50% of maxScroll
			viewportHeight: 50,
			contentHeight: 200, // Wrapped content is taller
			totalLines: 100, // But only 100 logical lines
		});
		// Should distribute lines based on scroll ratio, not raw heights
		expect(result.linesAbove).toBeGreaterThan(0);
		expect(result.linesBelow).toBeGreaterThan(0);
		// Sum should equal scrollableLines (totalLines - visibleLines)
		const scrollableLines = 100 - 50;
		expect(result.linesAbove + result.linesBelow).toBe(scrollableLines);
	});

	test("linesAbove and linesBelow sum to scrollable lines", () => {
		const viewportHeight = 30;
		const totalLines = 100;
		const result = calculateScrollInfo({
			scrollTop: 50,
			viewportHeight,
			contentHeight: 200,
			totalLines,
		});
		const scrollableLines = totalLines - viewportHeight;
		expect(result.linesAbove + result.linesBelow).toBe(scrollableLines);
	});

	test("handles edge case of 0 maxScroll", () => {
		// When scrollTop is 0 and content equals viewport
		const result = calculateScrollInfo({
			scrollTop: 0,
			viewportHeight: 100,
			contentHeight: 100,
			totalLines: 100,
		});
		expect(result).toEqual({ linesAbove: 0, linesBelow: 0 });
	});

	test("handles small number of lines", () => {
		const result = calculateScrollInfo({
			scrollTop: 5,
			viewportHeight: 10,
			contentHeight: 20,
			totalLines: 20,
		});
		expect(result.linesAbove).toBeGreaterThanOrEqual(0);
		expect(result.linesBelow).toBeGreaterThanOrEqual(0);
	});

	test("handles totalLines less than viewportHeight", () => {
		// When we have fewer lines than viewport can display
		const result = calculateScrollInfo({
			scrollTop: 0,
			viewportHeight: 50,
			contentHeight: 100, // Content still taller due to wrapped lines
			totalLines: 30, // But only 30 logical lines
		});
		// estimatedVisibleLines = min(50, 30) = 30
		// scrollableLines = max(0, 30 - 30) = 0
		expect(result).toEqual({ linesAbove: 0, linesBelow: 0 });
	});
});

describe("normalizeSelection", () => {
	test("returns null when start is null", () => {
		expect(normalizeSelection(null, { line: 0, col: 5 })).toBeNull();
	});

	test("returns null when end is null", () => {
		expect(normalizeSelection({ line: 0, col: 0 }, null)).toBeNull();
	});

	test("returns null when both are null", () => {
		expect(normalizeSelection(null, null)).toBeNull();
	});

	test("returns unchanged when start is before end (same line)", () => {
		const start = { line: 0, col: 5 };
		const end = { line: 0, col: 10 };
		const result = normalizeSelection(start, end);
		expect(result).toEqual({ start, end });
	});

	test("returns unchanged when start is before end (different lines)", () => {
		const start = { line: 0, col: 5 };
		const end = { line: 2, col: 10 };
		const result = normalizeSelection(start, end);
		expect(result).toEqual({ start, end });
	});

	test("swaps when end is before start (same line)", () => {
		const start = { line: 0, col: 10 };
		const end = { line: 0, col: 5 };
		const result = normalizeSelection(start, end);
		expect(result).toEqual({ start: end, end: start });
	});

	test("swaps when end is before start (different lines)", () => {
		const start = { line: 5, col: 10 };
		const end = { line: 2, col: 5 };
		const result = normalizeSelection(start, end);
		expect(result).toEqual({ start: end, end: start });
	});

	test("handles same position (start equals end)", () => {
		const pos = { line: 0, col: 5 };
		const result = normalizeSelection(pos, pos);
		expect(result).toEqual({ start: pos, end: pos });
	});

	test("handles zero positions", () => {
		const start = { line: 0, col: 0 };
		const end = { line: 0, col: 0 };
		const result = normalizeSelection(start, end);
		expect(result).toEqual({ start, end });
	});
});

describe("getSelectedText", () => {
	const sampleLines = [
		"First line of text",
		"Second line here",
		"Third line content",
		"Fourth line data",
	];

	test("returns empty string when start is null", () => {
		expect(getSelectedText(null, { line: 0, col: 5 }, sampleLines)).toBe("");
	});

	test("returns empty string when end is null", () => {
		expect(getSelectedText({ line: 0, col: 0 }, null, sampleLines)).toBe("");
	});

	test("extracts single line selection", () => {
		const start = { line: 0, col: 6 };
		const end = { line: 0, col: 10 };
		expect(getSelectedText(start, end, sampleLines)).toBe("line");
	});

	test("extracts single line selection (backwards)", () => {
		const start = { line: 0, col: 10 };
		const end = { line: 0, col: 6 };
		expect(getSelectedText(start, end, sampleLines)).toBe("line");
	});

	test("extracts multi-line selection", () => {
		const start = { line: 0, col: 6 };
		const end = { line: 1, col: 6 };
		expect(getSelectedText(start, end, sampleLines)).toBe(
			"line of text\nSecond",
		);
	});

	test("extracts multi-line selection (three lines)", () => {
		const start = { line: 0, col: 6 };
		const end = { line: 2, col: 5 };
		expect(getSelectedText(start, end, sampleLines)).toBe(
			"line of text\nSecond line here\nThird",
		);
	});

	test("extracts multi-line selection (backwards)", () => {
		const start = { line: 2, col: 5 };
		const end = { line: 0, col: 6 };
		expect(getSelectedText(start, end, sampleLines)).toBe(
			"line of text\nSecond line here\nThird",
		);
	});

	test("handles selection at start of line", () => {
		const start = { line: 1, col: 0 };
		const end = { line: 1, col: 6 };
		expect(getSelectedText(start, end, sampleLines)).toBe("Second");
	});

	test("handles selection at end of line", () => {
		const start = { line: 0, col: 12 };
		const end = { line: 0, col: 18 };
		expect(getSelectedText(start, end, sampleLines)).toBe("f text");
	});

	test("handles entire line selection", () => {
		const start = { line: 1, col: 0 };
		const end = { line: 1, col: 16 };
		expect(getSelectedText(start, end, sampleLines)).toBe("Second line here");
	});

	test("handles empty selection (same position)", () => {
		const pos = { line: 0, col: 5 };
		expect(getSelectedText(pos, pos, sampleLines)).toBe("");
	});

	test("handles out of bounds line gracefully", () => {
		const start = { line: 10, col: 0 };
		const end = { line: 10, col: 5 };
		expect(getSelectedText(start, end, sampleLines)).toBe("");
	});

	test("handles empty lines array", () => {
		const start = { line: 0, col: 0 };
		const end = { line: 0, col: 5 };
		expect(getSelectedText(start, end, [])).toBe("");
	});
});

describe("getLineSelection", () => {
	test("returns null when start is null", () => {
		expect(getLineSelection(0, 10, null, { line: 0, col: 5 })).toBeNull();
	});

	test("returns null when end is null", () => {
		expect(getLineSelection(0, 10, { line: 0, col: 0 }, null)).toBeNull();
	});

	test("returns null when line is before selection", () => {
		const start = { line: 2, col: 0 };
		const end = { line: 3, col: 10 };
		expect(getLineSelection(0, 20, start, end)).toBeNull();
	});

	test("returns null when line is after selection", () => {
		const start = { line: 0, col: 0 };
		const end = { line: 1, col: 10 };
		expect(getLineSelection(5, 20, start, end)).toBeNull();
	});

	test("returns range for single line selection", () => {
		const start = { line: 2, col: 5 };
		const end = { line: 2, col: 15 };
		expect(getLineSelection(2, 20, start, end)).toEqual({
			startCol: 5,
			endCol: 15,
		});
	});

	test("returns range for first line of multi-line selection", () => {
		const start = { line: 1, col: 10 };
		const end = { line: 3, col: 5 };
		expect(getLineSelection(1, 20, start, end)).toEqual({
			startCol: 10,
			endCol: 20,
		});
	});

	test("returns range for last line of multi-line selection", () => {
		const start = { line: 1, col: 10 };
		const end = { line: 3, col: 5 };
		expect(getLineSelection(3, 20, start, end)).toEqual({
			startCol: 0,
			endCol: 5,
		});
	});

	test("returns range for middle line of multi-line selection", () => {
		const start = { line: 1, col: 10 };
		const end = { line: 3, col: 5 };
		expect(getLineSelection(2, 25, start, end)).toEqual({
			startCol: 0,
			endCol: 25,
		});
	});

	test("handles backwards selection (normalizes automatically)", () => {
		const start = { line: 3, col: 5 };
		const end = { line: 1, col: 10 };
		// Should normalize and treat line 2 as middle
		expect(getLineSelection(2, 25, start, end)).toEqual({
			startCol: 0,
			endCol: 25,
		});
	});

	test("handles single line selection with same start and end", () => {
		const pos = { line: 2, col: 10 };
		expect(getLineSelection(2, 20, pos, pos)).toEqual({
			startCol: 10,
			endCol: 10,
		});
	});

	test("handles line at boundary of selection", () => {
		const start = { line: 0, col: 0 };
		const end = { line: 2, col: 15 };
		// Line 0 is start
		expect(getLineSelection(0, 30, start, end)).toEqual({
			startCol: 0,
			endCol: 30,
		});
		// Line 2 is end
		expect(getLineSelection(2, 30, start, end)).toEqual({
			startCol: 0,
			endCol: 15,
		});
	});
});

describe("calculateHighlightSegments", () => {
	test("returns single segment with full line when no query", () => {
		const line = "Hello world";
		expect(calculateHighlightSegments(line, "")).toEqual([
			{ text: "Hello world", isMatch: false },
		]);
	});

	test("returns single segment when no matches found", () => {
		const line = "Hello world";
		expect(calculateHighlightSegments(line, "xyz")).toEqual([
			{ text: "Hello world", isMatch: false },
		]);
	});

	test("highlights single match in middle", () => {
		const line = "Hello world test";
		expect(calculateHighlightSegments(line, "world")).toEqual([
			{ text: "Hello ", isMatch: false },
			{ text: "world", isMatch: true },
			{ text: " test", isMatch: false },
		]);
	});

	test("highlights match at start of line", () => {
		const line = "Hello world";
		expect(calculateHighlightSegments(line, "Hello")).toEqual([
			{ text: "Hello", isMatch: true },
			{ text: " world", isMatch: false },
		]);
	});

	test("highlights match at end of line", () => {
		const line = "Hello world";
		expect(calculateHighlightSegments(line, "world")).toEqual([
			{ text: "Hello ", isMatch: false },
			{ text: "world", isMatch: true },
		]);
	});

	test("highlights entire line when query matches full line", () => {
		const line = "test";
		expect(calculateHighlightSegments(line, "test")).toEqual([
			{ text: "test", isMatch: true },
		]);
	});

	test("highlights multiple matches", () => {
		const line = "error: something error again error";
		expect(calculateHighlightSegments(line, "error")).toEqual([
			{ text: "error", isMatch: true },
			{ text: ": something ", isMatch: false },
			{ text: "error", isMatch: true },
			{ text: " again ", isMatch: false },
			{ text: "error", isMatch: true },
		]);
	});

	test("is case-insensitive", () => {
		const line = "Hello HELLO hello HeLLo";
		expect(calculateHighlightSegments(line, "hello")).toEqual([
			{ text: "Hello", isMatch: true },
			{ text: " ", isMatch: false },
			{ text: "HELLO", isMatch: true },
			{ text: " ", isMatch: false },
			{ text: "hello", isMatch: true },
			{ text: " ", isMatch: false },
			{ text: "HeLLo", isMatch: true },
		]);
	});

	test("handles adjacent matches", () => {
		const line = "aaaaaa";
		expect(calculateHighlightSegments(line, "aa")).toEqual([
			{ text: "aa", isMatch: true },
			{ text: "aa", isMatch: true },
			{ text: "aa", isMatch: true },
		]);
	});

	test("handles empty line", () => {
		expect(calculateHighlightSegments("", "test")).toEqual([
			{ text: "", isMatch: false },
		]);
	});

	test("handles single character query", () => {
		const line = "a b a c a";
		expect(calculateHighlightSegments(line, "a")).toEqual([
			{ text: "a", isMatch: true },
			{ text: " b ", isMatch: false },
			{ text: "a", isMatch: true },
			{ text: " c ", isMatch: false },
			{ text: "a", isMatch: true },
		]);
	});

	test("handles special characters in query", () => {
		const line = "Error: [object Object]";
		expect(calculateHighlightSegments(line, "[object")).toEqual([
			{ text: "Error: ", isMatch: false },
			{ text: "[object", isMatch: true },
			{ text: " Object]", isMatch: false },
		]);
	});

	test("handles unicode characters", () => {
		const line = "Hello 世界 world 世界";
		expect(calculateHighlightSegments(line, "世界")).toEqual([
			{ text: "Hello ", isMatch: false },
			{ text: "世界", isMatch: true },
			{ text: " world ", isMatch: false },
			{ text: "世界", isMatch: true },
		]);
	});

	test("preserves original case in output", () => {
		const line = "ERROR warning Error WARNING";
		const result = calculateHighlightSegments(line, "error");
		// The matched text should preserve original casing
		expect(result[0]).toEqual({ text: "ERROR", isMatch: true });
		expect(result[2]).toEqual({ text: "Error", isMatch: true });
	});
});

describe("calculateWordWrapPoints", () => {
	const { calculateWordWrapPoints } = require("../log-viewer-utils");

	test("returns [0] for empty text", () => {
		expect(calculateWordWrapPoints("", 80)).toEqual([0]);
	});

	test("returns [0] for text shorter than wrap width", () => {
		expect(calculateWordWrapPoints("hello world", 80)).toEqual([0]);
	});

	test("returns [0] for text exactly at wrap width", () => {
		expect(calculateWordWrapPoints("a".repeat(80), 80)).toEqual([0]);
	});

	test("wraps at word boundary", () => {
		// "hello world foo" with width 12 should wrap after "hello world "
		const text = "hello world foo bar";
		const result = calculateWordWrapPoints(text, 12);
		expect(result[0]).toBe(0);
		expect(result[1]).toBe(12); // "hello world " is 12 chars, next row starts at 12
	});

	test("forces wrap mid-word when word exceeds width", () => {
		const text = "superlongwordthatexceedswidth short";
		const result = calculateWordWrapPoints(text, 10);
		expect(result[0]).toBe(0);
		expect(result[1]).toBe(10); // Forced wrap at width
	});

	test("handles multiple wraps", () => {
		const text = "one two three four five six seven eight";
		const result = calculateWordWrapPoints(text, 10);
		expect(result.length).toBeGreaterThan(2);
		expect(result[0]).toBe(0);
	});

	test("handles wrap width of 0", () => {
		expect(calculateWordWrapPoints("hello", 0)).toEqual([0]);
	});
});

describe("visualPositionToColumn", () => {
	const { visualPositionToColumn } = require("../log-viewer-utils");

	test("returns localX for non-wrapped text on row 0", () => {
		const text = "hello world";
		expect(visualPositionToColumn(0, 5, text, 80)).toBe(5);
	});

	test("returns correct column for second visual row", () => {
		// "hello world foo bar" with width 12
		// Row 0: "hello world " (chars 0-11)
		// Row 1: "foo bar" (chars 12-18)
		const text = "hello world foo bar";
		// Clicking at localX=3 on row 1 should give column 15 (12 + 3)
		expect(visualPositionToColumn(1, 3, text, 12)).toBe(15);
	});

	test("clamps to text length", () => {
		const text = "short";
		expect(visualPositionToColumn(0, 100, text, 80)).toBe(5);
	});

	test("handles out-of-bounds visual row gracefully", () => {
		const text = "hello world";
		// Row 5 doesn't exist, should use last known row start
		const result = visualPositionToColumn(5, 3, text, 80);
		expect(result).toBeLessThanOrEqual(text.length);
	});

	test("returns 0 for negative localX", () => {
		const text = "hello";
		expect(visualPositionToColumn(0, -5, text, 80)).toBe(0);
	});
});
