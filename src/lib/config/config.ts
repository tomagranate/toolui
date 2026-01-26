import { readFile } from "node:fs/promises";
import { parse as parseToml } from "@iarna/toml";
import type { ASCIIFontName, Config, HomeConfig, McpConfig } from "./types";

/** Valid ASCII font names for home tab title */
const VALID_FONTS: ASCIIFontName[] = [
	"tiny",
	"block",
	"shade",
	"slick",
	"huge",
	"grid",
	"pallet",
];

/** Valid sidebar positions */
const VALID_SIDEBAR_POSITIONS = ["left", "right"] as const;

/** Valid horizontal tab positions */
const VALID_HORIZONTAL_TAB_POSITIONS = ["top", "bottom"] as const;

/** Result of loading config - includes parsed config and any validation warnings */
export interface LoadConfigResult {
	config: Config;
	/** Validation warnings for invalid config values (non-fatal) */
	warnings: string[];
}

/**
 * Load and validate configuration from a TOML file.
 * Parses as much as possible, returning warnings for invalid values instead of throwing.
 * Only throws on fatal errors (file not found, invalid TOML syntax, missing required fields).
 */
export async function loadConfig(
	path: string = "toolui.config.toml",
): Promise<LoadConfigResult> {
	const warnings: string[] = [];

	try {
		const content = await readFile(path, "utf-8");
		const rawConfig = parseToml(content) as Record<string, unknown>;

		// Validate required fields - these are fatal errors
		if (!rawConfig.tools || !Array.isArray(rawConfig.tools)) {
			throw new Error("Config must have a 'tools' array");
		}

		const rawTools = rawConfig.tools as Array<Record<string, unknown>>;
		for (let i = 0; i < rawTools.length; i++) {
			const tool = rawTools[i];
			if (!tool?.name || !tool?.command) {
				throw new Error(
					`Tool at index ${i} must have 'name' and 'command' fields`,
				);
			}
		}

		// Validate and normalize home config
		const homeConfig = validateHomeConfig(
			rawConfig.home as Record<string, unknown> | undefined,
			warnings,
		);

		// Validate and normalize mcp config
		const mcpConfig = validateMcpConfig(
			rawConfig.mcp as Record<string, unknown> | undefined,
			warnings,
		);

		// Validate and normalize ui config
		const uiConfig = validateUiConfig(
			rawConfig.ui as Record<string, unknown> | undefined,
			warnings,
		);

		// Build the validated config
		const config: Config = {
			tools: rawTools as unknown as Config["tools"],
			...(homeConfig && { home: homeConfig }),
			...(mcpConfig && { mcp: mcpConfig }),
			...(uiConfig && { ui: uiConfig }),
		};

		// Validate depends_on references and check for circular dependencies
		validateDependsOn(config.tools, warnings);

		return { config, warnings };
	} catch (error) {
		if (error instanceof Error) {
			// Check for file not found error
			const nodeError = error as NodeJS.ErrnoException;
			if (nodeError.code === "ENOENT") {
				throw new Error(
					`Config file not found: ${path}\n` +
						`  Create a config file or specify a different path with -c <path>`,
				);
			}
			throw new Error(`Failed to load config: ${error.message}`);
		}
		throw error;
	}
}

/**
 * Validate home config section, collecting warnings for invalid values
 */
/** Known keys for home config section */
const HOME_CONFIG_KEYS = ["enabled", "title", "titleFont", "titleAlign"];

function validateHomeConfig(
	raw: Record<string, unknown> | undefined,
	warnings: string[],
): HomeConfig | undefined {
	if (!raw) return undefined;

	// Warn about unknown keys
	for (const key of Object.keys(raw)) {
		if (!HOME_CONFIG_KEYS.includes(key)) {
			warnings.push(`[home] Unknown option '${key}' - ignoring`);
		}
	}

	const result: HomeConfig = {};

	if (typeof raw.enabled === "boolean") {
		result.enabled = raw.enabled;
	} else if (raw.enabled !== undefined) {
		warnings.push(
			`[home] 'enabled' must be a boolean, got ${typeof raw.enabled}. Using default: false`,
		);
	}

	if (typeof raw.title === "string") {
		result.title = raw.title;
	} else if (raw.title !== undefined) {
		warnings.push(
			`[home] 'title' must be a string, got ${typeof raw.title}. Using default: "Home"`,
		);
	}

	if (typeof raw.titleFont === "string") {
		if (VALID_FONTS.includes(raw.titleFont as ASCIIFontName)) {
			result.titleFont = raw.titleFont as ASCIIFontName;
		} else {
			warnings.push(
				`[home] 'titleFont' must be one of: ${VALID_FONTS.join(", ")}. Got "${raw.titleFont}". Using default: "tiny"`,
			);
		}
	} else if (raw.titleFont !== undefined) {
		warnings.push(
			`[home] 'titleFont' must be a string, got ${typeof raw.titleFont}. Using default: "tiny"`,
		);
	}

	if (typeof raw.titleAlign === "string") {
		if (raw.titleAlign === "left" || raw.titleAlign === "center") {
			result.titleAlign = raw.titleAlign;
		} else {
			warnings.push(
				`[home] 'titleAlign' must be "left" or "center". Got "${raw.titleAlign}". Using default: "left"`,
			);
		}
	} else if (raw.titleAlign !== undefined) {
		warnings.push(
			`[home] 'titleAlign' must be a string, got ${typeof raw.titleAlign}. Using default: "left"`,
		);
	}

	return result;
}

