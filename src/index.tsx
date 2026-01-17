import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App";
import { ProcessManager } from "./process-manager";
import { loadConfig } from "./utils/config";

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

		// Initialize process manager
		const maxLogLines = config.ui?.maxLogLines ?? 10000;
		const processManager = new ProcessManager(maxLogLines);
		const initialTools = await processManager.initialize(config.tools);

		// Create renderer and render app
		const renderer = await createCliRenderer();
		const root = createRoot(renderer);
		root.render(
			<App
				processManager={processManager}
				initialTools={initialTools}
				renderer={renderer}
				config={config}
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
		// Note: SIGINT (Ctrl-C) is handled by the keyboard handler in App.tsx
		// when the renderer is in raw mode, so we don't need a SIGINT handler here
		process.on("SIGTERM", cleanup);

		// Start rendering
		await renderer.start();
	} catch (error) {
		console.error("Error starting toolui:", error);
		process.exit(1);
	}
}

main();
