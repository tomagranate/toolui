import { useCallback, useRef, useSyncExternalStore } from "react";
import type { ProcessManager } from "../lib/processes";
import type { ToolState } from "../types";

interface TrackedValues {
	logVersion: number;
	status: string;
	exitCode: number | null | undefined;
}

/**
 * Hook that subscribes to a specific tool's state changes using event-driven updates.
 * Uses useSyncExternalStore to only re-render when this specific tool changes.
 *
 * @param processManager - The process manager instance
 * @param toolIndex - Index of the tool to subscribe to
 * @returns The current tool state, or undefined if index is invalid
 */
export function useToolState(
	processManager: ProcessManager,
	toolIndex: number,
): ToolState | undefined {
	// Store current state in a ref
	const stateRef = useRef<ToolState | undefined>(
		processManager.getTool(toolIndex),
	);
	const listenersRef = useRef(new Set<() => void>());
	const unsubscribeRef = useRef<(() => void) | null>(null);

	// Track last known values for change detection
	const lastValuesRef = useRef<TrackedValues>({
		logVersion: stateRef.current?.logVersion ?? 0,
		status: stateRef.current?.status ?? "",
		exitCode: stateRef.current?.exitCode,
	});

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			listenersRef.current.add(onStoreChange);

			// Subscribe to ProcessManager for this specific tool on first listener
			if (unsubscribeRef.current === null) {
				unsubscribeRef.current = processManager.subscribe(toolIndex, () => {
					const tool = processManager.getTool(toolIndex);
					if (!tool) {
						if (stateRef.current !== undefined) {
							stateRef.current = undefined;
							for (const listener of listenersRef.current) {
								listener();
							}
						}
						return;
					}

					const lastValues = lastValuesRef.current;
					const hasChanged =
						tool.logVersion !== lastValues.logVersion ||
						tool.status !== lastValues.status ||
						tool.exitCode !== lastValues.exitCode;

					if (hasChanged) {
						// Update tracking values
						lastValuesRef.current = {
							logVersion: tool.logVersion,
							status: tool.status,
							exitCode: tool.exitCode,
						};
						// Update state ref
						stateRef.current = tool;
						// Notify listeners
						for (const listener of listenersRef.current) {
							listener();
						}
					}
				});
			}

			return () => {
				listenersRef.current.delete(onStoreChange);
				if (
					listenersRef.current.size === 0 &&
					unsubscribeRef.current !== null
				) {
					unsubscribeRef.current();
					unsubscribeRef.current = null;
				}
			};
		},
		[processManager, toolIndex],
	);

	const getSnapshot = useCallback(() => stateRef.current, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
