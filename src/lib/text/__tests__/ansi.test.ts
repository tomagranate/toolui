import { describe, expect, test } from "bun:test";
import type { TextSegment } from "../../../types";
import { getVisibleWidth, parseAnsiLine, wrapSegments } from "../ansi";

describe("ANSI parsing", () => {
	test("parseAnsiLine - plain text", () => {
		const result = parseAnsiLine("Hello, world!");
		expect(result).toHaveLength(1);
		expect(result[0]?.text).toBe("Hello, world!");
		expect(result[0]?.color).toBeUndefined();
	});

	test("parseAnsiLine - with color codes", () => {
		const result = parseAnsiLine("\x1b[31mRed text\x1b[0m");
		expect(result.length).toBeGreaterThan(0);
		expect(result.some((seg) => seg.text.includes("Red text"))).toBe(true);
	});

	test("parseAnsiLine - with bold", () => {
		const result = parseAnsiLine("\x1b[1mBold text\x1b[0m");
		expect(result.length).toBeGreaterThan(0);
		const boldSegment = result.find((seg) => seg.text.includes("Bold text"));
		expect(boldSegment).toBeDefined();
		expect(boldSegment?.attributes).toBeDefined();
	});

	test("parseAnsiLine - multiple colors", () => {
		const result = parseAnsiLine("\x1b[31mRed\x1b[32mGreen\x1b[0m");
		// Should have at least one segment (may combine or separate based on implementation)
		expect(result.length).toBeGreaterThanOrEqual(1);
		// Should contain both "Red" and "Green" text
		const allText = result.map((seg) => seg.text).join("");
		expect(allText).toContain("Red");
		expect(allText).toContain("Green");
	});

	test("parseAnsiLine - empty string", () => {
		const result = parseAnsiLine("");
		expect(result).toHaveLength(0);
	});

	test("parseAnsiLine - only ANSI codes returns raw text as fallback", () => {
		const result = parseAnsiLine("\x1b[31m\x1b[0m");
		// When there are only ANSI codes with no visible text, the function
		// returns the raw input as a fallback segment (no color processing)
		expect(result).toHaveLength(1);
		expect(result[0]?.text).toBe("\x1b[31m\x1b[0m");
		expect(result[0]?.color).toBeUndefined();
	});
});

describe("getVisibleWidth", () => {
	test("getVisibleWidth - plain text", () => {
		expect(getVisibleWidth("hello")).toBe(5);
		expect(getVisibleWidth("world")).toBe(5);
	});

	test("getVisibleWidth - with ANSI codes", () => {
		expect(getVisibleWidth("\x1b[31mhello\x1b[0m")).toBe(5);
		expect(getVisibleWidth("\x1b[1mtest\x1b[0m")).toBe(4);
	});

	test("getVisibleWidth - empty string", () => {
		expect(getVisibleWidth("")).toBe(0);
	});

	test("getVisibleWidth - wide characters", () => {
		// Test with a CJK character (should count as 2)
		expect(getVisibleWidth("中")).toBe(2);
		expect(getVisibleWidth("hello中world")).toBe(12); // 5 + 2 + 5
	});

	test("getVisibleWidth - emoji", () => {
		// Emoji should count as 2
		expect(getVisibleWidth("😀")).toBe(2);
		expect(getVisibleWidth("hello😀world")).toBe(12); // 5 + 2 + 5
	});

	test("getVisibleWidth - mixed content", () => {
		const text = "\x1b[31mHello\x1b[0m 世界";
		const width = getVisibleWidth(text);
		// "Hello" = 5, space = 1, "世" = 2, "界" = 2, total = 10
		expect(width).toBe(10);
	});
});

describe("wrapSegments", () => {
	test("returns empty array for empty input", () => {
		const result = wrapSegments([], 80);
		expect(result).toHaveLength(0);
	});

	test("single segment fits within width - no wrapping", () => {
		const segments: TextSegment[] = [{ text: "Hello" }];
		const result = wrapSegments(segments, 80);
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(1);
		expect(result[0]?.[0]?.text).toBe("Hello");
	});

	test("wraps long text across multiple lines", () => {
		const segments: TextSegment[] = [{ text: "Hello World" }];
		const result = wrapSegments(segments, 6); // Width of 6 should wrap after "Hello "
		expect(result.length).toBeGreaterThanOrEqual(2);
		// All text should be preserved across lines
		const allText = result
			.flat()
			.map((s) => s.text)
			.join("");
		expect(allText).toBe("Hello World");
	});

	test("preserves color attributes when wrapping", () => {
		const segments: TextSegment[] = [
			{ text: "Red text here", color: "red", attributes: 1 },
		];
		const result = wrapSegments(segments, 5);
		// All resulting segments should preserve the color
		for (const line of result) {
			for (const segment of line) {
				expect(segment.color).toBe("red");
				expect(segment.attributes).toBe(1);
			}
		}
	});

	test("handles multiple segments", () => {
		const segments: TextSegment[] = [
			{ text: "Hello ", color: "red" },
			{ text: "World", color: "blue" },
		];
		const result = wrapSegments(segments, 80);
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(2);
		expect(result[0]?.[0]?.color).toBe("red");
		expect(result[0]?.[1]?.color).toBe("blue");
	});

	test("handles wide characters correctly", () => {
		const segments: TextSegment[] = [{ text: "中文" }]; // 4 columns wide
		const result = wrapSegments(segments, 3); // Should wrap after first character
		expect(result.length).toBeGreaterThanOrEqual(2);
	});

	test("handles very narrow width", () => {
		const segments: TextSegment[] = [{ text: "abc" }];
		const result = wrapSegments(segments, 1);
		// Should split into individual characters
		expect(result.length).toBe(3);
	});
});
