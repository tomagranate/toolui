export interface ToolConfig {
	name: string;
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
	cleanup?: string[];
}

export interface TextSegment {
	text: string;
	color?: string; // OpenTUI color (name or hex)
	attributes?: number; // TextAttributes flags (bold, dim, etc.)
}

export interface ToolState {
	config: ToolConfig;
	process: ReturnType<typeof Bun.spawn> | null;
	logs: TextSegment[][]; // Array of lines, each line is array of segments
	status: "running" | "stopped" | "error" | "shuttingDown";
	exitCode: number | null;
	pid?: number; // Process ID for persistence
	startTime?: number; // Unix timestamp when process started
}

export interface Config {
	tools: ToolConfig[];
	ui?: {
		/** Sidebar position for wide terminals: "left" or "right". Default: "left" */
		sidebarPosition?: "left" | "right";
		/** Tab bar position for narrow terminals: "top" or "bottom". Default: "top" */
		horizontalTabPosition?: "top" | "bottom";
		/** Terminal width threshold for switching between vertical and horizontal tabs. Default: 100 */
		widthThreshold?: number;
		/** Theme name. Options: "default", "dracula", "nord", "onedark", "solarized", "gruvbox", "catppuccin". Default: "default" */
		theme?: string;
		/** Maximum number of log lines to keep in memory per tool. Default: 10000 */
		maxLogLines?: number;
	};
}
