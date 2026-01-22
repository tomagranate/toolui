import { describe, expect, test } from "bun:test";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../config";

describe("Config loading", () => {
	const tempDir = tmpdir();

	test("loadConfig - valid config", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[[tools]]
name = "test-tool"
command = "echo"
args = ["hello"]
cwd = "."
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const config = await loadConfig(configPath);
			expect(config.tools).toHaveLength(1);
			expect(config.tools[0]?.name).toBe("test-tool");
			expect(config.tools[0]?.command).toBe("echo");
			expect(config.tools[0]?.args).toEqual(["hello"]);
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - multiple tools", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[[tools]]
name = "tool1"
command = "echo"

[[tools]]
name = "tool2"
command = "ls"
args = ["-la"]
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const config = await loadConfig(configPath);
			expect(config.tools).toHaveLength(2);
			expect(config.tools[0]?.name).toBe("tool1");
			expect(config.tools[1]?.name).toBe("tool2");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - with UI options", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[ui]
sidebarPosition = "right"
widthThreshold = 120
theme = "synthwave"

[[tools]]
name = "test"
command = "echo"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const config = await loadConfig(configPath);
			expect(config.ui?.sidebarPosition).toBe("right");
			expect(config.ui?.widthThreshold).toBe(120);
			expect(config.ui?.theme).toBe("synthwave");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - missing tools array", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `[ui]\nwidthThreshold = 100`;

		await writeFile(configPath, configContent);

		try {
			await expect(loadConfig(configPath)).rejects.toThrow("tools");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - tool missing name", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[[tools]]
command = "echo"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			await expect(loadConfig(configPath)).rejects.toThrow("name");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - tool missing command", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[[tools]]
name = "test"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			await expect(loadConfig(configPath)).rejects.toThrow("command");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - non-existent file", async () => {
		await expect(loadConfig("/nonexistent/file.toml")).rejects.toThrow();
	});
});
