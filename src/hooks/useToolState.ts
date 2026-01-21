import { useCallback, useRef, useSyncExternalStore } from "react";
import type { ProcessManager } from "../lib/processes";
import type { ToolState } from "../types";

/**
 * Hook that subscribes to a specific tool's state changes.
 * Uses useSyncExternalStore to only re-render when this specific tool changes.
 *
 * @param processManager - The process manager instance
 * @param toolIndex - Index of the tool to subscribe to
 * @param pollInterval - How often to check for changes (default 100ms)
 * @returns The current tool state, or undefined if index is invalid
 */
export function useToolState(
	processManager: ProcessManager,
	toolIndex: number,
	pollInterval = 100,
): ToolState | undefined {
	// Store current state in a ref
	const stateRef = useRef<ToolState | undefined>(
		processManager.getTool(toolIndex),
	);
	const listenersRef = useRef(new Set<() => void>());
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Track last known values for change detection
	const lastValuesRef = useRef<{
		logsLength: number;
		status: string;
		exitCode: number | null | undefined;
	}>({
		logsLength: stateRef.current?.logs.length ?? 0,
		status: stateRef.current?.status ?? "",
		exitCode: stateRef.current?.exitCode,
	});

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			listenersRef.current.add(onStoreChange);

			// Start polling if not already
			if (intervalRef.current === null) {
				intervalRef.current = setInterval(() => {
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
						tool.logs.length !== lastValues.logsLength ||
						tool.status !== lastValues.status ||
						tool.exitCode !== lastValues.exitCode;

					if (hasChanged) {
						// Update tracking values
						lastValuesRef.current = {
							logsLength: tool.logs.length,
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
				}, pollInterval);
			}

			return () => {
				listenersRef.current.delete(onStoreChange);
				if (listenersRef.current.size === 0 && intervalRef.current !== null) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			};
		},
		[processManager, toolIndex, pollInterval],
	);

	const getSnapshot = useCallback(() => stateRef.current, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
