import { useCallback, useRef, useSyncExternalStore } from "react";
import type { ProcessManager } from "../lib/processes";
import type { ToolState } from "../types";

interface ToolSummary {
	name: string;
	status: string;
	logVersion: number;
}

interface ToolsListSnapshot {
	tools: ToolState[];
	summaries: ToolSummary[];
}

/**
 * Create a summary for change detection.
 */
function createSummaries(tools: ToolState[]): ToolSummary[] {
	return tools.map((t) => ({
		name: t.config.name,
		status: t.status,
		logVersion: t.logVersion,
	}));
}

/**
 * Check if summaries have changed.
 */
function hasChanges(current: ToolSummary[], last: ToolSummary[]): boolean {
	if (current.length !== last.length) return true;
	for (let i = 0; i < current.length; i++) {
		const curr = current[i];
		const prev = last[i];
		if (
			curr?.name !== prev?.name ||
			curr?.status !== prev?.status ||
			curr?.logVersion !== prev?.logVersion
		) {
			return true;
		}
	}
	return false;
}

/**
 * Hook that subscribes to changes in the tools list using event-driven updates.
 * Only triggers re-renders when:
 * - Number of tools changes
 * - Tool status changes (for TabBar indicators)
 * - Tool logVersion changes (for log updates including replacements)
 *
 * @param processManager - The process manager instance
 * @returns The current tools array
 */
export function useToolsList(processManager: ProcessManager): ToolState[] {
	// Initialize with spread to create new array reference
	const initialTools = processManager.getTools();
	const snapshotRef = useRef<ToolsListSnapshot>({
		tools: [...initialTools],
		summaries: createSummaries(initialTools),
	});
	const listenersRef = useRef(new Set<() => void>());
	const unsubscribeRef = useRef<(() => void) | null>(null);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			listenersRef.current.add(onStoreChange);

			// Subscribe to ProcessManager on first listener
			if (unsubscribeRef.current === null) {
				unsubscribeRef.current = processManager.subscribe("all", () => {
					const currentTools = processManager.getTools();
					const currentSummaries = createSummaries(currentTools);
					const lastSummaries = snapshotRef.current.summaries;

					// Only update if something actually changed
					if (hasChanges(currentSummaries, lastSummaries)) {
						// Create new array reference so useSyncExternalStore detects the change
						snapshotRef.current = {
							tools: [...currentTools],
							summaries: currentSummaries,
						};
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
		[processManager],
	);

	const getSnapshot = useCallback(() => snapshotRef.current.tools, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
