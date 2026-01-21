import type { WidthMethod } from "@opentui/core";
import { LineMeasurer } from "./LineMeasurer";
import type { LineHeightCache } from "./log-viewer-utils";

interface CacheEntry {
	cache: LineHeightCache;
	lastLineCount: number;
}

interface ToolLogSource {
	name: string;
	getLines: () => string[];
}

/**
 * Global store for line height caches that persists across component mounts.
 * This allows caches to be reused when switching between tabs, avoiding
 * expensive recalculation.
 *
 * Also supports proactive background measurement so caches are ready
 * before the user switches to a tab.
 */
class LineHeightCacheStore {
	private caches = new Map<string, CacheEntry>();
	private measurer: LineMeasurer | null = null;
	private currentWidthMethod: WidthMethod | null = null;

	// Settings for proactive measurement
	private currentContentWidth = 80;
	private currentLineWrap = true;

	// Background measurement
	private toolSources: ToolLogSource[] = [];
	private backgroundInterval: ReturnType<typeof setInterval> | null = null;
	private maxLinesPerTick = 100; // Limit work per background tick

	/**
	 * Initialize or update the measurer with the correct width method.
	 * Should be called when the renderer is available.
	 */
	initializeMeasurer(widthMethod: WidthMethod, initialWidth: number): void {
		if (this.measurer === null || this.currentWidthMethod !== widthMethod) {
			this.measurer?.destroy();
			this.measurer = new LineMeasurer(widthMethod, initialWidth);
			this.currentWidthMethod = widthMethod;
			this.currentContentWidth = initialWidth;
		}
	}

	/**
	 * Update the wrap width for measurement.
	 */
	setWrapWidth(width: number): void {
		this.currentContentWidth = width;
		this.measurer?.setWrapWidth(width);
	}

	/**
	 * Update the lineWrap setting for proactive measurement.
	 */
	setLineWrap(lineWrap: boolean): void {
		this.currentLineWrap = lineWrap;
	}

	/**
	 * Register tool sources for proactive background measurement.
	 * Call this from App.tsx with the tools array.
	 */
	registerToolSources(sources: ToolLogSource[]): void {
		this.toolSources = sources;
	}

	/**
	 * Start proactive background measurement.
	 * Measures new lines for all tools incrementally.
	 */
	startBackgroundMeasurement(intervalMs = 200): void {
		if (this.backgroundInterval !== null) return;

		this.backgroundInterval = setInterval(() => {
			this.measurePendingLines();
		}, intervalMs);
	}

	/**
	 * Stop background measurement.
	 */
	stopBackgroundMeasurement(): void {
		if (this.backgroundInterval !== null) {
			clearInterval(this.backgroundInterval);
			this.backgroundInterval = null;
		}
	}

	/**
	 * Measure pending lines for all registered tools.
	 * Called by background interval and also on-demand.
	 */
	private measurePendingLines(): void {
		if (!this.measurer) return;

		const contentWidth = this.currentContentWidth;
		const lineWrap = this.currentLineWrap;

		let linesProcessed = 0;

		for (const source of this.toolSources) {
			if (linesProcessed >= this.maxLinesPerTick) break;

			const lines = source.getLines();
			const key = this.getCacheKey(source.name, contentWidth, lineWrap);
			const existing = this.caches.get(key);

			if (existing && existing.lastLineCount >= lines.length) {
				// Already up to date
				continue;
			}

			const startIdx = existing?.lastLineCount ?? 0;
			const endIdx = Math.min(
				lines.length,
				startIdx + (this.maxLinesPerTick - linesProcessed),
			);
			const newLines = lines.slice(startIdx, endIdx);

			if (newLines.length === 0) continue;

			// Extend or create cache
			if (existing) {
				const extendedCache = this.extendCache(
					existing.cache,
					newLines,
					contentWidth,
					lineWrap,
				);
				this.caches.set(key, {
					cache: extendedCache,
					lastLineCount: existing.lastLineCount + newLines.length,
				});
			} else {
				const newCache = this.buildCache(newLines, contentWidth, lineWrap);
				this.caches.set(key, {
					cache: newCache,
					lastLineCount: newLines.length,
				});
			}

			linesProcessed += newLines.length;
		}
	}

