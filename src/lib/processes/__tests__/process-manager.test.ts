import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ToolConfig } from "../../../types";
import { deletePidFile } from "../pid-file";
import { ProcessManager } from "../process-manager";

/**
 * Helper to wait for a process to exit by polling status.
 * More reliable than arbitrary setTimeout.
 */
async function waitForProcessExit(
	manager: ProcessManager,
	toolIndex: number,
	timeoutMs: number = 2000,
): Promise<void> {
	const startTime = Date.now();
	while (Date.now() - startTime < timeoutMs) {
		const tool = manager.getTool(toolIndex);
		if (
			!tool?.process ||
			tool.status === "stopped" ||
			tool.status === "error"
		) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

describe("ProcessManager", () => {
	let processManager: ProcessManager;

	beforeEach(async () => {
		processManager = new ProcessManager(100); // Small maxLogLines for testing
		await deletePidFile(); // Clean up PID file
	});

	afterEach(async () => {
		// Clean up any running processes
		try {
			await processManager.cleanup();
		} catch {
			// Ignore cleanup errors in tests
		}
		await deletePidFile(); // Clean up PID file
	});

	test("initialize - creates tool states", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test1",
				command: "echo",
				args: ["hello"],
			},
			{
				name: "test2",
				command: "echo",
				args: ["world"],
			},
		];

		const tools = await processManager.initialize(configs);
		expect(tools).toHaveLength(2);
		expect(tools[0]?.config.name).toBe("test1");
		expect(tools[1]?.config.name).toBe("test2");
		expect(tools[0]?.status).toBe("stopped");
		expect(tools[1]?.status).toBe("stopped");
	});

	test("getTools - returns tool states", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
			},
		];

		await processManager.initialize(configs);
		const tools = processManager.getTools();

		expect(tools).toHaveLength(1);
		expect(tools[0]?.config.name).toBe("test");
	});

	test("getTool - returns specific tool", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test1",
				command: "echo",
			},
			{
				name: "test2",
				command: "ls",
			},
		];

		await processManager.initialize(configs);
		const tool = processManager.getTool(1);

		expect(tool).toBeDefined();
		expect(tool?.config.name).toBe("test2");
	});

	test("getTool - returns undefined for invalid index", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
			},
		];

		await processManager.initialize(configs);
		expect(processManager.getTool(999)).toBeUndefined();
	});

	test("startTool - starts a process", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
				args: ["hello"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);

		const tool = processManager.getTool(0);
		expect(tool?.status).toBe("running");
		expect(tool?.process).not.toBeNull();
		expect(tool?.pid).toBeDefined();
		if (tool?.pid) {
			expect(tool.pid).toBeGreaterThan(0);
		}
	});

	test("startTool - does not start if already running", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "sleep",
				args: ["10"], // Long-running process
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);

		const firstPid = processManager.getTool(0)?.pid;
		expect(firstPid).toBeDefined();
		expect(firstPid).toBeGreaterThan(0);

		// Try to start again while already running
		await processManager.startTool(0);

		const tool = processManager.getTool(0);
		// Should be the same process (not restarted)
		expect(tool?.pid).toBeDefined();
		expect(tool?.pid).toBe(firstPid as number);
		expect(tool?.status).toBe("running");
	});

	test("startTool - handles invalid index", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
			},
		];

		await processManager.initialize(configs);
		// Should not throw
		await expect(processManager.startTool(999)).resolves.toBeUndefined();
	});

	test("stopTool - stops a running process", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "sleep",
				args: ["10"], // Long-running process we can stop
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);

		expect(processManager.getTool(0)?.status).toBe("running");

		await processManager.stopTool(0);

		// Process should be stopped
		const tool = processManager.getTool(0);
		expect(tool?.status).toBe("stopped");
	});

	test("stopTool - handles invalid index", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
			},
		];

		await processManager.initialize(configs);
		// Should not throw
		await expect(processManager.stopTool(999)).resolves.toBeUndefined();
	});

	test("cleanup - stops all processes", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test1",
				command: "sleep",
				args: ["10"],
			},
			{
				name: "test2",
				command: "sleep",
				args: ["10"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);
		await processManager.startTool(1);

		expect(processManager.getTool(0)?.status).toBe("running");
		expect(processManager.getTool(1)?.status).toBe("running");

		await processManager.cleanup();

		// All processes should be stopped
		expect(processManager.getTool(0)?.status).toBe("stopped");
		expect(processManager.getTool(1)?.status).toBe("stopped");
	});

	test("getIsShuttingDown - returns shutdown state", () => {
		expect(processManager.getIsShuttingDown()).toBe(false);

		// Note: We can't easily test the true state without triggering cleanup
		// which would stop processes. This is tested indirectly in cleanup tests.
	});

	test("logs are collected from process output", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
				args: ["test output"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);

		// Wait for process to complete
		await waitForProcessExit(processManager, 0);

		const tool = processManager.getTool(0);
		expect(Array.isArray(tool?.logs)).toBe(true);
		// Should have captured the echo output (logs is TextSegment[][])
		const hasOutput = tool?.logs?.some((line) =>
			line.some((segment) => segment.text.includes("test output")),
		);
		expect(hasOutput).toBe(true);
	});

	test("maxLogLines limits log size", async () => {
		const manager = new ProcessManager(5); // Very small limit
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
				args: ["line"],
			},
		];

		await manager.initialize(configs);
		await manager.startTool(0);

		// Wait for process to complete
		await waitForProcessExit(manager, 0);

		const tool = manager.getTool(0);
		// Logs should not exceed maxLogLines
		expect(tool?.logs).toBeDefined();
		expect(tool?.logs?.length).toBeLessThanOrEqual(5);

		await manager.cleanup();
	});
});
