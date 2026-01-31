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
			const { config, warnings } = await loadConfig(configPath);
			expect(warnings).toHaveLength(0);
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
			const { config, warnings } = await loadConfig(configPath);
			expect(warnings).toHaveLength(0);
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
			const { config, warnings } = await loadConfig(configPath);
			expect(warnings).toHaveLength(0);
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

	test("loadConfig - invalid titleFont returns warning", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[home]
enabled = true
titleFont = "invalid-font"

[[tools]]
name = "test"
command = "echo"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const { config, warnings } = await loadConfig(configPath);
			// Should parse successfully with warning
			expect(config.tools).toHaveLength(1);
			expect(config.home?.enabled).toBe(true);
			// titleFont should not be set (invalid value ignored)
			expect(config.home?.titleFont).toBeUndefined();
			// Should have one warning about invalid titleFont
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("titleFont");
			expect(warnings[0]).toContain("invalid-font");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - invalid sidebarPosition returns warning", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[ui]
sidebarPosition = "center"

[[tools]]
name = "test"
command = "echo"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const { config, warnings } = await loadConfig(configPath);
			expect(config.tools).toHaveLength(1);
			// sidebarPosition should not be set (invalid value ignored)
			expect(config.ui?.sidebarPosition).toBeUndefined();
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("sidebarPosition");
			expect(warnings[0]).toContain("center");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - invalid port returns warning", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[mcp]
enabled = true
port = 99999

[[tools]]
name = "test"
command = "echo"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const { config, warnings } = await loadConfig(configPath);
			expect(config.tools).toHaveLength(1);
			expect(config.mcp?.enabled).toBe(true);
			// port should not be set (invalid value ignored)
			expect(config.mcp?.port).toBeUndefined();
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("port");
			expect(warnings[0]).toContain("99999");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - multiple invalid values return multiple warnings", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[home]
enabled = "yes"
titleFont = "bad-font"

[ui]
sidebarPosition = "middle"
widthThreshold = -50

[[tools]]
name = "test"
command = "echo"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const { config, warnings } = await loadConfig(configPath);
			expect(config.tools).toHaveLength(1);
			// All invalid values should be ignored
			expect(config.home?.enabled).toBeUndefined();
			expect(config.home?.titleFont).toBeUndefined();
			expect(config.ui?.sidebarPosition).toBeUndefined();
			expect(config.ui?.widthThreshold).toBeUndefined();
			// Should have 4 warnings
			expect(warnings).toHaveLength(4);
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	test("loadConfig - wrong type returns warning", async () => {
		const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
		const configContent = `
[ui]
maxLogLines = "not-a-number"

[[tools]]
name = "test"
command = "echo"
		`.trim();

		await writeFile(configPath, configContent);

		try {
			const { config, warnings } = await loadConfig(configPath);
			expect(config.tools).toHaveLength(1);
			expect(config.ui?.maxLogLines).toBeUndefined();
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("maxLogLines");
			expect(warnings[0]).toContain("integer");
		} finally {
			await unlink(configPath).catch(() => {});
		}
	});

	// Process config tests
	describe("process config", () => {
		test("loadConfig - valid processes config with cleanupOrphans true", async () => {
			const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
			const configContent = `
[processes]
cleanupOrphans = true

[[tools]]
name = "test"
command = "echo"
			`.trim();

			await writeFile(configPath, configContent);

			try {
				const { config, warnings } = await loadConfig(configPath);
				expect(warnings).toHaveLength(0);
				expect(config.processes?.cleanupOrphans).toBe(true);
			} finally {
				await unlink(configPath).catch(() => {});
			}
		});

		test("loadConfig - valid processes config with cleanupOrphans false", async () => {
			const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
			const configContent = `
[processes]
cleanupOrphans = false

[[tools]]
name = "test"
command = "echo"
			`.trim();

			await writeFile(configPath, configContent);

			try {
				const { config, warnings } = await loadConfig(configPath);
				expect(warnings).toHaveLength(0);
				expect(config.processes?.cleanupOrphans).toBe(false);
			} finally {
				await unlink(configPath).catch(() => {});
			}
		});

		test("loadConfig - invalid cleanupOrphans type returns warning", async () => {
			const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
			const configContent = `
[processes]
cleanupOrphans = "yes"

[[tools]]
name = "test"
command = "echo"
			`.trim();

			await writeFile(configPath, configContent);

			try {
				const { config, warnings } = await loadConfig(configPath);
				expect(config.tools).toHaveLength(1);
				// cleanupOrphans should not be set (invalid value ignored)
				expect(config.processes?.cleanupOrphans).toBeUndefined();
				expect(warnings).toHaveLength(1);
				expect(warnings[0]).toContain("cleanupOrphans");
				expect(warnings[0]).toContain("boolean");
			} finally {
				await unlink(configPath).catch(() => {});
			}
		});

		test("loadConfig - unknown processes option returns warning", async () => {
			const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
			const configContent = `
[processes]
cleanupOrphans = true
unknownOption = "test"

[[tools]]
name = "test"
command = "echo"
			`.trim();

			await writeFile(configPath, configContent);

			try {
				const { config, warnings } = await loadConfig(configPath);
				expect(config.tools).toHaveLength(1);
				expect(config.processes?.cleanupOrphans).toBe(true);
				expect(warnings).toHaveLength(1);
				expect(warnings[0]).toContain("processes");
				expect(warnings[0]).toContain("unknownOption");
			} finally {
				await unlink(configPath).catch(() => {});
			}
		});

		test("loadConfig - no processes section means undefined (defaults apply)", async () => {
			const configPath = join(tempDir, `test-config-${Date.now()}.toml`);
			const configContent = `
[[tools]]
name = "test"
command = "echo"
			`.trim();

			await writeFile(configPath, configContent);

			try {
				const { config, warnings } = await loadConfig(configPath);
				expect(warnings).toHaveLength(0);
				expect(config.processes).toBeUndefined();
			} finally {
				await unlink(configPath).catch(() => {});
			}
		});
	});
});