	/**
	 * Get a cache key for a tool.
	 */
	private getCacheKey(
		toolName: string,
		contentWidth: number,
		lineWrap: boolean,
	): string {
		return `${toolName}:${contentWidth}:${lineWrap}`;
	}

	/**
	 * Get or create a cache for a tool's logs.
	 * Returns the existing cache if valid, or builds/extends it as needed.
	 */
	getOrBuildCache(
		toolName: string,
		logLines: string[],
		contentWidth: number,
		lineWrap: boolean,
	): LineHeightCache {
		const key = this.getCacheKey(toolName, contentWidth, lineWrap);
		const existing = this.caches.get(key);
		const totalLines = logLines.length;

		// Ensure measurer has correct width
		this.measurer?.setWrapWidth(contentWidth);

		// Check if existing cache is still valid
		if (existing && existing.lastLineCount <= totalLines) {
			// Cache exists and can be extended if needed
			if (existing.lastLineCount === totalLines) {
				// Cache is up to date
				return existing.cache;
			}

			// Extend the cache with new lines
			const newLines = logLines.slice(existing.lastLineCount);
			const extendedCache = this.extendCache(
				existing.cache,
				newLines,
				contentWidth,
				lineWrap,
			);

			this.caches.set(key, {
				cache: extendedCache,
				lastLineCount: totalLines,
			});
			return extendedCache;
		}

		// Build cache from scratch
		const newCache = this.buildCache(logLines, contentWidth, lineWrap);
		this.caches.set(key, {
			cache: newCache,
			lastLineCount: totalLines,
		});
		return newCache;
	}

	/**
	 * Build a cache from scratch.
	 */
	private buildCache(
		lines: string[],
		contentWidth: number,
		lineWrap: boolean,
	): LineHeightCache {
		let cumulativeRows: number[];

		if (lineWrap && this.measurer) {
			// Use LineMeasurer for precise measurement
			cumulativeRows = this.measurer.buildCumulativeRowCache(lines);
		} else {
			// Without wrap, each line is exactly 1 row
			cumulativeRows = lines.map((_, i) => i + 1);
		}

		return { cumulativeRows, contentWidth, lineWrap };
	}

	/**
	 * Extend an existing cache with new lines.
	 */
	private extendCache(
		existingCache: LineHeightCache,
		newLines: string[],
		contentWidth: number,
		lineWrap: boolean,
	): LineHeightCache {
		if (newLines.length === 0) return existingCache;

		let newCumulativeRows: number[];

		if (lineWrap && this.measurer) {
			// Use LineMeasurer for precise measurement
			newCumulativeRows = this.measurer.extendCumulativeRowCache(
				existingCache.cumulativeRows,
				newLines,
			);
		} else {
			// Without wrap, each line is exactly 1 row
			const lastValue =
				existingCache.cumulativeRows.length > 0
					? (existingCache.cumulativeRows[
							existingCache.cumulativeRows.length - 1
						] ?? 0)
					: 0;
			newCumulativeRows = [
				...existingCache.cumulativeRows,
				...newLines.map((_, i) => lastValue + i + 1),
			];
		}

		return {
			cumulativeRows: newCumulativeRows,
			contentWidth,
			lineWrap,
		};
	}

	/**
	 * Invalidate caches for a specific tool (e.g., when logs are cleared).
	 */
	invalidateTool(toolName: string): void {
		// Remove all caches for this tool (any width/wrap combination)
		for (const key of this.caches.keys()) {
			if (key.startsWith(`${toolName}:`)) {
				this.caches.delete(key);
			}
		}
	}

	/**
	 * Clear all caches.
	 */
	clear(): void {
		this.caches.clear();
	}

	/**
	 * Clean up resources.
	 */
	destroy(): void {
		this.caches.clear();
		this.measurer?.destroy();
		this.measurer = null;
	}
}

// Export singleton instance
export const lineHeightCacheStore = new LineHeightCacheStore();
