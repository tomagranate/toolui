import { readFile } from "node:fs/promises";
import { parse as parseToml } from "@iarna/toml";
import type { Config } from "./types";

export async function loadConfig(
	path: string = "toolui.config.toml",
): Promise<Config> {
	try {
		const content = await readFile(path, "utf-8");
		const config = parseToml(content) as unknown as Config;

		// Validate config
		if (!config.tools || !Array.isArray(config.tools)) {
			throw new Error("Config must have a 'tools' array");
		}

		for (const tool of config.tools) {
			if (!tool.name || !tool.command) {
				throw new Error("Each tool must have 'name' and 'command'");
			}
		}

		return config;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to load config: ${error.message}`);
		}
		throw error;
	}
}
