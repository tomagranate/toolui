import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App";
import { ApiServer, DEFAULT_MCP_PORT } from "./lib/api";
import { loadConfig } from "./lib/config";
import { loadPreferences, updatePreference } from "./lib/preferences";
import { ProcessManager } from "./lib/processes";
import {
	getTerminalTheme,
	getTheme,
	type Theme,
	ThemeProvider,
} from "./lib/theme";

async function main() {
	try {
		// Load configuration
		const configPath = process.argv[2] || "toolui.config.toml";
		const config = await loadConfig(configPath);

		if (config.tools.length === 0) {
			console.error(
				"No tools configured. Please add tools to your config file.",
			);
			process.exit(1);
		}

		// Load user preferences
		const preferences = loadPreferences();

		// Determine if theme is locked by config (config theme takes priority)
		const configLockedTheme = config.ui?.theme;

		// Load line wrap preference (default: true)
		const initialLineWrap = preferences.lineWrap ?? true;

		// Try to detect terminal theme early (OSC queries must happen before
		// renderer puts stdin in raw mode). Cache it for later use even if
		// user starts with a different theme.
		const detectedTerminalTheme = await getTerminalTheme();

		// Resolve theme with priority: config > preferences > default
		const resolveTheme = (themeName?: string): Theme => {
			if (themeName === "terminal") {
				if (detectedTerminalTheme) {
					return detectedTerminalTheme;
				}
				// Fall back to default theme if terminal detection fails
				console.error(
					"Warning: Could not detect terminal theme, falling back to default",
				);
				return getTheme("default");
			}
			return getTheme(themeName);
		};

		// Priority: config theme > saved preference > default
		const initialThemeKey = config.ui?.theme ?? preferences.theme ?? "default";
		const initialTheme = resolveTheme(initialThemeKey);

		// Initialize process manager
		const maxLogLines = config.ui?.maxLogLines ?? 10000;
		const processManager = new ProcessManager(maxLogLines);
		const initialTools = await processManager.initialize(config.tools);

		// Start MCP API server if enabled
		let apiServer: ApiServer | null = null;
		if (config.mcp?.enabled) {
			const port = config.mcp.port ?? DEFAULT_MCP_PORT;
			const apiToolIndex = processManager.createVirtualTool("MCP API");
			apiServer = new ApiServer(processManager, port, apiToolIndex);
			try {
				apiServer.start();
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				processManager.addLogToTool(
					apiToolIndex,
					`[ERROR] Failed to start MCP API server: ${message}`,
				);
			}
		}

		// Create renderer and render app
		// Disable built-in Ctrl-C/signal handling - we manage shutdown ourselves
		const renderer = await createCliRenderer({
			exitOnCtrlC: false, // Don't destroy on Ctrl-C keypress
			exitSignals: [], // Don't register any signal handlers
		});
		const root = createRoot(renderer);

		// Handle line wrap preference change
		const handleLineWrapChange = (lineWrap: boolean) => {
			updatePreference("lineWrap", lineWrap);
		};

		// Render app wrapped in ThemeProvider
		root.render(
			<ThemeProvider
				initialTheme={initialTheme}
				initialThemeKey={initialThemeKey}
				configLockedTheme={configLockedTheme}
				terminalTheme={detectedTerminalTheme}
			>
				<App
					processManager={processManager}
					initialTools={initialTools}
					renderer={renderer}
					config={config}
					initialLineWrap={initialLineWrap}
					onLineWrapChange={handleLineWrapChange}
				/>
			</ThemeProvider>,
		);

		// Set up cleanup on exit
		let isCleaningUp = false;
		const cleanup = async () => {
			if (isCleaningUp) return;
			isCleaningUp = true;

			try {
				// Stop MCP API server if running
				if (apiServer) {
					apiServer.stop();
				}
				// Trigger graceful shutdown through processManager
				// Don't stop renderer yet - let it show shutdown progress
				await processManager.cleanup();
				// Now stop and destroy the renderer
				renderer.stop();
				renderer.destroy();
			} catch {
				// Ignore cleanup errors, but ensure we exit
			}
			process.exit(0);
		};

		// Handle SIGTERM (external termination signal)
		process.on("SIGTERM", cleanup);

		// Handle SIGINT (Ctrl-C)
		// First Ctrl-C triggers graceful shutdown, second forces immediate exit
		let sigintCount = 0;
		process.on("SIGINT", async () => {
			sigintCount++;
			if (sigintCount === 1) {
				// First Ctrl-C: trigger graceful shutdown
				await cleanup();
			} else {
				// Second Ctrl-C during shutdown: force quit
				process.exit(1);
			}
		});

		// Start rendering
		await renderer.start();
	} catch (error) {
		console.error("Error starting toolui:", error);
		process.exit(1);
	}
}

main();
