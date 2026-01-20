import { describe, expect, test } from "bun:test";
import type { ToolState } from "../../../types";
import {
	BORDER_WIDTH,
	calculateMinOffsetForTab,
	calculateTabExtraPadding,
	calculateVisibleTabs,
	canFitAllTabs,
	getTabWidth,
	INDICATOR_WIDTH,
	MAX_TAB_NAME_LENGTH,
	TAB_NUMBER_WIDTH,
	TAB_PADDING,
	truncateName,
} from "../tab-utils";

// Helper to create mock ToolState objects
function createMockTool(name: string): ToolState {
	return {
		config: { name, command: "echo" },
		process: null,
		logs: [],
		status: "stopped",
		exitCode: null,
	};
}

describe("truncateName", () => {
	test("returns name unchanged if within default limit", () => {
		const shortName = "short";
		expect(truncateName(shortName)).toBe("short");
	});

	test("returns name unchanged if exactly at limit", () => {
		const exactName = "a".repeat(MAX_TAB_NAME_LENGTH);
		expect(truncateName(exactName)).toBe(exactName);
	});

	test("truncates and adds ellipsis if over default limit", () => {
		const longName = "a".repeat(MAX_TAB_NAME_LENGTH + 5);
		const result = truncateName(longName);
		expect(result.length).toBe(MAX_TAB_NAME_LENGTH);
		expect(result.endsWith("…")).toBe(true);
		expect(result).toBe(`${"a".repeat(MAX_TAB_NAME_LENGTH - 1)}…`);
	});

	test("respects custom maxLength parameter", () => {
		const name = "hello world";
		expect(truncateName(name, 5)).toBe("hell…");
		expect(truncateName(name, 6)).toBe("hello…");
	});

	test("handles empty string", () => {
		expect(truncateName("")).toBe("");
	});

	test("handles single character", () => {
		expect(truncateName("x")).toBe("x");
	});

	test("handles maxLength of 1", () => {
		expect(truncateName("hello", 1)).toBe("…");
	});
});

describe("getTabWidth", () => {
	test("calculates width without tab numbers", () => {
		const name = "test"; // 4 chars
		// Width = STATUS_ICON_WIDTH (2) + name.length (4) + TAB_PADDING (4) = 10
		const width = getTabWidth(name, 0, false);
		expect(width).toBe(2 + 4 + TAB_PADDING);
	});

	test("adds extra width for tabs 1-9 when showTabNumbers is true", () => {
		const name = "test";
		const withoutNumbers = getTabWidth(name, 0, false);
		const withNumbers = getTabWidth(name, 0, true);
		expect(withNumbers - withoutNumbers).toBe(TAB_NUMBER_WIDTH);
	});

	test("does not add number width for tab index >= 9", () => {
		const name = "test";
		const index9 = getTabWidth(name, 9, true);
		const index8 = getTabWidth(name, 8, true);
		expect(index9).toBe(index8 - TAB_NUMBER_WIDTH);
	});

	test("truncates long names in width calculation", () => {
		const shortName = "short";
		const longName = "a".repeat(MAX_TAB_NAME_LENGTH + 10);
		const shortWidth = getTabWidth(shortName, 0, false);
		const longWidth = getTabWidth(longName, 0, false);
		// Long name should be truncated to MAX_TAB_NAME_LENGTH
		expect(longWidth - shortWidth).toBe(MAX_TAB_NAME_LENGTH - shortName.length);
	});
});

describe("canFitAllTabs", () => {
	test("returns true when all tabs fit", () => {
		const tools = [createMockTool("a"), createMockTool("b")];
		// Each tab: 2 (icon) + 1 (name) + 4 (padding) = 7
		// Total: 14 + 2 (border) = 16
		expect(canFitAllTabs(tools, 20, false)).toBe(true);
	});

	test("returns false when tabs exceed available width", () => {
		const tools = [
			createMockTool("longname1"),
			createMockTool("longname2"),
			createMockTool("longname3"),
		];
		expect(canFitAllTabs(tools, 30, false)).toBe(false);
	});

	test("accounts for border width", () => {
		const tools = [createMockTool("test")];
		// Tab width: 2 + 4 + 4 = 10
		// With border: 10 + 2 = 12
		expect(canFitAllTabs(tools, 12, false)).toBe(true);
		expect(canFitAllTabs(tools, 11, false)).toBe(false);
	});

	test("returns true for empty tools array", () => {
		expect(canFitAllTabs([], 10, false)).toBe(true);
	});

	test("accounts for tab numbers when enabled", () => {
		const tools = [createMockTool("test")];
		// Without numbers: 2 + 4 + 4 + 2 = 12
		// With numbers: 2 + 4 + 4 + 2 + 2 = 14
		expect(canFitAllTabs(tools, 12, false)).toBe(true);
		expect(canFitAllTabs(tools, 12, true)).toBe(false);
		expect(canFitAllTabs(tools, 14, true)).toBe(true);
	});
});

