import * as os from "node:os";
import * as path from "node:path";
import type { TerminalColors } from "./terminal-colors";

/**
 * Parsed Ghostty configuration with color information.
 */
export interface GhosttyConfig {
	theme?: string;
	background?: string;
	foreground?: string;
	palette: (string | undefined)[];
}

/**
 * Parses a Ghostty config file content.
 * Format: key = value (one per line, # for comments)
 */
function parseGhosttyConfigContent(content: string): GhosttyConfig {
	const config: GhosttyConfig = {
		palette: new Array(16).fill(undefined),
	};

	const lines = content.split("\n");

	for (const line of lines) {
		// Skip comments and empty lines
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		// Parse key = value
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) {
			continue;
		}

		const key = trimmed.substring(0, eqIndex).trim();
		const value = trimmed.substring(eqIndex + 1).trim();

		switch (key) {
			case "theme":
				config.theme = value;
				break;
			case "background":
				config.background = normalizeColor(value);
				break;
			case "foreground":
				config.foreground = normalizeColor(value);
				break;
			case "palette": {
				// Format: palette = N=#RRGGBB or palette = N=colorname
				const paletteMatch = value.match(/^(\d+)=(.+)$/);
				if (paletteMatch?.[1] && paletteMatch[2]) {
					const index = Number.parseInt(paletteMatch[1], 10);
					const color = paletteMatch[2];
					if (index >= 0 && index < 16) {
						config.palette[index] = normalizeColor(color);
					}
				}
				break;
			}
		}
	}

	return config;
}

/**
 * Normalizes a color value to a hex string.
 * Handles hex colors (with or without #) and basic named colors.
 */
function normalizeColor(value: string): string {
	// If it's already a hex color with #, return as-is
	if (value.startsWith("#")) {
		return value.toLowerCase();
	}

	// If it's a hex color without #
	if (/^[0-9a-fA-F]{6}$/.test(value)) {
		return `#${value.toLowerCase()}`;
	}

	// If it starts with 0x (some formats use this)
	if (value.startsWith("0x")) {
		return `#${value.slice(2).toLowerCase()}`;
	}

	// Otherwise return as-is (could be a named color)
	return value.toLowerCase();
}

/**
 * Gets the paths where Ghostty config files might be located.
 */
function getGhosttyConfigPaths(): string[] {
	const home = os.homedir();
	const paths: string[] = [];

	// XDG config path
	const xdgConfigHome = process.env.XDG_CONFIG_HOME;
	if (xdgConfigHome) {
		paths.push(path.join(xdgConfigHome, "ghostty", "config"));
	}

	// Default XDG path
	paths.push(path.join(home, ".config", "ghostty", "config"));

	// macOS Application Support path
	if (process.platform === "darwin") {
		paths.push(
			path.join(
				home,
				"Library",
				"Application Support",
				"com.mitchellh.ghostty",
				"config",
			),
		);
	}

	return paths;
}

/**
 * Gets the paths where Ghostty theme files might be located.
 */
function getGhosttyThemePaths(themeName: string): string[] {
	const home = os.homedir();
	const paths: string[] = [];

	// XDG config theme path
	const xdgConfigHome = process.env.XDG_CONFIG_HOME;
	if (xdgConfigHome) {
		paths.push(path.join(xdgConfigHome, "ghostty", "themes", themeName));
	}

	// Default XDG theme path
	paths.push(path.join(home, ".config", "ghostty", "themes", themeName));

	// System-wide themes (common locations)
	paths.push(path.join("/usr", "share", "ghostty", "themes", themeName));
	paths.push(
		path.join("/usr", "local", "share", "ghostty", "themes", themeName),
	);

	// macOS-specific paths
	if (process.platform === "darwin") {
		// Homebrew
		paths.push(
			path.join("/opt", "homebrew", "share", "ghostty", "themes", themeName),
		);
		// App bundle (where built-in themes are stored)
		paths.push(
			path.join(
				"/Applications",
				"Ghostty.app",
				"Contents",
				"Resources",
				"ghostty",
				"themes",
				themeName,
			),
		);
	}

	return paths;
}

/**
 * Reads a file if it exists, returns undefined otherwise.
 */
async function readFileIfExists(filePath: string): Promise<string | undefined> {
	try {
		return await Bun.file(filePath).text();
	} catch {
		return undefined;
	}
}

/**
 * Loads a Ghostty theme file by name.
 */
async function loadGhosttyTheme(
	themeName: string,
): Promise<GhosttyConfig | undefined> {
	const themePaths = getGhosttyThemePaths(themeName);

	for (const themePath of themePaths) {
		const content = await readFileIfExists(themePath);
		if (content) {
			return parseGhosttyConfigContent(content);
		}
	}

	return undefined;
}

/**
 * Reads and parses the Ghostty configuration.
 * If a theme is specified, also loads and merges the theme file.
 *
 * @returns The merged configuration or undefined if no config found
 */
export async function readGhosttyConfig(): Promise<GhosttyConfig | undefined> {
	const configPaths = getGhosttyConfigPaths();

	let baseConfig: GhosttyConfig | undefined;

	// Try each config path
	for (const configPath of configPaths) {
		const content = await readFileIfExists(configPath);
		if (content) {
			baseConfig = parseGhosttyConfigContent(content);
			break;
		}
	}

	if (!baseConfig) {
		return undefined;
	}

	// If a theme is specified, load and merge it
	if (baseConfig.theme) {
		// Handle dark:X,light:Y format - just use the dark theme
		let themeName = baseConfig.theme;
		if (themeName.includes(",")) {
			const parts = themeName.split(",");
			for (const part of parts) {
				if (part.startsWith("dark:")) {
					themeName = part.substring(5);
					break;
				}
			}
			// If no dark: prefix found, just use the first one
			if (themeName.includes(",") && parts[0]) {
				themeName = parts[0].replace(/^(dark|light):/, "");
			}
		}

		const themeConfig = await loadGhosttyTheme(themeName);
		if (themeConfig) {
			// Theme values are defaults, config values override
			return mergeConfigs(themeConfig, baseConfig);
		}
	}

	return baseConfig;
}

/**
 * Merges two Ghostty configs, with the second one taking precedence.
 */
function mergeConfigs(
	base: GhosttyConfig,
	override: GhosttyConfig,
): GhosttyConfig {
	const merged: GhosttyConfig = {
		theme: override.theme ?? base.theme,
		background: override.background ?? base.background,
		foreground: override.foreground ?? base.foreground,
		palette: [...base.palette],
	};

	// Merge palette - override values take precedence
	for (let i = 0; i < 16; i++) {
		if (override.palette[i] !== undefined) {
			merged.palette[i] = override.palette[i];
		}
	}

	return merged;
}

/**
 * Converts a GhosttyConfig to TerminalColors format.
 */
export function ghosttyConfigToTerminalColors(
	config: GhosttyConfig,
): TerminalColors {
	return {
		foreground: config.foreground,
		background: config.background,
		palette: config.palette,
	};
}