/** Known keys for mcp config section */
const MCP_CONFIG_KEYS = ["enabled", "port"];

/**
 * Validate mcp config section, collecting warnings for invalid values
 */
function validateMcpConfig(
	raw: Record<string, unknown> | undefined,
	warnings: string[],
): McpConfig | undefined {
	if (!raw) return undefined;

	// Warn about unknown keys
	for (const key of Object.keys(raw)) {
		if (!MCP_CONFIG_KEYS.includes(key)) {
			warnings.push(`[mcp] Unknown option '${key}' - ignoring`);
		}
	}

	const result: McpConfig = {};

	if (typeof raw.enabled === "boolean") {
		result.enabled = raw.enabled;
	} else if (raw.enabled !== undefined) {
		warnings.push(
			`[mcp] 'enabled' must be a boolean, got ${typeof raw.enabled}. Using default: false`,
		);
	}

	if (typeof raw.port === "number" && Number.isInteger(raw.port)) {
		if (raw.port > 0 && raw.port <= 65535) {
			result.port = raw.port;
		} else {
			warnings.push(
				`[mcp] 'port' must be between 1 and 65535, got ${raw.port}. Using default: 18765`,
			);
		}
	} else if (raw.port !== undefined) {
		warnings.push(
			`[mcp] 'port' must be an integer, got ${typeof raw.port}. Using default: 18765`,
		);
	}

	return result;
}

/** Known keys for ui config section */
const UI_CONFIG_KEYS = [
	"sidebarPosition",
	"horizontalTabPosition",
	"widthThreshold",
	"theme",
	"maxLogLines",
	"showTabNumbers",
	"showLineNumbers",
];

/**
 * Validate ui config section, collecting warnings for invalid values
 */
