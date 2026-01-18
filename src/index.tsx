import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App";
import { ProcessManager } from "./process-manager";
import { loadConfig } from "./utils/config";
import { getTerminalTheme, getTheme, type Theme } from "./utils/themes";

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

		// Resolve theme before creating renderer
		// This is important for "terminal" theme which uses OSC queries
		// that must happen before the renderer puts stdin in raw mode
		let resolvedTheme: Theme;
		if (config.ui?.theme === "terminal") {
			const terminalTheme = await getTerminalTheme();
			if (terminalTheme) {
				resolvedTheme = terminalTheme;
			} else {
				// Fall back to default theme if terminal detection fails
				console.error(
					"Warning: Could not detect terminal theme, falling back to default",
				);
				resolvedTheme = getTheme("default");
			}
		} else {
			resolvedTheme = getTheme(config.ui?.theme);
		}

		// Initialize process manager
		const maxLogLines = config.ui?.maxLogLines ?? 10000;
		const processManager = new ProcessManager(maxLogLines);
		const initialTools = await processManager.initialize(config.tools);

		// Create renderer and render app
		// Disable built-in Ctrl-C/signal handling - we manage shutdown ourselves
		const renderer = await createCliRenderer({
			exitOnCtrlC: false, // Don't destroy on Ctrl-C keypress
			exitSignals: [], // Don't register any signal handlers
		});
		const root = createRoot(renderer);
		root.render(
			<App
				processManager={processManager}
				initialTools={initialTools}
				renderer={renderer}
				config={config}
				theme={resolvedTheme}
			/>,
		);

		// Set up cleanup on exit
		let isCleaningUp = false;
		const cleanup = async () => {
			if (isCleaningUp) return;
			isCleaningUp = true;

			try {
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
