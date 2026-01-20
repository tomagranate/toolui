/**
 * Builds the OSC 52 escape sequence for copying text to clipboard.
 * @param text - The text to copy
 * @returns The escape sequence string
 */
export function buildClipboardSequence(text: string): string {
	const encoded = Buffer.from(text).toString("base64");
	// OSC 52 escape sequence: ESC ] 52 ; c ; <base64-data> BEL
	// 'c' indicates the clipboard selection (as opposed to primary selection)
	return `\x1b]52;c;${encoded}\x07`;
}

/**
 * Copy text to the system clipboard using OSC 52 escape sequence.
 * This works in most modern terminals (iTerm2, Kitty, Ghostty, Windows Terminal, etc.)
 *
 * When running inside a TUI framework like OpenTUI, pass the renderer's write
 * function to ensure the escape sequence reaches the terminal.
 *
 * @param text - The text to copy to clipboard
 * @param write - Optional write function (e.g., renderer.write). Falls back to process.stdout.write
 */
export function copyToClipboard(
	text: string,
	write?: (data: string) => void,
): void {
	const sequence = buildClipboardSequence(text);
	if (write) {
		write(sequence);
	} else {
		process.stdout.write(sequence);
	}
}
