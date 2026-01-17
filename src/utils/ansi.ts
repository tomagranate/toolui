import { TextAttributes } from "@opentui/core";
import type { TextSegment } from "../types";
import { mapAnsiColor } from "./themes";

const ESC = String.fromCharCode(27);
// Match ANSI escape sequences: ESC[ followed by parameters and ending with a letter
const ANSI_ESCAPE_REGEX = new RegExp(`${ESC}\\[([0-9;]*)([a-zA-Z])`, "g");

/**
 * Calculates the visible width of text, ignoring ANSI escape codes.
 * Handles wide Unicode characters (count as 2 columns).
 */
export function getVisibleWidth(text: string): number {
	// Remove ANSI escape codes first
	const esc = String.fromCharCode(27);
	const ansiPattern = new RegExp(`${esc}\\[[0-9;]*[a-zA-Z]`, "g");
	const cleanText = text.replace(ansiPattern, "");

	let width = 0;
	for (const char of cleanText) {
		// Check if character is a wide Unicode character (CJK, emoji, etc.)
		const codePoint = char.codePointAt(0) ?? 0;
		// Wide characters: CJK, emoji, and other full-width characters
		if (
			(codePoint >= 0x1100 && codePoint <= 0x115f) || // Hangul Jamo
			(codePoint >= 0x2e80 && codePoint <= 0x2eff) || // CJK Radicals
			(codePoint >= 0x2f00 && codePoint <= 0x2fdf) || // Kangxi Radicals
			(codePoint >= 0x3000 && codePoint <= 0x303f) || // CJK Symbols
			(codePoint >= 0x3040 && codePoint <= 0x309f) || // Hiragana
			(codePoint >= 0x30a0 && codePoint <= 0x30ff) || // Katakana
			(codePoint >= 0x3100 && codePoint <= 0x312f) || // Bopomofo
			(codePoint >= 0x3130 && codePoint <= 0x318f) || // Hangul Compatibility Jamo
			(codePoint >= 0x3200 && codePoint <= 0x32ff) || // Enclosed CJK
			(codePoint >= 0x3300 && codePoint <= 0x33ff) || // CJK Compatibility
			(codePoint >= 0x3400 && codePoint <= 0x4dbf) || // CJK Unified Ideographs Extension A
			(codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK Unified Ideographs
			(codePoint >= 0xa000 && codePoint <= 0xa48f) || // Yi Syllables
			(codePoint >= 0xa490 && codePoint <= 0xa4cf) || // Yi Radicals
			(codePoint >= 0xac00 && codePoint <= 0xd7af) || // Hangul Syllables
			(codePoint >= 0xf900 && codePoint <= 0xfaff) || // CJK Compatibility Ideographs
			(codePoint >= 0xfe30 && codePoint <= 0xfe4f) || // CJK Compatibility Forms
			(codePoint >= 0xff00 && codePoint <= 0xffef) || // Halfwidth and Fullwidth Forms
			(codePoint >= 0x1f300 && codePoint <= 0x1f5ff) || // Miscellaneous Symbols and Pictographs
			(codePoint >= 0x1f600 && codePoint <= 0x1f64f) || // Emoticons
			(codePoint >= 0x1f900 && codePoint <= 0x1f9ff) // Supplemental Symbols and Pictographs
		) {
			width += 2;
		} else {
			width += 1;
		}
	}
	return width;
}

/**
 * Parses a line containing ANSI escape codes into segments with color/style information.
 */
export function parseAnsiLine(text: string): TextSegment[] {
	const segments: TextSegment[] = [];
	let currentText = "";
	let currentAttributes = 0;

	// Track state for nested codes
	let fgColor: string | undefined;
	let _bgColor: string | undefined; // Background colors not yet supported
	let isBold = false;
	let isDim = false;
	let _isItalic = false; // Italic not supported by OpenTUI
	let _isUnderline = false; // Underline not supported by OpenTUI

	// Reset function to create a new segment
	const pushSegment = () => {
		if (currentText.length > 0) {
			segments.push({
				text: currentText,
				color: fgColor,
				attributes: currentAttributes,
			});
			currentText = "";
		}
	};

	// Process the text, finding ANSI codes
	let lastIndex = 0;

	// Reset regex
	ANSI_ESCAPE_REGEX.lastIndex = 0;

	// Use matchAll for cleaner iteration
	const matches = Array.from(text.matchAll(ANSI_ESCAPE_REGEX));
	for (const match of matches) {
		// Add text before the ANSI code
		if (match.index !== undefined && match.index > lastIndex) {
			currentText += text.substring(lastIndex, match.index);
		}

		const params = match[1] ?? "";
		const code = match[2];

		// Process SGR (Select Graphic Rendition) codes (ending with 'm')
		if (code === "m") {
			if (params === "") {
				// Reset all
				pushSegment();
				fgColor = undefined;
				_bgColor = undefined;
				isBold = false;
				isDim = false;
				_isItalic = false;
				_isUnderline = false;
				currentAttributes = 0;
			} else {
				const codes = params
					.split(";")
					.map((p) => parseInt(p, 10))
					.filter((n) => !Number.isNaN(n));

				for (let i = 0; i < codes.length; i++) {
					const c = codes[i];
					if (c === undefined) continue;

					if (c === 0) {
						// Reset all
						pushSegment();
						fgColor = undefined;
						_bgColor = undefined;
						isBold = false;
						isDim = false;
						_isItalic = false;
						_isUnderline = false;
						currentAttributes = 0;
					} else if (c === 1) {
						isBold = true;
					} else if (c === 2) {
						isDim = true;
					} else if (c === 3) {
						_isItalic = true;
					} else if (c === 4) {
						_isUnderline = true;
					} else if (c === 22) {
						isBold = false;
						isDim = false;
					} else if (c === 23) {
						_isItalic = false;
					} else if (c === 24) {
						_isUnderline = false;
					} else if (c === 39) {
						// Default foreground
						fgColor = undefined;
					} else if (c === 49) {
						// Default background
						_bgColor = undefined;
					} else if (c >= 30 && c <= 37) {
						// Standard foreground colors
						const mapped = mapAnsiColor(c, false);
						if (mapped) {
							fgColor = mapped;
						}
					} else if (c >= 90 && c <= 97) {
						// Bright foreground colors
						const mapped = mapAnsiColor(c, true);
						if (mapped) {
							fgColor = mapped;
						}
					} else if (c >= 40 && c <= 47) {
						// Standard background colors (we'll ignore these for now)
						// bgColor = mapAnsiColor(c - 10, false);
					} else if (c >= 100 && c <= 107) {
						// Bright background colors (we'll ignore these for now)
						// bgColor = mapAnsiColor(c - 10, true);
					} else if (c === 38) {
						// Extended foreground color
						if (i + 1 < codes.length) {
							const nextCode = codes[i + 1];
							if (nextCode === 5) {
								// 256-color mode: 38;5;X
								if (i + 2 < codes.length) {
									const color256 = codes[i + 2];
									if (color256 !== undefined) {
										// Map 256-color to closest standard color
										fgColor = map256Color(color256);
										i += 2;
									}
								}
							} else if (nextCode === 2) {
								// RGB mode: 38;2;R;G;B
								if (i + 4 < codes.length) {
									const r = codes[i + 2];
									const g = codes[i + 3];
									const b = codes[i + 4];
									if (r !== undefined && g !== undefined && b !== undefined) {
										fgColor = rgbToHex(r, g, b);
										i += 4;
									}
								}
							}
						}
					} else if (c === 48) {
						// Extended background color (we'll ignore these for now)
						if (i + 1 < codes.length) {
							const nextCode = codes[i + 1];
							if (nextCode === 5) {
								i += 2;
							} else if (nextCode === 2) {
								i += 4;
							}
						}
					}
				}

				// Update attributes
				currentAttributes = 0;
				if (isBold) {
					currentAttributes |= TextAttributes.BOLD;
				}
				if (isDim) {
					// Dim is not directly supported, but we can use it if available
					// For now, we'll just note it
				}
				// Note: Italic and underline may not be supported by OpenTUI
			}
		}

		if (match.index !== undefined) {
			lastIndex = match.index + match[0].length;
		}
	}

	// Add remaining text
	if (lastIndex < text.length) {
		currentText += text.substring(lastIndex);
	}

	// Push final segment
	pushSegment();

	// If no segments were created but there was text, create a default segment
	if (segments.length === 0 && text.trim().length > 0) {
		segments.push({ text });
	}

	return segments;
}

/**
 * Maps a 256-color ANSI code to a hex color.
 * Uses a simplified mapping to standard colors.
 */
function map256Color(code: number): string {
	// Map to closest standard color
	if (code >= 0 && code <= 7) {
		// Standard colors
		const mapped = mapAnsiColor(30 + code, false);
		return mapped ?? "#ffffff";
	}
	if (code >= 8 && code <= 15) {
		// Bright colors
		const mapped = mapAnsiColor(90 + (code - 8), true);
		return mapped ?? "#ffffff";
	}
	// For other colors, use a simple approximation
	// This is a simplified mapping
	return "#ffffff";
}

/**
 * Converts RGB values to hex color string.
 */
function rgbToHex(r: number, g: number, b: number): string {
	return `#${[r, g, b]
		.map((x) => {
			const hex = x.toString(16);
			return hex.length === 1 ? `0${hex}` : hex;
		})
		.join("")}`;
}

/**
 * Wraps segments across multiple lines based on visible width.
 * Attempts to wrap at word boundaries when possible.
 */
export function wrapSegments(
	segments: TextSegment[],
	maxWidth: number,
): TextSegment[][] {
	if (segments.length === 0) {
		return [];
	}

	const lines: TextSegment[][] = [];
	let currentLine: TextSegment[] = [];
	let currentWidth = 0;

	for (const segment of segments) {
		const segmentWidth = getVisibleWidth(segment.text);

		// If segment fits on current line, add it
		if (currentWidth + segmentWidth <= maxWidth) {
			currentLine.push(segment);
			currentWidth += segmentWidth;
		} else {
			// Segment doesn't fit
			if (currentLine.length > 0) {
				// Save current line and start new one
				lines.push(currentLine);
				currentLine = [];
				currentWidth = 0;
			}

			// If segment itself is longer than maxWidth, we need to split it
			if (segmentWidth > maxWidth) {
				// Split the segment text
				const words = segment.text.split(/(\s+)/);
				let wordBuffer = "";
				let wordBufferWidth = 0;

				for (const word of words) {
					const wordWidth = getVisibleWidth(word);

					if (wordBufferWidth + wordWidth <= maxWidth) {
						wordBuffer += word;
						wordBufferWidth += wordWidth;
					} else {
						// Word doesn't fit, push buffer and start new line
						if (wordBuffer.length > 0) {
							currentLine.push({
								text: wordBuffer,
								color: segment.color,
								attributes: segment.attributes,
							});
							lines.push(currentLine);
							currentLine = [];
							currentWidth = 0;
						}

						// If word itself is too long, split it character by character
						if (wordWidth > maxWidth) {
							for (const char of word) {
								const charWidth = getVisibleWidth(char);
								if (currentWidth + charWidth > maxWidth) {
									if (currentLine.length > 0) {
										lines.push(currentLine);
										currentLine = [];
										currentWidth = 0;
									}
								}
								currentLine.push({
									text: char,
									color: segment.color,
									attributes: segment.attributes,
								});
								currentWidth += charWidth;
							}
							wordBuffer = "";
							wordBufferWidth = 0;
						} else {
							wordBuffer = word;
							wordBufferWidth = wordWidth;
						}
					}
				}

				// Add remaining word buffer
				if (wordBuffer.length > 0) {
					currentLine.push({
						text: wordBuffer,
						color: segment.color,
						attributes: segment.attributes,
					});
					currentWidth = wordBufferWidth;
				}
			} else {
				// Segment fits on a new line
				currentLine.push(segment);
				currentWidth = segmentWidth;
			}
		}
	}

	// Add final line if it has content
	if (currentLine.length > 0) {
		lines.push(currentLine);
	}

	// If no lines were created, return at least one empty line
	return lines.length > 0 ? lines : [[]];
}
