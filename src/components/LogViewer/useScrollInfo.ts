import type { ScrollBoxRenderable } from "@opentui/core";
import { useCallback, useRef, useSyncExternalStore } from "react";

export interface ScrollData {
	scrollTop: number;
	viewportHeight: number;
	contentHeight: number;
}

const DEFAULT_SCROLL_DATA: ScrollData = {
	scrollTop: 0,
	viewportHeight: 0,
	contentHeight: 0,
};

/** Threshold for detecting scroll changes (avoids floating-point jitter) */
const CHANGE_THRESHOLD = 0.5;

/**
 * Hook that polls a scrollbox for scroll position changes.
 * Uses useSyncExternalStore to only trigger re-renders when data actually changes.
 *
 * @param scrollboxRef - Ref to the scrollbox renderable
 * @param pollInterval - How often to check for changes (default 100ms)
 * @returns Current scroll data (scrollTop, viewportHeight, contentHeight)
 */
export function useScrollInfo(
	scrollboxRef: React.RefObject<ScrollBoxRenderable | null>,
	pollInterval = 100,
): ScrollData {
	// Store the current data in a ref (doesn't trigger re-renders)
	const dataRef = useRef<ScrollData>(DEFAULT_SCROLL_DATA);
	const listenersRef = useRef(new Set<() => void>());
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// Store scrollboxRef in a ref to avoid subscribe dependency changes
	const scrollboxRefRef = useRef(scrollboxRef);
	scrollboxRefRef.current = scrollboxRef;

	// Subscribe function for useSyncExternalStore
	// Note: empty deps because we use refs for mutable values
	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			listenersRef.current.add(onStoreChange);

			// Only start one interval, even if multiple subscribers
			if (intervalRef.current === null) {
				intervalRef.current = setInterval(() => {
					const scrollbox = scrollboxRefRef.current.current;
					if (!scrollbox) return;

					// Round values to avoid floating-point jitter
					const newScrollTop = Math.round(scrollbox.scrollTop);
					const newViewportHeight = Math.round(scrollbox.viewport.height);
					const newContentHeight = Math.round(scrollbox.scrollHeight);

					// Only notify if data changed significantly
					const current = dataRef.current;
					const scrollChanged =
						Math.abs(newScrollTop - current.scrollTop) >= CHANGE_THRESHOLD;
					const viewportChanged =
						Math.abs(newViewportHeight - current.viewportHeight) >=
						CHANGE_THRESHOLD;
					const contentChanged =
						Math.abs(newContentHeight - current.contentHeight) >=
						CHANGE_THRESHOLD;

					if (scrollChanged || viewportChanged || contentChanged) {
						// Create new object reference so useSyncExternalStore detects change
						dataRef.current = {
							scrollTop: newScrollTop,
							viewportHeight: newViewportHeight,
							contentHeight: newContentHeight,
						};
						// Notify all listeners
						for (const listener of listenersRef.current) {
							listener();
						}
					}
				}, pollInterval);
			}

			return () => {
				listenersRef.current.delete(onStoreChange);

				// Stop interval when no more subscribers
				if (listenersRef.current.size === 0 && intervalRef.current !== null) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			};
		},
		[pollInterval],
	);

	// Snapshot function - returns the current data
	const getSnapshot = useCallback(() => dataRef.current, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
