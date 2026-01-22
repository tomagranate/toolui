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

export interface LogLine {
	segments: TextSegment[];
	isStderr?: boolean; // Whether this line came from stderr
}

export interface ToolState {
	config: ToolConfig;
	process: ReturnType<typeof Bun.spawn> | null;
	logs: LogLine[]; // Array of log lines with metadata
	status: "running" | "stopped" | "error" | "shuttingDown";
	exitCode: number | null;
	pid?: number; // Process ID for persistence
	startTime?: number; // Unix timestamp when process started
}
