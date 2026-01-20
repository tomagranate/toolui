import * as fs from "node:fs";
import * as tty from "node:tty";

/**
 * Represents the terminal's color palette extracted via OSC queries.
 */
export interface TerminalColors {
	foreground?: string;
	background?: string;
	/** ANSI palette colors 0-15 */
	palette: (string | undefined)[];
}

/**
 * Converts a 16-bit RGB component (0-65535) to a 2-digit hex string.
 */
function component16BitToHex(value: string): string {
	// OSC responses use 4 hex digits per component (16-bit)
	// We only need the high 2 digits for 8-bit color
	const num = Number.parseInt(value, 16);
	const scaled = Math.round((num / 65535) * 255);
	return scaled.toString(16).padStart(2, "0");
}

/**
 * Parses an OSC color response in the format "rgb:RRRR/GGGG/BBBB" to a hex color.
 * @param response - The color response string (e.g., "rgb:1e1e/2e2e/3e3e")
 * @returns Hex color string (e.g., "#1e2e3e") or undefined if parsing fails
 */
export function parseOscColorResponse(response: string): string | undefined {
	// Match rgb:RRRR/GGGG/BBBB format (16-bit components)
	const match = response.match(
		/rgb:([0-9a-fA-F]+)\/([0-9a-fA-F]+)\/([0-9a-fA-F]+)/,
	);
	if (!match) {
		return undefined;
	}

	const [, r, g, b] = match;
	if (!r || !g || !b) {
		return undefined;
	}

	// Handle both 16-bit (4 hex digits) and 8-bit (2 hex digits) responses
	const rHex = r.length === 4 ? component16BitToHex(r) : r.padStart(2, "0");
	const gHex = g.length === 4 ? component16BitToHex(g) : g.padStart(2, "0");
	const bHex = b.length === 4 ? component16BitToHex(b) : b.padStart(2, "0");

	return `#${rHex}${gHex}${bHex}`;
}

/**
 * Queries a single color from the terminal using OSC escape sequences.
 * @param oscCode - The OSC code (10 for foreground, 11 for background, 4;N for palette)
 * @param timeoutMs - Timeout in milliseconds
 * @returns The hex color or undefined if query fails/times out
 */
async function queryOscColor(
	oscCode: string,
	timeoutMs: number,
): Promise<string | undefined> {
	// Check if stdin is a TTY
	if (!process.stdin.isTTY) {
		return undefined;
	}

	return new Promise((resolve) => {
		let response = "";
		let resolved = false;

		const cleanup = () => {
			if (resolved) return;
			resolved = true;
			// Restore stdin settings
			if (process.stdin.isTTY) {
				process.stdin.setRawMode(false);
			}
			process.stdin.removeListener("data", onData);
			process.stdin.pause();
		};

		const timeout = setTimeout(() => {
			cleanup();
			resolve(undefined);
		}, timeoutMs);

		const onData = (data: Buffer) => {
			response += data.toString();

			// Look for OSC response terminator (BEL or ST)
			// Response format: ESC ] <code> ; rgb:RRRR/GGGG/BBBB BEL/ST
			if (response.includes("\x07") || response.includes("\x1b\\")) {
				clearTimeout(timeout);
				cleanup();

				const color = parseOscColorResponse(response);
				resolve(color);
			}
		};

		// Set up stdin for reading response
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on("data", onData);

		// Send the OSC query
		// ESC ] <code> ; ? BEL
		process.stdout.write(`\x1b]${oscCode};?\x07`);
	});
}

/**
 * Queries terminal colors using OSC escape sequences.
 * This works with xterm-compatible terminals like Ghostty, iTerm2, Kitty, etc.
 *
 * @param timeoutMs - Timeout for each query in milliseconds (default: 100ms)
 * @returns Terminal colors or undefined if queries fail
 */
export async function queryTerminalColors(
	timeoutMs = 100,
): Promise<TerminalColors | undefined> {
	// Check if we're in a TTY environment
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return undefined;
	}

	// We need to use a different approach - query all colors in sequence
	// because we can only have one stdin listener at a time
	const colors: TerminalColors = {
		palette: new Array(16).fill(undefined),
	};

	try {
		// Query foreground (OSC 10)
		colors.foreground = await queryOscColor("10", timeoutMs);

		// Query background (OSC 11)
		colors.background = await queryOscColor("11", timeoutMs);

		// Query palette colors 0-15 (OSC 4;N)
		// Only query the essential colors to keep startup fast
		const essentialPaletteIndices = [0, 1, 2, 3, 4, 5, 6, 7];
		for (const i of essentialPaletteIndices) {
			colors.palette[i] = await queryOscColor(`4;${i}`, timeoutMs);
		}

		// Check if we got at least foreground and background
		if (!colors.foreground && !colors.background) {
			return undefined;
		}

		return colors;
	} catch {
		return undefined;
	}
}

