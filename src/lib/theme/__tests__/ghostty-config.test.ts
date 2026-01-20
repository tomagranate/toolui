import { describe, expect, test } from "bun:test";
import type { GhosttyConfig } from "../ghostty-config";
import { ghosttyConfigToTerminalColors } from "../ghostty-config";

describe("ghosttyConfigToTerminalColors", () => {
	test("converts basic config to terminal colors", () => {
		const config: GhosttyConfig = {
			foreground: "#ffffff",
			background: "#000000",
			palette: new Array(16).fill(undefined),
		};

		const result = ghosttyConfigToTerminalColors(config);

		expect(result.foreground).toBe("#ffffff");
		expect(result.background).toBe("#000000");
		expect(result.palette).toHaveLength(16);
	});

	test("converts config with palette colors", () => {
		const palette = new Array(16).fill(undefined);
		palette[0] = "#000000"; // black
		palette[1] = "#ff0000"; // red
		palette[2] = "#00ff00"; // green
		palette[3] = "#ffff00"; // yellow
		palette[4] = "#0000ff"; // blue
		palette[5] = "#ff00ff"; // magenta
		palette[6] = "#00ffff"; // cyan
		palette[7] = "#ffffff"; // white

		const config: GhosttyConfig = {
			foreground: "#cdd6f4",
			background: "#1e1e2e",
			palette,
		};

		const result = ghosttyConfigToTerminalColors(config);

		expect(result.foreground).toBe("#cdd6f4");
		expect(result.background).toBe("#1e1e2e");
		expect(result.palette[0]).toBe("#000000");
		expect(result.palette[1]).toBe("#ff0000");
		expect(result.palette[2]).toBe("#00ff00");
		expect(result.palette[3]).toBe("#ffff00");
		expect(result.palette[4]).toBe("#0000ff");
		expect(result.palette[5]).toBe("#ff00ff");
		expect(result.palette[6]).toBe("#00ffff");
		expect(result.palette[7]).toBe("#ffffff");
	});

	test("handles config with undefined foreground/background", () => {
		const config: GhosttyConfig = {
			palette: new Array(16).fill(undefined),
		};

		const result = ghosttyConfigToTerminalColors(config);

		expect(result.foreground).toBeUndefined();
		expect(result.background).toBeUndefined();
	});

	test("handles config with theme name", () => {
		const config: GhosttyConfig = {
			theme: "catppuccin-mocha",
			foreground: "#cdd6f4",
			background: "#1e1e2e",
			palette: new Array(16).fill(undefined),
		};

		const result = ghosttyConfigToTerminalColors(config);

		// Theme name is not included in terminal colors, only the resolved values
		expect(result.foreground).toBe("#cdd6f4");
		expect(result.background).toBe("#1e1e2e");
	});

	test("handles partial palette", () => {
		const palette = new Array(16).fill(undefined);
		palette[1] = "#ff5555"; // Only red is set
		palette[4] = "#6272a4"; // Only blue is set

		const config: GhosttyConfig = {
			foreground: "#f8f8f2",
			background: "#282a36",
			palette,
		};

		const result = ghosttyConfigToTerminalColors(config);

		expect(result.palette[0]).toBeUndefined();
		expect(result.palette[1]).toBe("#ff5555");
		expect(result.palette[2]).toBeUndefined();
		expect(result.palette[4]).toBe("#6272a4");
	});

	test("preserves all 16 palette slots", () => {
		const palette: (string | undefined)[] = [];
		for (let i = 0; i < 16; i++) {
			palette[i] = `#${i.toString(16).padStart(2, "0")}0000`;
		}

		const config: GhosttyConfig = {
			foreground: "#ffffff",
			background: "#000000",
			palette,
		};

		const result = ghosttyConfigToTerminalColors(config);

		expect(result.palette).toHaveLength(16);
		for (let i = 0; i < 16; i++) {
			expect(result.palette[i]).toBe(`#${i.toString(16).padStart(2, "0")}0000`);
		}
	});
});

describe("GhosttyConfig type", () => {
	test("accepts valid config structure", () => {
		// This test validates the type structure at compile time
		const config: GhosttyConfig = {
			theme: "dracula",
			foreground: "#f8f8f2",
			background: "#282a36",
			palette: [
				"#000000",
				"#ff5555",
				"#50fa7b",
				"#f1fa8c",
				"#bd93f9",
				"#ff79c6",
				"#8be9fd",
				"#f8f8f2",
				"#6272a4",
				"#ff6e6e",
				"#69ff94",
				"#ffffa5",
				"#d6acff",
				"#ff92df",
				"#a4ffff",
				"#ffffff",
			],
		};

		expect(config.theme).toBe("dracula");
		expect(config.foreground).toBe("#f8f8f2");
		expect(config.palette).toHaveLength(16);
	});

	test("handles named colors", () => {
		const config: GhosttyConfig = {
			foreground: "white",
			background: "black",
			palette: new Array(16).fill(undefined),
		};

		const result = ghosttyConfigToTerminalColors(config);

		// Named colors should be passed through as-is
		expect(result.foreground).toBe("white");
		expect(result.background).toBe("black");
	});
});
