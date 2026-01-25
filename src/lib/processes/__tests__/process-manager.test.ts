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
		// Should have captured the echo output (logs is LogLine[])
		const hasOutput = tool?.logs?.some((logLine) =>
			logLine.segments.some((segment) => segment.text.includes("test output")),
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

	test("restartTool - restarts a running process", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "sleep",
				args: ["10"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);

		const firstPid = processManager.getTool(0)?.pid;
		expect(firstPid).toBeDefined();
		expect(processManager.getTool(0)?.status).toBe("running");

		await processManager.restartTool(0);

		const tool = processManager.getTool(0);
		expect(tool?.status).toBe("running");
		expect(tool?.pid).toBeDefined();
		// Should be a new process with different PID
		expect(tool?.pid).not.toBe(firstPid);
	});

	test("restartTool - starts a stopped process", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "sleep",
				args: ["10"],
			},
		];

		await processManager.initialize(configs);
		// Don't start the process first - it should be stopped

		expect(processManager.getTool(0)?.status).toBe("stopped");

		await processManager.restartTool(0);

		const tool = processManager.getTool(0);
		expect(tool?.status).toBe("running");
		expect(tool?.pid).toBeDefined();
	});

	test("restartTool - handles invalid index", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
			},
		];

		await processManager.initialize(configs);
		// Should not throw
		await expect(processManager.restartTool(999)).resolves.toBeUndefined();
	});

	test("clearLogs - clears logs for a tool", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
				args: ["test output"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);

		// Wait for process to complete and collect logs
		await waitForProcessExit(processManager, 0);

		const toolBefore = processManager.getTool(0);
		expect(toolBefore?.logs?.length).toBeGreaterThan(0);

		processManager.clearLogs(0);

		const toolAfter = processManager.getTool(0);
		expect(toolAfter?.logs).toEqual([]);
	});

	test("clearLogs - handles invalid index", async () => {
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "echo",
			},
		];

		await processManager.initialize(configs);
		// Should not throw
		expect(() => processManager.clearLogs(999)).not.toThrow();
	});

	// =========================================================================
	// Carriage Return Handling Tests
	// =========================================================================

	test("carriage return - progress bar updates replace previous line", async () => {
		// Simulate a progress bar: \rProgress 10%\rProgress 50%\rProgress 100%\n
		// Only the final state (Progress 100%) should be in logs
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "printf",
				args: ["\\rProgress 10%%\\rProgress 50%%\\rProgress 100%%\\n"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);
		await waitForProcessExit(processManager, 0);

		const tool = processManager.getTool(0);
		expect(tool?.logs).toBeDefined();

		// Find the progress line (not the exit message)
		const progressLogs = tool?.logs?.filter((log) =>
			log.segments.some((seg) => seg.text.includes("Progress")),
		);

		// Should only have one line with the final progress state
		expect(progressLogs?.length).toBe(1);
		const progressText = progressLogs?.[0]?.segments
			.map((s) => s.text)
			.join("");
		expect(progressText).toBe("Progress 100%");
	});

	test("carriage return - spinner updates replace previous line", async () => {
		// Simulate spinner frames: \r- Loading\r/ Loading\r| Loading\r\ Loading\n
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "printf",
				args: ["\\r- Loading\\r/ Loading\\r| Loading\\rDone!\\n"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);
		await waitForProcessExit(processManager, 0);

		const tool = processManager.getTool(0);

		// Find lines that aren't the exit message
		const contentLogs = tool?.logs?.filter(
			(log) =>
				!log.segments.some((seg) => seg.text.includes("[Process exited")),
		);

		// Should only have the final "Done!" line
		expect(contentLogs?.length).toBe(1);
		const finalText = contentLogs?.[0]?.segments.map((s) => s.text).join("");
		expect(finalText).toBe("Done!");
	});

	test("carriage return - Windows line endings (CRLF) handled correctly", async () => {
		// \r\n should be treated as a normal line break, not a replacement
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "printf",
				args: ["Line 1\\r\\nLine 2\\r\\nLine 3\\r\\n"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);
		await waitForProcessExit(processManager, 0);

		const tool = processManager.getTool(0);

		// Filter out exit message
		const contentLogs = tool?.logs?.filter(
			(log) =>
				!log.segments.some((seg) => seg.text.includes("[Process exited")),
		);

		// Should have all three lines (not replaced)
		expect(contentLogs?.length).toBe(3);
		expect(contentLogs?.[0]?.segments.map((s) => s.text).join("")).toBe(
			"Line 1",
		);
		expect(contentLogs?.[1]?.segments.map((s) => s.text).join("")).toBe(
			"Line 2",
		);
		expect(contentLogs?.[2]?.segments.map((s) => s.text).join("")).toBe(
			"Line 3",
		);
	});

	test("carriage return - mixed content with normal lines and progress", async () => {
		// Normal line, then progress updates, then another normal line
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "printf",
				args: ["Starting...\\n\\rStep 1\\rStep 2\\rStep 3 done\\nFinished!\\n"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);
		await waitForProcessExit(processManager, 0);

		const tool = processManager.getTool(0);

		// Filter out exit message
		const contentLogs = tool?.logs?.filter(
			(log) =>
				!log.segments.some((seg) => seg.text.includes("[Process exited")),
		);

		// Should have: "Starting...", "Step 3 done", "Finished!"
		expect(contentLogs?.length).toBe(3);
		expect(contentLogs?.[0]?.segments.map((s) => s.text).join("")).toBe(
			"Starting...",
		);
		expect(contentLogs?.[1]?.segments.map((s) => s.text).join("")).toBe(
			"Step 3 done",
		);
		expect(contentLogs?.[2]?.segments.map((s) => s.text).join("")).toBe(
			"Finished!",
		);
	});

	test("carriage return - multiple CR in one chunk takes last segment", async () => {
		// Multiple \r in a single line - should take content after last \r
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "printf",
				args: ["foo\\rbar\\rbaz\\n"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);
		await waitForProcessExit(processManager, 0);

		const tool = processManager.getTool(0);

		const contentLogs = tool?.logs?.filter(
			(log) =>
				!log.segments.some((seg) => seg.text.includes("[Process exited")),
		);

		// Should only have "baz" (content after last \r)
		expect(contentLogs?.length).toBe(1);
		expect(contentLogs?.[0]?.segments.map((s) => s.text).join("")).toBe("baz");
	});

	test("carriage return - no CR behaves normally", async () => {
		// Lines without \r should work as before
		const configs: ToolConfig[] = [
			{
				name: "test",
				command: "printf",
				args: ["Line 1\\nLine 2\\nLine 3\\n"],
			},
		];

		await processManager.initialize(configs);
		await processManager.startTool(0);
		await waitForProcessExit(processManager, 0);

		const tool = processManager.getTool(0);

		const contentLogs = tool?.logs?.filter(
			(log) =>
				!log.segments.some((seg) => seg.text.includes("[Process exited")),
		);

		// Should have all three lines
		expect(contentLogs?.length).toBe(3);
		expect(contentLogs?.[0]?.segments.map((s) => s.text).join("")).toBe(
			"Line 1",
		);
		expect(contentLogs?.[1]?.segments.map((s) => s.text).join("")).toBe(
			"Line 2",
		);
		expect(contentLogs?.[2]?.segments.map((s) => s.text).join("")).toBe(
			"Line 3",
		);
	});

	// =========================================================================
	// MCP API Helper Methods
	// =========================================================================

	test("getToolByName - finds existing tool by name", async () => {
		const configs: ToolConfig[] = [
			{ name: "first-tool", command: "echo", args: ["1"] },
			{ name: "second-tool", command: "echo", args: ["2"] },
			{ name: "third-tool", command: "echo", args: ["3"] },
		];

		await processManager.initialize(configs);

		const result = processManager.getToolByName("second-tool");
		expect(result).toBeDefined();
		expect(result?.index).toBe(1);
		expect(result?.tool.config.name).toBe("second-tool");
	});

	test("getToolByName - returns undefined for non-existent tool", async () => {
		const configs: ToolConfig[] = [{ name: "my-tool", command: "echo" }];

		await processManager.initialize(configs);

		const result = processManager.getToolByName("nonexistent");
		expect(result).toBeUndefined();
	});

	test("createVirtualTool - creates a virtual tool with running status", async () => {
		const configs: ToolConfig[] = [{ name: "real-tool", command: "echo" }];

		await processManager.initialize(configs);
		const initialCount = processManager.getTools().length;

		const index = processManager.createVirtualTool("Virtual API");

		const tools = processManager.getTools();
		expect(tools.length).toBe(initialCount + 1);

		const virtualTool = processManager.getTool(index);
		expect(virtualTool).toBeDefined();
		expect(virtualTool?.config.name).toBe("Virtual API");
		expect(virtualTool?.config.command).toBe("");
		expect(virtualTool?.status).toBe("running");
		expect(virtualTool?.process).toBeNull();
		expect(virtualTool?.logs).toEqual([]);
	});

	test("addLogToTool - adds log messages to a tool", async () => {
		const configs: ToolConfig[] = [{ name: "log-test", command: "echo" }];

		await processManager.initialize(configs);

		const result = processManager.getToolByName("log-test");
		if (!result) throw new Error("Expected log-test to exist");

		processManager.addLogToTool(result.index, "First log message");
		processManager.addLogToTool(result.index, "Second log message");

		const tool = processManager.getTool(result.index);
		expect(tool?.logs.length).toBe(2);
		expect(tool?.logs[0]?.segments[0]?.text).toBe("First log message");
		expect(tool?.logs[1]?.segments[0]?.text).toBe("Second log message");
	});

	test("addLogToTool - handles invalid index gracefully", async () => {
		const configs: ToolConfig[] = [{ name: "test", command: "echo" }];

		await processManager.initialize(configs);

		// Should not throw for invalid index
		expect(() => processManager.addLogToTool(999, "test")).not.toThrow();
	});

	test("createVirtualTool + addLogToTool work together", async () => {
		const configs: ToolConfig[] = [];
		await processManager.initialize(configs);

		const virtualIndex = processManager.createVirtualTool("MCP Server");

		processManager.addLogToTool(virtualIndex, "[12:00:00] Server started");
		processManager.addLogToTool(
			virtualIndex,
			"[12:00:01] Listening on port 8080",
		);

		const virtualTool = processManager.getTool(virtualIndex);
		expect(virtualTool?.logs.length).toBe(2);
		expect(virtualTool?.logs[0]?.segments[0]?.text).toContain("Server started");
		expect(virtualTool?.logs[1]?.segments[0]?.text).toContain("Listening");
	});

	test("getToolByName works after createVirtualTool", async () => {
		const configs: ToolConfig[] = [
			{ name: "app-server", command: "node", args: ["server.js"] },
		];

		await processManager.initialize(configs);
		processManager.createVirtualTool("API Logger");

		// Should still find the original tool
		const appResult = processManager.getToolByName("app-server");
		expect(appResult).toBeDefined();
		expect(appResult?.tool.config.name).toBe("app-server");

		// Should find the virtual tool
		const apiResult = processManager.getToolByName("API Logger");
		expect(apiResult).toBeDefined();
		expect(apiResult?.tool.config.name).toBe("API Logger");
	});
});
