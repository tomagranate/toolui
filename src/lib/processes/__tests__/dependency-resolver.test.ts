import { describe, expect, test } from "bun:test";
import type { ToolConfig } from "../../../types";
import { detectCircularDependencies } from "../../config/config";
import {
	getValidDependencies,
	resolveDependencies,
} from "../dependency-resolver";

describe("resolveDependencies", () => {
	test("tools with no dependencies are in level 0", () => {
		const tools: ToolConfig[] = [
			{ name: "a", command: "echo a" },
			{ name: "b", command: "echo b" },
			{ name: "c", command: "echo c" },
		];

		const result = resolveDependencies(tools);

		expect(result.levels.length).toBe(1);
		expect(result.levels[0]?.length).toBe(3);
		expect(result.levelMap.get("a")).toBe(0);
		expect(result.levelMap.get("b")).toBe(0);
		expect(result.levelMap.get("c")).toBe(0);
	});

	test("simple dependency chain creates multiple levels", () => {
		const tools: ToolConfig[] = [
			{ name: "database", command: "start-db" },
			{ name: "api", command: "start-api", dependsOn: ["database"] },
			{ name: "frontend", command: "start-fe", dependsOn: ["api"] },
		];

		const result = resolveDependencies(tools);

		expect(result.levels.length).toBe(3);
		expect(result.levels[0]?.map((t) => t.name)).toEqual(["database"]);
		expect(result.levels[1]?.map((t) => t.name)).toEqual(["api"]);
		expect(result.levels[2]?.map((t) => t.name)).toEqual(["frontend"]);
		expect(result.levelMap.get("database")).toBe(0);
		expect(result.levelMap.get("api")).toBe(1);
		expect(result.levelMap.get("frontend")).toBe(2);
	});

	test("multiple dependencies at same level", () => {
		const tools: ToolConfig[] = [
			{ name: "database", command: "start-db" },
			{ name: "cache", command: "start-cache" },
			{ name: "api", command: "start-api", dependsOn: ["database", "cache"] },
		];

		const result = resolveDependencies(tools);

		expect(result.levels.length).toBe(2);
		expect(result.levels[0]?.map((t) => t.name).sort()).toEqual([
			"cache",
			"database",
		]);
		expect(result.levels[1]?.map((t) => t.name)).toEqual(["api"]);
	});

	test("diamond dependency pattern", () => {
		// A -> B -> D
		// A -> C -> D
		const tools: ToolConfig[] = [
			{ name: "A", command: "a" },
			{ name: "B", command: "b", dependsOn: ["A"] },
			{ name: "C", command: "c", dependsOn: ["A"] },
			{ name: "D", command: "d", dependsOn: ["B", "C"] },
		];

		const result = resolveDependencies(tools);

		expect(result.levels.length).toBe(3);
		expect(result.levels[0]?.map((t) => t.name)).toEqual(["A"]);
		expect(result.levels[1]?.map((t) => t.name).sort()).toEqual(["B", "C"]);
		expect(result.levels[2]?.map((t) => t.name)).toEqual(["D"]);
	});

	test("ignores invalid dependency references", () => {
		const tools: ToolConfig[] = [
			{ name: "api", command: "start-api", dependsOn: ["nonexistent"] },
		];

		const result = resolveDependencies(tools);

		// Should be level 0 since the dependency doesn't exist
		expect(result.levels.length).toBe(1);
		expect(result.levelMap.get("api")).toBe(0);
	});

	test("ignores self-references", () => {
		const tools: ToolConfig[] = [
			{ name: "api", command: "start-api", dependsOn: ["api"] },
		];

		const result = resolveDependencies(tools);

		expect(result.levels.length).toBe(1);
		expect(result.levelMap.get("api")).toBe(0);
	});
});

describe("getValidDependencies", () => {
	test("returns empty array for tool with no dependencies", () => {
		const tool: ToolConfig = { name: "api", command: "start" };
		const toolNames = new Set(["api", "database"]);

		expect(getValidDependencies(tool, toolNames)).toEqual([]);
	});

	test("filters out invalid references", () => {
		const tool: ToolConfig = {
			name: "api",
			command: "start",
			dependsOn: ["database", "nonexistent", "cache"],
		};
		const toolNames = new Set(["api", "database"]);

		expect(getValidDependencies(tool, toolNames)).toEqual(["database"]);
	});

	test("filters out self-references", () => {
		const tool: ToolConfig = {
			name: "api",
			command: "start",
			dependsOn: ["api", "database"],
		};
		const toolNames = new Set(["api", "database"]);

		expect(getValidDependencies(tool, toolNames)).toEqual(["database"]);
	});
});

describe("detectCircularDependencies", () => {
	test("returns null for no circular dependencies", () => {
		const tools: ToolConfig[] = [
			{ name: "database", command: "start-db" },
			{ name: "api", command: "start-api", dependsOn: ["database"] },
			{ name: "frontend", command: "start-fe", dependsOn: ["api"] },
		];

		expect(detectCircularDependencies(tools)).toBeNull();
	});

	test("detects simple circular dependency (A -> B -> A)", () => {
		const tools: ToolConfig[] = [
			{ name: "A", command: "a", dependsOn: ["B"] },
			{ name: "B", command: "b", dependsOn: ["A"] },
		];

		const cycle = detectCircularDependencies(tools);
		expect(cycle).not.toBeNull();
		expect(cycle?.length).toBe(2);
	});

	test("detects longer circular dependency (A -> B -> C -> A)", () => {
		const tools: ToolConfig[] = [
			{ name: "A", command: "a", dependsOn: ["B"] },
			{ name: "B", command: "b", dependsOn: ["C"] },
			{ name: "C", command: "c", dependsOn: ["A"] },
		];

		const cycle = detectCircularDependencies(tools);
		expect(cycle).not.toBeNull();
		expect(cycle?.length).toBe(3);
	});

	test("detects self-referencing cycle", () => {
		// Self-references are detected as cycles by the algorithm
		// (though they're also warned about and ignored in config validation)
		const tools: ToolConfig[] = [{ name: "A", command: "a", dependsOn: ["A"] }];

		const cycle = detectCircularDependencies(tools);
		// Self-reference is detected as a cycle containing just the self-referencing node
		expect(cycle).not.toBeNull();
		expect(cycle).toEqual(["A"]);
	});

	test("handles independent cycles", () => {
		const tools: ToolConfig[] = [
			{ name: "A", command: "a", dependsOn: ["B"] },
			{ name: "B", command: "b", dependsOn: ["A"] },
			{ name: "C", command: "c" },
		];

		const cycle = detectCircularDependencies(tools);
		expect(cycle).not.toBeNull();
	});

	test("handles no dependencies", () => {
		const tools: ToolConfig[] = [
			{ name: "A", command: "a" },
			{ name: "B", command: "b" },
		];

		expect(detectCircularDependencies(tools)).toBeNull();
	});

	test("handles empty tools array", () => {
		expect(detectCircularDependencies([])).toBeNull();
	});
});
