/**
 * CLI argument parser for toolui.
 *
 * Supports:
 *   --config <path>, -c <path>  Custom config file path
 *   --help, -h                  Show help text
 *   --version, -v               Show version
 *   init                        Initialize a new config file
 *   mcp                         Start the MCP server
 */

// Import version at build time so it gets bundled into the compiled binary
import packageJson from "../package.json";

export interface CliArgs {
	/** Subcommand to run (init, mcp) */
	command?: "init" | "mcp";
	/** Path to config file (--config/-c) */
	configPath?: string;
	/** Whether to show help (--help/-h) */
	showHelp: boolean;
	/** Whether to show version (--version/-v) */
	showVersion: boolean;
}

/**
 * Parse command line arguments.
 */
export function parseArgs(argv: string[] = process.argv.slice(2)): CliArgs {
	const args: CliArgs = {
		showHelp: false,
		showVersion: false,
	};

	let i = 0;
	while (i < argv.length) {
		const arg = argv[i];

		if (arg === "--help" || arg === "-h") {
			args.showHelp = true;
			i++;
		} else if (arg === "--version" || arg === "-v") {
			args.showVersion = true;
			i++;
		} else if (arg === "--config" || arg === "-c") {
			const nextArg = argv[i + 1];
			if (!nextArg || nextArg.startsWith("-")) {
				console.error("Error: --config requires a path argument");
				process.exit(1);
			}
			args.configPath = nextArg;
			i += 2;
		} else if (arg === "init") {
			args.command = "init";
			i++;
		} else if (arg === "mcp") {
			args.command = "mcp";
			i++;
		} else if (arg?.startsWith("-")) {
			console.error(`Error: Unknown option: ${arg}`);
			console.error("Run 'toolui --help' for usage information.");
			process.exit(1);
		} else {
			// Unknown positional argument
			console.error(`Error: Unknown command: ${arg}`);
			console.error("Run 'toolui --help' for usage information.");
			process.exit(1);
		}
	}

	return args;
}

/**
 * Get the help text for the CLI.
 */
export function getHelpText(): string {
	return `
toolui - Terminal UI for managing local development processes

Usage:
  toolui [options]              Start the TUI dashboard
  toolui init                   Create a sample config file in the current directory
  toolui mcp                    Start the MCP server for AI agent integration

Options:
  -c, --config <path>           Path to config file (default: toolui.config.toml)
  -h, --help                    Show this help message
  -v, --version                 Show version information

Examples:
  toolui                        Start with default config
  toolui -c myconfig.toml       Start with custom config file
  toolui init                   Create toolui.config.toml in current directory
  toolui mcp                    Start MCP server (configure in your IDE)

Documentation: https://github.com/tomagranate/toolui
`.trim();
}

/**
 * Get the version string from package.json.
 * The version is embedded at build time via the import at the top of this file.
 */
export function getVersion(): string {
	return packageJson.version || "unknown";
}
