import { describe, expect, test } from "bun:test";
import { getTheme, mapAnsiColor, themes } from "../themes";

describe("getTheme", () => {
	test("returns default theme when called without argument", () => {
		const theme = getTheme();
		expect(theme.name).toBe("Default");
		expect(theme.colors.background).toBe("black");
		expect(theme.colors.text).toBe("white");
		expect(theme.colors.statusRunning).toBe("green");
		expect(theme.colors.statusError).toBe("red");
	});

	test("returns default theme when called with 'default'", () => {
		const theme = getTheme("default");
		expect(theme.name).toBe("Default");
		expect(theme.colors.background).toBe("black");
	});

	test("returns correct theme when called with valid theme name", () => {
		const dracula = getTheme("dracula");
		expect(dracula.name).toBe("Dracula");
		expect(dracula.colors.background).toBe("#282a36");

		const nord = getTheme("nord");
		expect(nord.name).toBe("Nord");
		expect(nord.colors.background).toBe("#2e3440");
	});

	test("falls back to default theme for invalid theme name", () => {
		const theme = getTheme("invalid-theme-name");
		expect(theme.name).toBe("Default");
		expect(theme.colors.background).toBe("black");
	});

	test("all themes have all required color properties", () => {
		const themeNames = Object.keys(themes);
		expect(themeNames.length).toBeGreaterThanOrEqual(7);

		for (const themeName of themeNames) {
			const theme = getTheme(themeName);
			// Verify all required properties exist and are non-empty strings
			expect(typeof theme.name).toBe("string");
			expect(theme.name.length).toBeGreaterThan(0);
			expect(typeof theme.colors.background).toBe("string");
			expect(typeof theme.colors.text).toBe("string");
			expect(typeof theme.colors.activeTabBackground).toBe("string");
			expect(typeof theme.colors.activeTabText).toBe("string");
			expect(typeof theme.colors.inactiveTabText).toBe("string");
			expect(typeof theme.colors.statusRunning).toBe("string");
			expect(typeof theme.colors.statusShuttingDown).toBe("string");
			expect(typeof theme.colors.statusError).toBe("string");
			expect(typeof theme.colors.statusStopped).toBe("string");
			expect(typeof theme.colors.warningBackground).toBe("string");
			expect(typeof theme.colors.warningText).toBe("string");
		}
	});
});

describe("mapAnsiColor", () => {
	test("maps standard foreground colors (30-37)", () => {
		expect(mapAnsiColor(30, false)).toBe("black");
		expect(mapAnsiColor(31, false)).toBe("red");
		expect(mapAnsiColor(32, false)).toBe("green");
		expect(mapAnsiColor(33, false)).toBe("yellow");
		expect(mapAnsiColor(34, false)).toBe("blue");
		expect(mapAnsiColor(35, false)).toBe("magenta");
		expect(mapAnsiColor(36, false)).toBe("cyan");
		expect(mapAnsiColor(37, false)).toBe("white");
	});

	test("maps bright foreground colors (90-97)", () => {
		expect(mapAnsiColor(90, true)).toBe("black");
		expect(mapAnsiColor(91, true)).toBe("red");
		expect(mapAnsiColor(92, true)).toBe("green");
		expect(mapAnsiColor(93, true)).toBe("yellow");
		expect(mapAnsiColor(94, true)).toBe("blue");
		expect(mapAnsiColor(95, true)).toBe("magenta");
		expect(mapAnsiColor(96, true)).toBe("cyan");
		expect(mapAnsiColor(97, true)).toBe("white");
	});

	test("returns undefined for invalid color codes", () => {
		expect(mapAnsiColor(29, false)).toBeUndefined();
		expect(mapAnsiColor(38, false)).toBeUndefined();
		expect(mapAnsiColor(89, true)).toBeUndefined();
		expect(mapAnsiColor(98, true)).toBeUndefined();
	});
});
