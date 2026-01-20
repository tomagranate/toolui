import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { buildClipboardSequence, copyToClipboard } from "../clipboard";

describe("buildClipboardSequence", () => {
	test("builds OSC 52 escape sequence with base64-encoded text", () => {
		const sequence = buildClipboardSequence("Hello, World!");

		// Verify OSC 52 format: ESC ] 52 ; c ; <base64> BEL
		expect(sequence.startsWith("\x1b]52;c;")).toBe(true);
		expect(sequence.endsWith("\x07")).toBe(true);
		// Verify the base64 portion in the middle
		const base64Part = sequence.slice(7, -1); // Remove prefix and BEL
		expect(base64Part).toMatch(/^[A-Za-z0-9+/=]+$/);
	});

	test("correctly encodes simple text to base64", () => {
		const sequence = buildClipboardSequence("test");
		const expectedBase64 = Buffer.from("test").toString("base64");
		expect(sequence).toBe(`\x1b]52;c;${expectedBase64}\x07`);
	});

	test("handles empty string", () => {
		const sequence = buildClipboardSequence("");
		expect(sequence).toBe("\x1b]52;c;\x07");
	});

	test("handles special characters", () => {
		const sequence = buildClipboardSequence("Hello\nWorld\t!");
		const expectedBase64 = Buffer.from("Hello\nWorld\t!").toString("base64");
		expect(sequence).toBe(`\x1b]52;c;${expectedBase64}\x07`);
	});

	test("handles unicode characters", () => {
		const sequence = buildClipboardSequence("こんにちは");
		const expectedBase64 = Buffer.from("こんにちは").toString("base64");
		expect(sequence).toBe(`\x1b]52;c;${expectedBase64}\x07`);
	});

	test("handles emoji", () => {
		const sequence = buildClipboardSequence("Hello 👋 World");
		const expectedBase64 = Buffer.from("Hello 👋 World").toString("base64");
		expect(sequence).toBe(`\x1b]52;c;${expectedBase64}\x07`);
	});

	test("handles multi-line text", () => {
		const multiLine = "Line 1\nLine 2\nLine 3";
		const sequence = buildClipboardSequence(multiLine);
		const expectedBase64 = Buffer.from(multiLine).toString("base64");
		expect(sequence).toBe(`\x1b]52;c;${expectedBase64}\x07`);
	});
});

describe("copyToClipboard", () => {
	let originalWrite: typeof process.stdout.write;
	let writtenData: string;

	beforeEach(() => {
		writtenData = "";
		originalWrite = process.stdout.write;
		// Mock process.stdout.write to capture output
		process.stdout.write = mock((data: string | Uint8Array) => {
			writtenData += data.toString();
			return true;
		}) as typeof process.stdout.write;
	});

	afterEach(() => {
		process.stdout.write = originalWrite;
	});

	test("uses process.stdout.write by default", () => {
		copyToClipboard("test");
		const expectedBase64 = Buffer.from("test").toString("base64");
		expect(writtenData).toBe(`\x1b]52;c;${expectedBase64}\x07`);
	});

	test("uses custom write function when provided", () => {
		let customWrittenData = "";
		const customWrite = (data: string) => {
			customWrittenData = data;
		};

		copyToClipboard("test", customWrite);

		const expectedBase64 = Buffer.from("test").toString("base64");
		expect(customWrittenData).toBe(`\x1b]52;c;${expectedBase64}\x07`);
		// Should NOT write to stdout when custom write is provided
		expect(writtenData).toBe("");
	});
});