function validateUiConfig(
	raw: Record<string, unknown> | undefined,
	warnings: string[],
): Config["ui"] | undefined {
	if (!raw) return undefined;

	// Warn about unknown keys
	for (const key of Object.keys(raw)) {
		if (!UI_CONFIG_KEYS.includes(key)) {
			warnings.push(`[ui] Unknown option '${key}' - ignoring`);
		}
	}

	const result: NonNullable<Config["ui"]> = {};

	// sidebarPosition
	if (typeof raw.sidebarPosition === "string") {
		if (
			VALID_SIDEBAR_POSITIONS.includes(
				raw.sidebarPosition as (typeof VALID_SIDEBAR_POSITIONS)[number],
			)
		) {
			result.sidebarPosition =
				raw.sidebarPosition as (typeof VALID_SIDEBAR_POSITIONS)[number];
		} else {
			warnings.push(
				`[ui] 'sidebarPosition' must be "left" or "right", got "${raw.sidebarPosition}". Using default: "left"`,
			);
		}
	} else if (raw.sidebarPosition !== undefined) {
		warnings.push(
			`[ui] 'sidebarPosition' must be a string, got ${typeof raw.sidebarPosition}. Using default: "left"`,
		);
	}

	// horizontalTabPosition
	if (typeof raw.horizontalTabPosition === "string") {
		if (
			VALID_HORIZONTAL_TAB_POSITIONS.includes(
				raw.horizontalTabPosition as (typeof VALID_HORIZONTAL_TAB_POSITIONS)[number],
			)
		) {
			result.horizontalTabPosition =
				raw.horizontalTabPosition as (typeof VALID_HORIZONTAL_TAB_POSITIONS)[number];
		} else {
			warnings.push(
				`[ui] 'horizontalTabPosition' must be "top" or "bottom", got "${raw.horizontalTabPosition}". Using default: "top"`,
			);
		}
	} else if (raw.horizontalTabPosition !== undefined) {
		warnings.push(
			`[ui] 'horizontalTabPosition' must be a string, got ${typeof raw.horizontalTabPosition}. Using default: "top"`,
		);
	}

	// widthThreshold
	if (typeof raw.widthThreshold === "number") {
		if (raw.widthThreshold > 0) {
			result.widthThreshold = raw.widthThreshold;
		} else {
			warnings.push(
				`[ui] 'widthThreshold' must be positive, got ${raw.widthThreshold}. Using default: 100`,
			);
		}
	} else if (raw.widthThreshold !== undefined) {
		warnings.push(
			`[ui] 'widthThreshold' must be a number, got ${typeof raw.widthThreshold}. Using default: 100`,
		);
	}

	// theme (string, any value accepted - validation happens at render time)
	if (typeof raw.theme === "string") {
		result.theme = raw.theme;
	} else if (raw.theme !== undefined) {
		warnings.push(
			`[ui] 'theme' must be a string, got ${typeof raw.theme}. Using default: "default"`,
		);
	}

	// maxLogLines
	if (
		typeof raw.maxLogLines === "number" &&
		Number.isInteger(raw.maxLogLines)
	) {
		if (raw.maxLogLines > 0) {
			result.maxLogLines = raw.maxLogLines;
		} else {
			warnings.push(
				`[ui] 'maxLogLines' must be positive, got ${raw.maxLogLines}. Using default: 10000`,
			);
		}
	} else if (raw.maxLogLines !== undefined) {
		warnings.push(
			`[ui] 'maxLogLines' must be an integer, got ${typeof raw.maxLogLines}. Using default: 10000`,
		);
	}

	// showTabNumbers
	if (typeof raw.showTabNumbers === "boolean") {
		result.showTabNumbers = raw.showTabNumbers;
	} else if (raw.showTabNumbers !== undefined) {
		warnings.push(
			`[ui] 'showTabNumbers' must be a boolean, got ${typeof raw.showTabNumbers}. Using default: false`,
		);
	}

	// showLineNumbers
	if (
		typeof raw.showLineNumbers === "boolean" ||
		raw.showLineNumbers === "auto"
	) {
		result.showLineNumbers = raw.showLineNumbers;
	} else if (raw.showLineNumbers !== undefined) {
		warnings.push(
			`[ui] 'showLineNumbers' must be true, false, or "auto", got ${typeof raw.showLineNumbers === "string" ? `"${raw.showLineNumbers}"` : typeof raw.showLineNumbers}. Using default: "auto"`,
		);
	}

	return result;
}

/**
 * Validate depends_on references and detect circular dependencies.
 * Adds warnings for invalid references, throws for circular dependencies.
 */
function validateDependsOn(tools: Config["tools"], warnings: string[]): void {
	const toolNames = new Set(tools.map((t) => t.name));

	// Check for invalid references
	for (const tool of tools) {
		if (!tool.dependsOn || tool.dependsOn.length === 0) continue;

		for (const dep of tool.dependsOn) {
			if (!toolNames.has(dep)) {
				warnings.push(
					`[tools.${tool.name}] dependsOn references unknown tool '${dep}' - ignoring`,
				);
			}
			if (dep === tool.name) {
				warnings.push(
					`[tools.${tool.name}] dependsOn references itself - ignoring`,
				);
			}
		}
	}

	// Check for circular dependencies
	const cycle = detectCircularDependencies(tools);
	if (cycle) {
		throw new Error(
			`Circular dependency detected: ${cycle.join(" -> ")} -> ${cycle[0]}`,
		);
	}
}

/**
 * Detect circular dependencies using DFS.
 * Returns the cycle path if found, null otherwise.
 */
export function detectCircularDependencies(
	tools: Config["tools"],
): string[] | null {
	const toolMap = new Map(tools.map((t) => [t.name, t]));
	const visited = new Set<string>();
	const recursionStack = new Set<string>();
	const path: string[] = [];

	function dfs(name: string): string[] | null {
		visited.add(name);
		recursionStack.add(name);
		path.push(name);

		const tool = toolMap.get(name);
		if (tool?.dependsOn) {
			for (const dep of tool.dependsOn) {
				// Skip invalid references (already warned about)
				if (!toolMap.has(dep)) continue;

				if (!visited.has(dep)) {
					const cycle = dfs(dep);
					if (cycle) return cycle;
				} else if (recursionStack.has(dep)) {
					// Found a cycle - return the cycle portion of the path
					const cycleStart = path.indexOf(dep);
					return path.slice(cycleStart);
				}
			}
		}

		path.pop();
		recursionStack.delete(name);
		return null;
	}

	for (const tool of tools) {
		if (!visited.has(tool.name)) {
			const cycle = dfs(tool.name);
			if (cycle) return cycle;
		}
	}

	return null;
}
