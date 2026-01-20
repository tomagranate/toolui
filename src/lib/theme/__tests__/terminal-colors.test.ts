import { describe, expect, test } from "bun:test";
import { parseOscColorResponse } from "../terminal-colors";

describe("parseOscColorResponse", () => {
	test("parses 16-bit RGB response (4 hex digits per component)", () => {
		// Standard OSC response format with 16-bit components
		const result = parseOscColorResponse("rgb:1e1e/2e2e/3e3e");
		expect(result).toBe("#1e2e3e");
	});

	test("parses full white color", () => {
		const result = parseOscColorResponse("rgb:ffff/ffff/ffff");
		expect(result).toBe("#ffffff");
	});

	test("parses full black color", () => {
		const result = parseOscColorResponse("rgb:0000/0000/0000");
		expect(result).toBe("#000000");
	});

	test("parses 8-bit RGB response (2 hex digits per component)", () => {
		// Some terminals use 8-bit responses
		const result = parseOscColorResponse("rgb:1e/2e/3e");
		expect(result).toBe("#1e2e3e");
	});

	test("parses mixed case hex values", () => {
		const result = parseOscColorResponse("rgb:ABCD/1234/EF00");
		// EF00 (61184) scales to 238 (0xEE) when converted from 16-bit to 8-bit
		expect(result).toBe("#ab12ee");
	});

	test("parses Catppuccin Mocha background color", () => {
		// Real example: Catppuccin Mocha background
		const result = parseOscColorResponse("rgb:1e1e/1e1e/2e2e");
		expect(result).toBe("#1e1e2e");
	});

	test("parses Dracula background color", () => {
		const result = parseOscColorResponse("rgb:2828/2a2a/3636");
		expect(result).toBe("#282a36");
	});

	test("returns undefined for invalid format", () => {
		expect(parseOscColorResponse("not-a-color")).toBeUndefined();
		expect(parseOscColorResponse("")).toBeUndefined();
		expect(parseOscColorResponse("rgb:")).toBeUndefined();
		expect(parseOscColorResponse("rgb:1234")).toBeUndefined();
	});

	test("returns undefined for malformed RGB values", () => {
		// Missing components
		expect(parseOscColorResponse("rgb:1234/5678")).toBeUndefined();
		// Non-hex characters
		expect(parseOscColorResponse("rgb:GGGG/HHHH/IIII")).toBeUndefined();
	});

	test("handles response with OSC prefix/suffix", () => {
		// Full OSC response with escape sequences
		const fullResponse = "\x1b]10;rgb:ffff/ffff/ffff\x07";
		const result = parseOscColorResponse(fullResponse);
		expect(result).toBe("#ffffff");
	});

	test("handles response with ST terminator", () => {
		// Some terminals use ST (ESC \) instead of BEL
		const response = "\x1b]11;rgb:0000/0000/0000\x1b\\";
		const result = parseOscColorResponse(response);
		expect(result).toBe("#000000");
	});

	test("scales 16-bit to 8-bit correctly", () => {
		// 0x8080 (32896) should scale to about 0x80 (128)
		const result = parseOscColorResponse("rgb:8080/8080/8080");
		expect(result).toBe("#808080");
	});

	test("handles maximum value correctly", () => {
		// 0xffff should scale to 0xff
		const result = parseOscColorResponse("rgb:ffff/0000/0000");
		expect(result).toBe("#ff0000");
	});

	test("handles minimum value correctly", () => {
		const result = parseOscColorResponse("rgb:0000/ffff/0000");
		expect(result).toBe("#00ff00");
	});
});