/**
 * Queries terminal colors using a more efficient batch approach.
 * Reads from /dev/tty directly to avoid interfering with stdin.
 *
 * @param timeoutMs - Total timeout in milliseconds
 * @returns Terminal colors or undefined if queries fail
 */
export async function queryTerminalColorsBatch(
	timeoutMs = 500,
): Promise<TerminalColors | undefined> {
	// Try to open /dev/tty for direct terminal access
	let ttyFd: number | undefined;
	let ttyReadStream: tty.ReadStream | undefined;
	let ttyWriteStream: tty.WriteStream | undefined;

	try {
		ttyFd = fs.openSync("/dev/tty", fs.constants.O_RDWR);
		ttyReadStream = new tty.ReadStream(ttyFd);
		ttyWriteStream = new tty.WriteStream(ttyFd);
	} catch {
		// /dev/tty not available, fall back to undefined
		return undefined;
	}

	const colors: TerminalColors = {
		palette: new Array(16).fill(undefined),
	};

	return new Promise((resolve) => {
		let response = "";
		let resolved = false;

		const cleanup = () => {
			if (resolved) return;
			resolved = true;
			if (ttyReadStream) {
				ttyReadStream.setRawMode(false);
				ttyReadStream.removeAllListeners("data");
				ttyReadStream.destroy();
			}
			if (ttyWriteStream) {
				ttyWriteStream.destroy();
			}
			if (ttyFd !== undefined) {
				try {
					fs.closeSync(ttyFd);
				} catch {
					// Ignore close errors
				}
			}
		};

		const timeout = setTimeout(() => {
			cleanup();
			// Return whatever we've collected so far
			if (colors.foreground || colors.background) {
				resolve(colors);
			} else {
				resolve(undefined);
			}
		}, timeoutMs);

		// Track which responses we've received
		const expectedResponses = 10; // fg + bg + 8 palette colors
		let receivedResponses = 0;

		const processResponse = (data: string) => {
			// Parse OSC responses - they come as ESC ] <code> ; rgb:... BEL/ST
			// Multiple responses may be concatenated
			// ESC = \x1b (27), BEL = \x07 (7), ST = ESC \
			// Using String.fromCharCode to avoid lint errors for control characters
			const ESC = String.fromCharCode(0x1b);
			const BEL = String.fromCharCode(0x07);
			const oscPatternStr = `${ESC}\\](\\d+);?(\\d+)?;?rgb:([0-9a-fA-F]+)/([0-9a-fA-F]+)/([0-9a-fA-F]+)[${BEL}${ESC}\\\\]`;
			const oscPattern = new RegExp(oscPatternStr, "g");
			const matches = data.matchAll(oscPattern);

			for (const match of matches) {
				const [, code, paletteIndex, r, g, b] = match;
				const hexColor = `#${component16BitToHex(r ?? "0000")}${component16BitToHex(g ?? "0000")}${component16BitToHex(b ?? "0000")}`;

				if (code === "10") {
					colors.foreground = hexColor;
					receivedResponses++;
				} else if (code === "11") {
					colors.background = hexColor;
					receivedResponses++;
				} else if (code === "4" && paletteIndex !== undefined) {
					const idx = Number.parseInt(paletteIndex, 10);
					if (idx >= 0 && idx < 16) {
						colors.palette[idx] = hexColor;
						receivedResponses++;
					}
				}
			}

			// If we've received all expected responses, we're done
			if (receivedResponses >= expectedResponses) {
				clearTimeout(timeout);
				cleanup();
				resolve(colors);
			}
		};

		const onData = (data: Buffer) => {
			response += data.toString();
			processResponse(response);
		};

		if (!ttyReadStream || !ttyWriteStream) {
			resolve(undefined);
			return;
		}

		// Set up for reading
		ttyReadStream.setRawMode(true);
		ttyReadStream.resume();
		ttyReadStream.on("data", onData);

		// Send all queries at once
		// Query foreground (OSC 10), background (OSC 11), and palette 0-7 (OSC 4;N)
		const queries = [
			"\x1b]10;?\x07", // Foreground
			"\x1b]11;?\x07", // Background
			"\x1b]4;0;?\x07", // Palette 0 (black)
			"\x1b]4;1;?\x07", // Palette 1 (red)
			"\x1b]4;2;?\x07", // Palette 2 (green)
			"\x1b]4;3;?\x07", // Palette 3 (yellow)
			"\x1b]4;4;?\x07", // Palette 4 (blue)
			"\x1b]4;5;?\x07", // Palette 5 (magenta)
			"\x1b]4;6;?\x07", // Palette 6 (cyan)
			"\x1b]4;7;?\x07", // Palette 7 (white)
		];

		ttyWriteStream.write(queries.join(""));
	});
}
