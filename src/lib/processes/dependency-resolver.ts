import type { ToolConfig } from "../../types";

/**
 * Result of resolving dependencies.
 * Tools are grouped into levels where all tools in a level can start in parallel.
 * Level 0 has no dependencies, level 1 depends only on level 0, etc.
 */
export interface DependencyResolution {
	/** Tools grouped by level (0 = no deps, 1 = deps on level 0, etc.) */
	levels: ToolConfig[][];
	/** Map from tool name to its level */
	levelMap: Map<string, number>;
}

/**
 * Resolve tool dependencies and group into startup levels.
 * Tools in the same level can start in parallel.
 * Returns tools grouped by their dependency level.
 *
 * @param tools - Array of tool configurations
 * @returns DependencyResolution with tools grouped into levels
 */
export function resolveDependencies(tools: ToolConfig[]): DependencyResolution {
	const toolMap = new Map(tools.map((t) => [t.name, t]));
	const toolNames = new Set(tools.map((t) => t.name));
	const levelMap = new Map<string, number>();
	const levels: ToolConfig[][] = [];

	// Calculate level for each tool using memoized recursion
	function getLevel(name: string, visited: Set<string> = new Set()): number {
		// Check cache
		const cached = levelMap.get(name);
		if (cached !== undefined) return cached;

		// Prevent infinite recursion (should not happen if cycle detection ran)
		if (visited.has(name)) return 0;
		visited.add(name);

		const tool = toolMap.get(name);
		if (!tool) return 0;

		// If no dependencies, level is 0
		if (!tool.dependsOn || tool.dependsOn.length === 0) {
			levelMap.set(name, 0);
			return 0;
		}

		// Level is max of all dependency levels + 1
		let maxDepLevel = -1;
		for (const dep of tool.dependsOn) {
			// Skip invalid dependencies and self-references
			if (!toolNames.has(dep) || dep === name) continue;
			const depLevel = getLevel(dep, new Set(visited));
			maxDepLevel = Math.max(maxDepLevel, depLevel);
		}

		const level = maxDepLevel + 1;
		levelMap.set(name, level);
		return level;
	}

	// Calculate levels for all tools
	for (const tool of tools) {
		getLevel(tool.name);
	}

	// Group tools by level
	for (const tool of tools) {
		const level = levelMap.get(tool.name) ?? 0;
		while (levels.length <= level) {
			levels.push([]);
		}
		levels[level]?.push(tool);
	}

	return { levels, levelMap };
}

/**
 * Get valid dependencies for a tool (filters out invalid/missing references).
 */
export function getValidDependencies(
	tool: ToolConfig,
	toolNames: Set<string>,
): string[] {
	if (!tool.dependsOn) return [];
	return tool.dependsOn.filter(
		(dep) => toolNames.has(dep) && dep !== tool.name,
	);
}
