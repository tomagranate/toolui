import { useCallback, useRef, useSyncExternalStore } from "react";
import type { ProcessManager } from "../lib/processes";
import type { ToolState } from "../types";

interface ToolSummary {
	name: string;
	status: string;
	logsLength: number;
}

interface ToolsListSnapshot {
	tools: ToolState[];
	summaries: ToolSummary[];
}

/**
 * Hook that subscribes to changes in the tools list.
 * Only triggers re-renders when:
 * - Number of tools changes
 * - Tool status changes (for TabBar indicators)
 * - Tool logs.length changes (for TabBar indicators)
 *
 * @param processManager - The process manager instance
 * @param pollInterval - How often to check for changes (default 100ms)
 * @returns The current tools array
 */
export function useToolsList(
	processManager: ProcessManager,
	pollInterval = 100,
): ToolState[] {
	// Initialize with spread to create new array reference
	const initialTools = processManager.getTools();
	const snapshotRef = useRef<ToolsListSnapshot>({
		tools: [...initialTools],
		summaries: initialTools.map((t) => ({
			name: t.config.name,
			status: t.status,
			logsLength: t.logs.length,
		})),
	});
	const listenersRef = useRef(new Set<() => void>());
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			listenersRef.current.add(onStoreChange);

			if (intervalRef.current === null) {
				intervalRef.current = setInterval(() => {
					const currentTools = processManager.getTools();
					const currentSummaries = currentTools.map((t) => ({
						name: t.config.name,
						status: t.status,
						logsLength: t.logs.length,
					}));

					const lastSummaries = snapshotRef.current.summaries;

					// Check if anything changed
					let hasChanged = currentSummaries.length !== lastSummaries.length;
					if (!hasChanged) {
						for (let i = 0; i < currentSummaries.length; i++) {
							const curr = currentSummaries[i];
							const last = lastSummaries[i];
							if (
								curr?.name !== last?.name ||
								curr?.status !== last?.status ||
								curr?.logsLength !== last?.logsLength
							) {
								hasChanged = true;
								break;
							}
						}
					}

					if (hasChanged) {
						// IMPORTANT: Create new array reference so useSyncExternalStore detects the change
						// processManager.getTools() may return the same array reference with mutated contents
						snapshotRef.current = {
							tools: [...currentTools],
							summaries: currentSummaries,
						};
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
		[processManager, pollInterval],
	);

	const getSnapshot = useCallback(() => snapshotRef.current.tools, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
