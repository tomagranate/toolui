import { describe, expect, test } from "bun:test";
import { formatHints } from "../HelpBar";

describe("HelpBar", () => {
	describe("formatHints", () => {
		const sampleHints = [
			{ key: "^P", compactKey: "^P", action: "palette", compactAction: "cmd" },
			{ key: "?", compactKey: "?", action: "shortcuts", compactAction: "keys" },
			{ key: "j/k", compactKey: "j/k", action: "tabs", compactAction: "tabs" },
			{ key: "/", compactKey: "/", action: "search", compactAction: "find" },
			{ key: "q", compactKey: "q", action: "quit", compactAction: "quit" },
		];

		test("uses full format when width is sufficient", () => {
			// Full format: "^P: palette | ?: shortcuts | j/k: tabs | /: search | q: quit"
			const result = formatHints(sampleHints, 100);
			expect(result).toBe(
				"^P: palette | ?: shortcuts | j/k: tabs | /: search | q: quit",
			);
		});

		test("uses compact format when width is limited", () => {
			// Compact format: "^P:cmd | ?:keys | j/k:tabs | /:find | q:quit"
			const result = formatHints(sampleHints, 50);
			expect(result).toBe("^P:cmd | ?:keys | j/k:tabs | /:find | q:quit");
		});

		test("uses ultra-compact format when width is very limited", () => {
			// Ultra-compact: "^P ? j/k / q"
			const result = formatHints(sampleHints, 20);
			expect(result).toBe("^P ? j/k / q");
		});

		test("truncates with ellipsis when extremely limited", () => {
			const result = formatHints(sampleHints, 8);
			expect(result).toBe("^P ? j/…");
			expect(result.length).toBe(8);
		});

		test("handles single hint", () => {
			const singleHint = [
				{ key: "Esc", compactKey: "⎋", action: "close", compactAction: "×" },
			];
			const result = formatHints(singleHint, 20);
			expect(result).toBe("Esc: close");
		});

		test("handles empty hints array", () => {
			const result = formatHints([], 50);
			expect(result).toBe("");
		});

		test("respects exact width boundary for full format", () => {
			const twoHints = [
				{ key: "a", compactKey: "a", action: "action", compactAction: "act" },
				{ key: "b", compactKey: "b", action: "other", compactAction: "oth" },
			];
			// Full format: "a: action | b: other" = 20 chars
			const full = formatHints(twoHints, 20);
			expect(full).toBe("a: action | b: other");

			// One less should use compact
			const compact = formatHints(twoHints, 19);
			expect(compact).toBe("a:act | b:oth");
		});

		test("handles search mode hints", () => {
			const searchHints = [
				{
					key: "Enter",
					compactKey: "↵",
					action: "confirm",
					compactAction: "ok",
				},
				{ key: "Esc", compactKey: "⎋", action: "cancel", compactAction: "×" },
			];

			const full = formatHints(searchHints, 50);
			expect(full).toBe("Enter: confirm | Esc: cancel");

			const compact = formatHints(searchHints, 20);
			expect(compact).toBe("↵:ok | ⎋:×");
		});

		test("handles command palette mode hints", () => {
			const paletteHints = [
				{
					key: "↑↓",
					compactKey: "↑↓",
					action: "navigate",
					compactAction: "nav",
				},
				{
					key: "Enter",
					compactKey: "↵",
					action: "select",
					compactAction: "sel",
				},
				{ key: "Esc", compactKey: "⎋", action: "close", compactAction: "×" },
			];

			const full = formatHints(paletteHints, 50);
			expect(full).toBe("↑↓: navigate | Enter: select | Esc: close");

			const compact = formatHints(paletteHints, 25);
			expect(compact).toBe("↑↓:nav | ↵:sel | ⎋:×");
		});
	});
});
