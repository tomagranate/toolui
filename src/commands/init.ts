/**
 * Init command - copies sample config to current working directory.
 */

import { existsSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";

const CONFIG_FILENAME = "toolui.config.toml";

/**
 * Get the path to the sample config file bundled with toolui.
 */
function getSampleConfigPath(): string {
	// import.meta.dir is the directory containing this file (src/commands/)
	// The sample config is in src/sample-config.toml
	return join(import.meta.dir, "..", "sample-config.toml");
}

/**
 * Run the init command.
 * Copies the sample config to the current working directory.
 */
export async function runInit(): Promise<void> {
	const targetPath = join(process.cwd(), CONFIG_FILENAME);
	const samplePath = getSampleConfigPath();

	// Check if config already exists
	if (existsSync(targetPath)) {
		console.error(
			`Error: ${CONFIG_FILENAME} already exists in current directory.`,
		);
		console.error("Remove or rename the existing file to create a new one.");
		process.exit(1);
	}

	// Check if sample config exists
	if (!existsSync(samplePath)) {
		// If bundled sample doesn't exist, we might be in development
		// Try to find it relative to the source
		console.error("Error: Could not find sample config file.");
		console.error(`Expected at: ${samplePath}`);
		process.exit(1);
	}

	try {
		await copyFile(samplePath, targetPath);
		console.log(`Created ${CONFIG_FILENAME}`);
		console.log("");
		console.log("Next steps:");
		console.log("  1. Edit the config file to add your tools");
		console.log("  2. Run 'toolui' to start the dashboard");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error creating config file: ${message}`);
		process.exit(1);
	}
}
