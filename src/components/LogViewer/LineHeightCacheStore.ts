import { calculateLineRows, type LineHeightCache } from "./log-viewer-utils";

interface CacheEntry {
	cache: LineHeightCache;
	lastLineCount: number;
}

/**
 * Global store for line height caches that persists across component mounts.
 * This allows caches to be reused when switching between tabs, avoiding
 * recalculation of line heights for wrapped lines.
 *
 * Uses a fast measurement path based on getVisibleWidth() which calculates
 * line heights by counting characters and accounting for wide Unicode chars.
 * This is fast enough (~50ms for 100k lines) that no background pre-calculation
 * is needed.
 */
class LineHeightCacheStore {
	private caches = new Map<string, CacheEntry>();

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
	 * Build a cache from scratch using the fast path (calculateLineRows).
	 */
	private buildCache(
		lines: string[],
		contentWidth: number,
		lineWrap: boolean,
	): LineHeightCache {
		const cumulativeRows: number[] = new Array(lines.length);
		let total = 0;

		for (let i = 0; i < lines.length; i++) {
			total += calculateLineRows(lines[i] ?? "", contentWidth, lineWrap);
			cumulativeRows[i] = total;
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

		const lastValue =
			existingCache.cumulativeRows.length > 0
				? (existingCache.cumulativeRows[
						existingCache.cumulativeRows.length - 1
					] ?? 0)
				: 0;

		const newCumulativeRows = [...existingCache.cumulativeRows];
		let total = lastValue;
		for (const line of newLines) {
			total += calculateLineRows(line, contentWidth, lineWrap);
			newCumulativeRows.push(total);
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
}

// Export singleton instance
export const lineHeightCacheStore = new LineHeightCacheStore();
