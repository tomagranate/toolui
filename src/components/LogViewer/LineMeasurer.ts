import { TextBuffer, TextBufferView, type WidthMethod } from "@opentui/core";

/**
 * LineMeasurer uses OpenTUI's TextBuffer/TextBufferView to accurately measure
 * how many terminal rows a line of text will occupy when wrapped.
 *
 * This matches the exact wrapping algorithm used by OpenTUI for rendering,
 * accounting for Unicode character widths (wide characters, ANSI codes, etc.).
 */
export class LineMeasurer {
	private textBuffer: TextBuffer;
	private textBufferView: TextBufferView;
	private currentWidth: number;
	private isDestroyed = false;

	constructor(widthMethod: WidthMethod, initialWidth: number) {
		this.textBuffer = TextBuffer.create(widthMethod);
		this.textBufferView = TextBufferView.create(this.textBuffer);
		this.currentWidth = initialWidth;
		this.textBufferView.setWrapMode("char"); // Character wrapping mode
		this.textBufferView.setWrapWidth(initialWidth);
	}

	/**
	 * Set the wrap width for measurement.
	 * Call this when the viewport width changes.
	 */
	setWrapWidth(width: number): void {
		if (this.isDestroyed) return;
		if (width !== this.currentWidth && width > 0) {
			this.currentWidth = width;
			this.textBufferView.setWrapWidth(width);
		}
	}

	/**
	 * Measure how many terminal rows a single line of text will occupy.
	 */
	measureLine(line: string): number {
		if (this.isDestroyed) return 1;
		if (line.length === 0) return 1;
		if (this.currentWidth <= 0) return 1;

		// Set the text and measure
		this.textBuffer.setText(line);
		const virtualLineCount = this.textBufferView.getVirtualLineCount();

		// OpenTUI returns 0 for empty content, but we need at least 1 row
		return Math.max(1, virtualLineCount);
	}

	/**
	 * Measure multiple lines and return an array of row counts.
	 * More efficient than calling measureLine repeatedly as it batches the work.
	 */
	measureLines(lines: string[]): number[] {
		if (this.isDestroyed) return lines.map(() => 1);

		return lines.map((line) => this.measureLine(line));
	}

	/**
	 * Build a cumulative row cache for a set of lines.
	 * cumulativeRows[i] = total rows from line 0 through line i (inclusive)
	 */
	buildCumulativeRowCache(lines: string[]): number[] {
		if (this.isDestroyed) {
			// Fallback: each line = 1 row
			return lines.map((_, i) => i + 1);
		}

		const cumulativeRows: number[] = new Array(lines.length);
		let total = 0;

		for (let i = 0; i < lines.length; i++) {
			total += this.measureLine(lines[i] ?? "");
			cumulativeRows[i] = total;
		}

		return cumulativeRows;
	}

	/**
	 * Extend an existing cumulative cache with new lines.
	 * Returns a new array (does not mutate the input).
	 */
	extendCumulativeRowCache(
		existingCache: number[],
		newLines: string[],
	): number[] {
		if (this.isDestroyed) {
			const lastValue =
				existingCache.length > 0
					? (existingCache[existingCache.length - 1] ?? 0)
					: 0;
			return [...existingCache, ...newLines.map((_, i) => lastValue + i + 1)];
		}

		const newCache = [...existingCache];
		let total =
			existingCache.length > 0
				? (existingCache[existingCache.length - 1] ?? 0)
				: 0;

		for (const line of newLines) {
			total += this.measureLine(line);
			newCache.push(total);
		}

		return newCache;
	}

	/**
	 * Clean up resources. Call when the component unmounts.
	 */
	destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;
		this.textBufferView.destroy();
		this.textBuffer.destroy();
	}
}
