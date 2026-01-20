import { describe, expect, test } from "bun:test";
import {
	calculateContentWidth,
	calculateHighlightSegments,
	calculateScrollInfo,
	findMatchingLines,
	getLineNumberWidth,
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
