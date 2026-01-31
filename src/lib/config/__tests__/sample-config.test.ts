import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseToml } from "@iarna/toml";

/**
 * These are the expected keys for each config section.
 * Derived from the TypeScript interfaces in types.ts and src/types.ts.
 *
 * When adding new config options:
 * 1. Add the key to the appropriate array below
 * 2. Add the option to src/sample-config-full.toml with documentation
 *
 * Note: sample-config.toml is the minimal version for `corsa init`
 *       sample-config-full.toml is the comprehensive documentation version
 */

// From src/lib/config/types.ts - Config interface
const CONFIG_KEYS = ["tools", "home", "mcp", "processes", "ui"] as const;

// From src/lib/config/types.ts - HomeConfig interface
const HOME_CONFIG_KEYS = [
	"enabled",
	"title",
	"titleFont",
	"titleAlign",
] as const;

// From src/lib/config/types.ts - McpConfig interface
const MCP_CONFIG_KEYS = ["enabled", "port"] as const;

// From src/lib/config/types.ts - ProcessConfig interface
const PROCESS_CONFIG_KEYS = ["cleanupOrphans"] as const;

// From src/lib/config/types.ts - Config.ui interface
const UI_CONFIG_KEYS = [
	"sidebarPosition",
	"horizontalTabPosition",
	"widthThreshold",
	"theme",
	"maxLogLines",
	"showTabNumbers",
	"showLineNumbers",
] as const;

// From src/types.ts - ToolConfig interface
const TOOL_CONFIG_KEYS = [
	"name",
	"command",
	"args",
	"cwd",
	"env",
	"cleanup",
	"description",
	"healthCheck",
	"ui",
	"dependsOn",
] as const;

// From src/types.ts - ToolHealthCheck interface
const TOOL_HEALTH_CHECK_KEYS = ["url", "interval", "retries"] as const;

// From src/types.ts - ToolUI interface
const TOOL_UI_KEYS = ["label", "url"] as const;

