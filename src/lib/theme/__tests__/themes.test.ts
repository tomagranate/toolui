import { describe, expect, test } from "bun:test";
import type { TerminalColors } from "../terminal-colors";
import { buildTerminalTheme, getTheme, mapAnsiColor, themes } from "../themes";

describe("getTheme", () => {
	test("returns default theme when called without argument", () => {
		const theme = getTheme();
		expect(theme.name).toBe("Moss");
		expect(theme.colors.surface0).toBe("#0f1214");
		expect(theme.colors.text).toBe("#c8d0d8");
		expect(theme.colors.accent).toBe("#2d6b52"); // Deep British racing green
	});

	test("returns default theme when called with 'default'", () => {
		const theme = getTheme("default");
		expect(theme.name).toBe("Moss");
		expect(theme.colors.surface0).toBe("#0f1214");
	});

	test("returns correct theme when called with valid theme name", () => {
		const mist = getTheme("mist");
		expect(mist.name).toBe("Mist");
		expect(mist.colors.surface0).toBe("#ffffff");

		const synthwave = getTheme("synthwave");
		expect(synthwave.name).toBe("Synthwave");
		expect(synthwave.colors.surface0).toBe("#16141e");
	});

	test("falls back to default theme for invalid theme name", () => {
		const theme = getTheme("invalid-theme-name");
		expect(theme.name).toBe("Moss");
		expect(theme.colors.surface0).toBe("#0f1214");
	});

	test("all themes have all required color properties", () => {
		const themeNames = Object.keys(themes);
		expect(themeNames.length).toBeGreaterThanOrEqual(5); // terminal, default, light, cappuccino, synthwave

		for (const themeName of themeNames) {
			const theme = getTheme(themeName);
			// Verify all required properties exist and are non-empty strings
			expect(typeof theme.name).toBe("string");
			expect(theme.name.length).toBeGreaterThan(0);
			expect(typeof theme.colors.surface0).toBe("string");
			expect(typeof theme.colors.surface1).toBe("string");
			expect(typeof theme.colors.surface2).toBe("string");
			expect(typeof theme.colors.text).toBe("string");
			expect(typeof theme.colors.textDim).toBe("string");
			expect(typeof theme.colors.textMuted).toBe("string");
			expect(typeof theme.colors.accent).toBe("string");
			expect(typeof theme.colors.success).toBe("string");
			expect(typeof theme.colors.warning).toBe("string");
			expect(typeof theme.colors.error).toBe("string");
			expect(typeof theme.colors.accentForeground).toBe("string");
			expect(typeof theme.colors.warningForeground).toBe("string");
			expect(typeof theme.colors.selectionBackground).toBe("string");
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

describe("buildTerminalTheme", () => {
	test("builds theme from terminal colors with all values", () => {
		const colors: TerminalColors = {
			foreground: "#f8f8f2",
			background: "#282a36",
			palette: [
				"#000000", // 0: black
				"#ff5555", // 1: red
				"#50fa7b", // 2: green
				"#f1fa8c", // 3: yellow
				"#bd93f9", // 4: blue
				"#ff79c6", // 5: magenta
				"#8be9fd", // 6: cyan
				"#f8f8f2", // 7: white
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
			],
		};

		const theme = buildTerminalTheme(colors);

		expect(theme.name).toBe("Terminal");
		expect(theme.colors.surface0).toBe("#282a36");
		expect(theme.colors.text).toBe("#f8f8f2");
		expect(theme.colors.success).toBe("#50fa7b");
		expect(theme.colors.error).toBe("#ff5555");
		expect(theme.colors.warning).toBe("#f1fa8c");
		expect(theme.colors.accent).toBe("#bd93f9");
	});

	test("uses fallback colors when palette is empty", () => {
		const colors: TerminalColors = {
			foreground: "#ffffff",
			background: "#000000",
			palette: new Array(16).fill(undefined),
		};

		const theme = buildTerminalTheme(colors);

		expect(theme.colors.surface0).toBe("#000000");
		expect(theme.colors.text).toBe("#ffffff");
		// Fallback palette colors
		expect(theme.colors.success).toBe("#00ff00");
		expect(theme.colors.error).toBe("#ff0000");
		expect(theme.colors.warning).toBe("#ffff00");
		expect(theme.colors.accent).toBe("#0000ff");
	});

	test("uses default colors when foreground/background are undefined", () => {
		const colors: TerminalColors = {
			palette: new Array(16).fill(undefined),
		};

		const theme = buildTerminalTheme(colors);

		expect(theme.colors.surface0).toBe("#000000");
		expect(theme.colors.text).toBe("#ffffff");
	});

	test("generates contrasting text colors for accent", () => {
		// Dark blue background should get light text
		const darkColors: TerminalColors = {
			foreground: "#ffffff",
			background: "#000000",
			palette: [
				undefined,
				undefined,
				undefined,
				undefined,
				"#0000ff", // 4: dark blue
				undefined,
				undefined,
				undefined,
				...new Array(8).fill(undefined),
			],
		};

		const darkTheme = buildTerminalTheme(darkColors);
		expect(darkTheme.colors.accentForeground).toBe("#ffffff");

		// Light/bright background should get dark text
		const lightColors: TerminalColors = {
			foreground: "#000000",
			background: "#ffffff",
			palette: [
				undefined,
				undefined,
				undefined,
				undefined,
				"#00ffff", // 4: bright cyan
				undefined,
				undefined,
				undefined,
				...new Array(8).fill(undefined),
			],
		};

		const lightTheme = buildTerminalTheme(lightColors);
		expect(lightTheme.colors.accentForeground).toBe("#000000");
	});

	test("generates contrasting warning text for yellow backgrounds", () => {
		const colors: TerminalColors = {
			foreground: "#ffffff",
			background: "#000000",
			palette: [
				undefined,
				undefined,
				undefined,
				"#f1fa8c", // 3: bright yellow (Dracula)
				undefined,
				undefined,
				undefined,
				undefined,
				...new Array(8).fill(undefined),
			],
		};

		const theme = buildTerminalTheme(colors);
		// Yellow has high luminance, should get dark text
		expect(theme.colors.warningForeground).toBe("#000000");
	});

	test("dims foreground color for muted text", () => {
		const colors: TerminalColors = {
			foreground: "#ffffff",
			background: "#000000",
			palette: new Array(16).fill(undefined),
		};

		const theme = buildTerminalTheme(colors);

		// Muted text should be dimmer than the original foreground
		expect(theme.colors.textMuted).not.toBe("#ffffff");
		// Should be a hex color
		expect(theme.colors.textMuted).toMatch(/^#[0-9a-f]{6}$/);
	});

	test("builds theme matching Catppuccin Mocha style", () => {
		const colors: TerminalColors = {
			foreground: "#cdd6f4",
			background: "#1e1e2e",
			palette: [
				"#45475a", // 0: black (surface1)
				"#f38ba8", // 1: red
				"#a6e3a1", // 2: green
				"#f9e2af", // 3: yellow
				"#89b4fa", // 4: blue
				"#f5c2e7", // 5: pink
				"#94e2d5", // 6: teal
				"#bac2de", // 7: subtext1
				...new Array(8).fill(undefined),
			],
		};

		const theme = buildTerminalTheme(colors);

		expect(theme.colors.surface0).toBe("#1e1e2e");
		expect(theme.colors.text).toBe("#cdd6f4");
		expect(theme.colors.success).toBe("#a6e3a1");
		expect(theme.colors.error).toBe("#f38ba8");
		expect(theme.colors.accent).toBe("#89b4fa");
	});

	test("handles partial palette gracefully", () => {
		const colors: TerminalColors = {
			foreground: "#ffffff",
			background: "#000000",
			palette: [
				"#000000", // Only black defined
				undefined,
				"#00ff00", // Only green defined
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				...new Array(8).fill(undefined),
			],
		};

		const theme = buildTerminalTheme(colors);

		// Should use defined green
		expect(theme.colors.success).toBe("#00ff00");
		// Should use fallbacks for undefined
		expect(theme.colors.error).toBe("#ff0000");
		expect(theme.colors.accent).toBe("#0000ff");
	});
});
