import type { ToolConfig } from "../../types";

export interface Config {
	tools: ToolConfig[];
	ui?: {
		/** Sidebar position for wide terminals: "left" or "right". Default: "left" */
		sidebarPosition?: "left" | "right";
		/** Tab bar position for narrow terminals: "top" or "bottom". Default: "top" */
		horizontalTabPosition?: "top" | "bottom";
		/** Terminal width threshold for switching between vertical and horizontal tabs. Default: 100 */
		widthThreshold?: number;
		/**
		 * Theme name. Options:
		 * - "default", "dracula", "nord", "onedark", "solarized", "gruvbox", "catppuccin" - Built-in themes
		 * - "terminal" - Automatically detect colors from your terminal (supports Ghostty, iTerm2, Kitty, and other xterm-compatible terminals)
		 * Default: "default"
		 */
		theme?: string;
		/** Maximum number of log lines to keep in memory per tool. Default: 10000 */
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