describe("Sample config validation", () => {
	let sampleConfig: Record<string, unknown>;

	// Load sample config once before tests
	test("sample config parses successfully", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		sampleConfig = parseToml(content) as Record<string, unknown>;

		expect(sampleConfig).toBeDefined();
		expect(typeof sampleConfig).toBe("object");
	});

	test("sample config has all top-level sections", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const topLevelKeys = Object.keys(config);

		// Check all expected keys are present
		for (const key of CONFIG_KEYS) {
			expect(topLevelKeys).toContain(key);
		}

		// Check no extra keys exist
		for (const key of topLevelKeys) {
			expect(CONFIG_KEYS).toContain(key as (typeof CONFIG_KEYS)[number]);
		}
	});

	test("sample config [home] section has all and only valid keys", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const home = config.home as Record<string, unknown>;
		const homeKeys = Object.keys(home);

		// Check all expected keys are present
		for (const key of HOME_CONFIG_KEYS) {
			expect(homeKeys).toContain(key);
		}

		// Check no extra keys exist
		for (const key of homeKeys) {
			expect(HOME_CONFIG_KEYS).toContain(
				key as (typeof HOME_CONFIG_KEYS)[number],
			);
		}
	});

	test("sample config [mcp] section has all and only valid keys", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const mcp = config.mcp as Record<string, unknown>;
		const mcpKeys = Object.keys(mcp);

		// Check all expected keys are present
		for (const key of MCP_CONFIG_KEYS) {
			expect(mcpKeys).toContain(key);
		}

		// Check no extra keys exist
		for (const key of mcpKeys) {
			expect(MCP_CONFIG_KEYS).toContain(
				key as (typeof MCP_CONFIG_KEYS)[number],
			);
		}
	});

	test("sample config [processes] section has all and only valid keys", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const processes = config.processes as Record<string, unknown>;
		const processesKeys = Object.keys(processes);

		// Check all expected keys are present
		for (const key of PROCESS_CONFIG_KEYS) {
			expect(processesKeys).toContain(key);
		}

		// Check no extra keys exist
		for (const key of processesKeys) {
			expect(PROCESS_CONFIG_KEYS).toContain(
				key as (typeof PROCESS_CONFIG_KEYS)[number],
			);
		}
	});

	test("sample config [ui] section has all and only valid keys", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const ui = config.ui as Record<string, unknown>;
		const uiKeys = Object.keys(ui);

		// Check all expected keys are present
		for (const key of UI_CONFIG_KEYS) {
			expect(uiKeys).toContain(key);
		}

		// Check no extra keys exist
		for (const key of uiKeys) {
			expect(UI_CONFIG_KEYS).toContain(key as (typeof UI_CONFIG_KEYS)[number]);
		}
	});

	test("sample config [[tools]] has all tool config keys demonstrated", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const tools = config.tools as Record<string, unknown>[];
		expect(tools.length).toBeGreaterThan(0);

		// Collect all keys used across all tools
		const usedKeys = new Set<string>();
		for (const tool of tools) {
			for (const key of Object.keys(tool)) {
				usedKeys.add(key);
			}
		}

		// Check all expected keys are demonstrated in at least one tool
		for (const key of TOOL_CONFIG_KEYS) {
			expect(usedKeys.has(key)).toBe(true);
		}

		// Check no extra keys exist
		for (const key of usedKeys) {
			expect(TOOL_CONFIG_KEYS).toContain(
				key as (typeof TOOL_CONFIG_KEYS)[number],
			);
		}
	});

	test("sample config [tools.healthCheck] has all and only valid keys", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const tools = config.tools as Record<string, unknown>[];

		// Find a tool with healthCheck
		const toolWithHealthCheck = tools.find((t) => t.healthCheck);
		expect(toolWithHealthCheck).toBeDefined();

		if (!toolWithHealthCheck)
			throw new Error("Expected tool with healthCheck to exist");
		const healthCheck = toolWithHealthCheck.healthCheck as Record<
			string,
			unknown
		>;
		const healthCheckKeys = Object.keys(healthCheck);

		// Check all expected keys are present
		for (const key of TOOL_HEALTH_CHECK_KEYS) {
			expect(healthCheckKeys).toContain(key);
		}

		// Check no extra keys exist
		for (const key of healthCheckKeys) {
			expect(TOOL_HEALTH_CHECK_KEYS).toContain(
				key as (typeof TOOL_HEALTH_CHECK_KEYS)[number],
			);
		}
	});

	test("sample config [tools.ui] has all and only valid keys", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const tools = config.tools as Record<string, unknown>[];

		// Find a tool with ui (not the env one)
		const toolWithUI = tools.find(
			(t) => t.ui && typeof t.ui === "object" && "label" in (t.ui as object),
		);
		expect(toolWithUI).toBeDefined();

		if (!toolWithUI) throw new Error("Expected tool with UI to exist");
		const ui = toolWithUI.ui as Record<string, unknown>;
		const uiKeys = Object.keys(ui);

		// Check all expected keys are present
		for (const key of TOOL_UI_KEYS) {
			expect(uiKeys).toContain(key);
		}

		// Check no extra keys exist
		for (const key of uiKeys) {
			expect(TOOL_UI_KEYS).toContain(key as (typeof TOOL_UI_KEYS)[number]);
		}
	});

	test("sample config tools have only valid keys", async () => {
		const samplePath = join(
			import.meta.dir,
			"..",
			"..",
			"..",
			"sample-config-full.toml",
		);
		const content = await readFile(samplePath, "utf-8");
		const config = parseToml(content) as Record<string, unknown>;

		const tools = config.tools as Record<string, unknown>[];

		// Check each tool has only valid keys
		for (const tool of tools) {
			for (const key of Object.keys(tool)) {
				expect(TOOL_CONFIG_KEYS).toContain(
					key as (typeof TOOL_CONFIG_KEYS)[number],
				);
			}
		}
	});
});