describe("calculateVisibleTabs", () => {
	test("returns all indices when all tabs fit without scrolling", () => {
		const tools = [createMockTool("a"), createMockTool("b")];
		const result = calculateVisibleTabs(tools, 100, 0, false, false);
		expect(result.visibleIndices).toEqual([0, 1]);
		expect(result.lastVisibleIndex).toBe(1);
	});

	test("respects scrollOffset", () => {
		const tools = [
			createMockTool("a"),
			createMockTool("b"),
			createMockTool("c"),
		];
		const result = calculateVisibleTabs(tools, 100, 1, false, false);
		expect(result.visibleIndices).toEqual([1, 2]);
		expect(result.lastVisibleIndex).toBe(2);
	});

	test("stops adding tabs when width exceeded", () => {
		const tools = [
			createMockTool("longname1"),
			createMockTool("longname2"),
			createMockTool("longname3"),
		];
		// Each tab ~17 chars wide, so only 2 should fit in width 40
		const result = calculateVisibleTabs(tools, 40, 0, false, false);
		expect(result.visibleIndices.length).toBeLessThan(3);
	});

	test("reserves space for indicators when scrolling needed", () => {
		const tools = [createMockTool("test1"), createMockTool("test2")];
		const withoutScrolling = calculateVisibleTabs(tools, 50, 0, false, false);
		const withScrolling = calculateVisibleTabs(tools, 50, 0, true, false);
		// With scrolling, less space is available (minus 2 * INDICATOR_WIDTH)
		expect(withScrolling.visibleIndices.length).toBeLessThanOrEqual(
			withoutScrolling.visibleIndices.length,
		);
	});

	test("handles empty tools array", () => {
		const result = calculateVisibleTabs([], 100, 0, false, false);
		expect(result.visibleIndices).toEqual([]);
		expect(result.lastVisibleIndex).toBe(0);
	});

	test("handles scrollOffset beyond tools length", () => {
		const tools = [createMockTool("a")];
		const result = calculateVisibleTabs(tools, 100, 5, false, false);
		expect(result.visibleIndices).toEqual([]);
	});
});

describe("calculateTabExtraPadding", () => {
	test("returns empty array for no visible tabs", () => {
		const tools = [createMockTool("a")];
		const result = calculateTabExtraPadding(tools, [], 100, false, false);
		expect(result).toEqual([]);
	});

	test("distributes padding evenly for equal-length tabs", () => {
		const tools = [
			createMockTool("aaa"),
			createMockTool("bbb"),
			createMockTool("ccc"),
		];
		const visibleIndices = [0, 1, 2];
		const result = calculateTabExtraPadding(
			tools,
			visibleIndices,
			100,
			false,
			false,
		);
		// All tabs have same base width, so they should all get similar extra padding
		const differences = result.map((p, i) =>
			i > 0 ? Math.abs(p - (result[i - 1] ?? 0)) : 0,
		);
		// Differences should be at most 1 (due to integer distribution)
		expect(differences.every((d) => d <= 1)).toBe(true);
	});

	test("gives more padding to shorter tabs", () => {
		const tools = [
			createMockTool("a"), // Very short
			createMockTool("longername"), // Longer
		];
		const visibleIndices = [0, 1];
		// Give enough width that both fit but shorter one needs more padding
		const result = calculateTabExtraPadding(
			tools,
			visibleIndices,
			60,
			false,
			false,
		);
		// Shorter tab should get more extra padding
		expect(result[0]).toBeGreaterThan(result[1] ?? 0);
	});

	test("handles tabs that need more than equal share", () => {
		const tools = [
			createMockTool("x"),
			createMockTool("verylongtabname"), // Will need more space
		];
		const visibleIndices = [0, 1];
		const result = calculateTabExtraPadding(
			tools,
			visibleIndices,
			50,
			false,
			false,
		);
		// Should not crash and should return valid padding values
		expect(result.length).toBe(2);
		expect(result.every((p) => p >= 0)).toBe(true);
	});

	test("accounts for scrolling indicators", () => {
		const tools = [createMockTool("test")];
		const visibleIndices = [0];
		const withoutScrolling = calculateTabExtraPadding(
			tools,
			visibleIndices,
			50,
			false,
			false,
		);
		const withScrolling = calculateTabExtraPadding(
			tools,
			visibleIndices,
			50,
			true,
			false,
		);
		// Less space with scrolling means less extra padding
		expect(withScrolling[0]).toBeLessThan(withoutScrolling[0] ?? 0);
	});
});

describe("calculateMinOffsetForTab", () => {
	test("returns 0 when target tab fits from start", () => {
		const tools = [createMockTool("a"), createMockTool("b")];
		const result = calculateMinOffsetForTab(tools, 1, 100, false);
		expect(result).toBe(0);
	});

	test("calculates minimum offset to show target tab", () => {
		const tools = [
			createMockTool("longname1"),
			createMockTool("longname2"),
			createMockTool("longname3"),
			createMockTool("longname4"),
		];
		// With narrow width, need to scroll to see later tabs
		const result = calculateMinOffsetForTab(tools, 3, 50, false);
		// Offset should be > 0 to show tab 3
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThanOrEqual(3);
	});

	test("accounts for indicator space", () => {
		const tools = [
			createMockTool("name1"),
			createMockTool("name2"),
			createMockTool("name3"),
		];
		// The function reserves space for BORDER_WIDTH + INDICATOR_WIDTH * 2
		// This affects how many tabs fit from a given offset
		const reservedSpace = BORDER_WIDTH + INDICATOR_WIDTH * 2;
		const tabWidth = getTabWidth("name1", 0, false);

		// Width that can fit exactly 2 tabs plus reserved space
		const tightWidth = reservedSpace + tabWidth * 2;
		const result = calculateMinOffsetForTab(tools, 2, tightWidth, false);
		// Should need offset of 1 to show tab 2
		expect(result).toBe(1);
	});

	test("handles single tab", () => {
		const tools = [createMockTool("test")];
		const result = calculateMinOffsetForTab(tools, 0, 100, false);
		expect(result).toBe(0);
	});

	test("handles empty tools array gracefully", () => {
		const result = calculateMinOffsetForTab([], 0, 100, false);
		expect(result).toBe(0);
	});
});
