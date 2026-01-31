/**
 * Init command - copies sample config to current working directory.
 */

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// Import sample config as text at bundle time - this embeds the content in the binary
import sampleConfigContent from "../sample-config.toml" with { type: "text" };

const CONFIG_FILENAME = "corsa.config.toml";

/**
 * Run the init command.
 * Writes the embedded sample config to the current working directory.
 */
export async function runInit(): Promise<void> {
	const targetPath = join(process.cwd(), CONFIG_FILENAME);

	// Check if config already exists
	if (existsSync(targetPath)) {
		console.error(
			`Error: ${CONFIG_FILENAME} already exists in current directory.`,
		);
		console.error("Remove or rename the existing file to create a new one.");
		process.exit(1);
	}

	try {
		await writeFile(targetPath, sampleConfigContent);
		console.log(`Created ${CONFIG_FILENAME}`);
		console.log("");
		console.log("Next steps:");
		console.log("  1. Edit the config file to add your tools");
		console.log("  2. Run 'corsa' to start the dashboard");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`Error creating config file: ${message}`);
		process.exit(1);
	}
}
