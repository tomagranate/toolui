import type { ToolConfig } from "../../types";

/** ASCII font options for the home tab title */
export type ASCIIFontName =
	| "tiny"
	| "block"
	| "shade"
	| "slick"
	| "huge"
	| "grid"
	| "pallet";

/** Home tab configuration */
export interface HomeConfig {
	/** Whether the home tab is enabled. Default: false */
	enabled?: boolean;
	/** Title text displayed in ASCII art. Default: "Home" */
	title?: string;
	/** ASCII font for the title. Default: "tiny" */
	titleFont?: ASCIIFontName;
	/** Alignment of the title. Default: "left" */
	titleAlign?: "left" | "center";
}

/** MCP (Model Context Protocol) API configuration */
export interface McpConfig {
	/** Enable the HTTP API for MCP server integration. Default: false */
	enabled?: boolean;
	/** Port for the HTTP API server. Default: 18765 */
	port?: number;
}

/** Process management configuration */
export interface ProcessConfig {
	/**
	 * Whether to cleanup orphaned processes from previous sessions on startup.
	 * When true (default), corsa will kill any processes that were started by
	 * a previous instance of corsa (using the same config file) that crashed
	 * or was terminated without proper cleanup.
	 *
	 * Set to false if you want to manage process lifecycle manually or if you're
	 * running multiple corsa instances that might share process names.
	 *
	 * Default: true
	 */
	cleanupOrphans?: boolean;
}

export interface Config {
	tools: ToolConfig[];
	/** Home tab configuration */
	home?: HomeConfig;
	/** MCP API configuration for AI agent integration */
	mcp?: McpConfig;
	/** Process management configuration */
	processes?: ProcessConfig;
	ui?: {
		/** Sidebar position for wide terminals: "left" or "right". Default: "left" */
		sidebarPosition?: "left" | "right";
		/** Tab bar position for narrow terminals: "top" or "bottom". Default: "top" */
		horizontalTabPosition?: "top" | "bottom";
		/** Terminal width threshold for switching between vertical and horizontal tabs. Default: 100 */
		widthThreshold?: number;
		/**
		 * Theme name. Options:
		 * - "default" (Moss), "mist", "cappuccino", "synthwave" - Built-in themes
		 * - "terminal" - Automatically detect colors from your terminal (supports Ghostty, iTerm2, Kitty, and other xterm-compatible terminals)
		 * Default: "default"
		 */
		theme?: string;
		/** Maximum number of log lines to keep in memory per tool. Default: 100000 */
		maxLogLines?: number;
		/** Show shortcut numbers (1-9) on the first 9 tabs. Default: false */
		showTabNumbers?: boolean;
		/**
		 * Show line numbers in log viewer.
		 * - true: Always show line numbers
		 * - false: Never show line numbers
		 * - "auto": Show line numbers when terminal width >= 80 (default)
		 */
		showLineNumbers?: boolean | "auto";
	};
}
