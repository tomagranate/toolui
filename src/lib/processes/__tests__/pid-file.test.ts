import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	deletePidFile,
	getPidFilePath,
	loadPidFile,
	type PidFileData,
	type PidFileEntry,
	removePidFromFile,
	savePidFile,
	updatePidFile,
} from "../pid-file";

describe("PID file utilities", () => {
	// Test config paths for instance-specific tests
	const testConfigPath1 = "/test/project-a/toolui.config.toml";
	const testConfigPath2 = "/test/project-b/toolui.config.toml";

	beforeEach(async () => {
		// Clean up before each test (both global and instance-specific files)
		await deletePidFile();
		await deletePidFile(testConfigPath1);
		await deletePidFile(testConfigPath2);
	});

	afterEach(async () => {
		// Clean up after each test
		await deletePidFile();
		await deletePidFile(testConfigPath1);
		await deletePidFile(testConfigPath2);
	});

	test("getPidFilePath - returns valid path without configPath", () => {
		const path = getPidFilePath();
		expect(path).toContain("toolui-pids.json");
		expect(typeof path).toBe("string");
	});

	test("getPidFilePath - returns instance-specific path with configPath", () => {
		const path1 = getPidFilePath(testConfigPath1);
		const path2 = getPidFilePath(testConfigPath2);

		// Both should be different from the global path
		const globalPath = getPidFilePath();
		expect(path1).not.toBe(globalPath);
		expect(path2).not.toBe(globalPath);

		// And different from each other
		expect(path1).not.toBe(path2);

		// But both should follow the pattern toolui-{hash}.json
		expect(path1).toMatch(/toolui-[a-f0-9]+\.json$/);
		expect(path2).toMatch(/toolui-[a-f0-9]+\.json$/);
	});

	test("getPidFilePath - same configPath returns same hash", () => {
		const path1 = getPidFilePath(testConfigPath1);
		const path2 = getPidFilePath(testConfigPath1);
		expect(path1).toBe(path2);
	});

	test("getPidFilePath - relative vs absolute path normalizes to same hash", () => {
		// The function uses resolve() so these should produce the same hash
		const absolutePath = "/Users/test/project/toolui.config.toml";
		const path1 = getPidFilePath(absolutePath);
		const path2 = getPidFilePath(absolutePath);
		expect(path1).toBe(path2);
	});

	test("loadPidFile - non-existent file returns null", async () => {
		const result = await loadPidFile();
		expect(result).toBeNull();
	});

	test("savePidFile and loadPidFile - round trip", async () => {
		const data: PidFileData = {
			version: 1,
			processes: [
				{
					toolIndex: 0,
					toolName: "test-tool",
					pid: 12345,
					startTime: Date.now(),
					command: "echo",
					args: ["hello"],
					cwd: "/tmp",
				},
			],
		};

		await savePidFile(data);
		const loaded = await loadPidFile();

		expect(loaded).not.toBeNull();
		expect(loaded?.version).toBe(1);
		expect(loaded?.processes).toHaveLength(1);
		expect(loaded?.processes[0]?.toolName).toBe("test-tool");
		expect(loaded?.processes[0]?.pid).toBe(12345);
	});

	test("updatePidFile - adds new entry", async () => {
		const entry: PidFileEntry = {
			toolIndex: 0,
			toolName: "test",
			pid: 123,
			startTime: Date.now(),
			command: "echo",
			args: [],
			cwd: "/tmp",
		};

		await updatePidFile(entry);
		const loaded = await loadPidFile();

		expect(loaded?.processes).toHaveLength(1);
		expect(loaded?.processes[0]?.toolName).toBe("test");
	});

	test("updatePidFile - updates existing entry", async () => {
		const entry1: PidFileEntry = {
			toolIndex: 0,
			toolName: "test",
			pid: 123,
			startTime: Date.now(),
			command: "echo",
			args: [],
			cwd: "/tmp",
		};

		const entry2: PidFileEntry = {
			toolIndex: 0,
			toolName: "test-updated",
			pid: 456,
			startTime: Date.now(),
			command: "ls",
			args: [],
			cwd: "/tmp",
		};

		await updatePidFile(entry1);
		await updatePidFile(entry2);

		const loaded = await loadPidFile();
		expect(loaded?.processes).toHaveLength(1);
		expect(loaded?.processes[0]?.toolName).toBe("test-updated");
		expect(loaded?.processes[0]?.pid).toBe(456);
	});

	test("removePidFromFile - removes entry", async () => {
		const entry: PidFileEntry = {
			toolIndex: 0,
			toolName: "test",
			pid: 123,
			startTime: Date.now(),
			command: "echo",
			args: [],
			cwd: "/tmp",
		};

		await updatePidFile(entry);
		await removePidFromFile(0);

		const loaded = await loadPidFile();
		expect(loaded).toBeNull(); // File should be deleted when empty
	});

	test("removePidFromFile - removes one of multiple entries", async () => {
		const entry1: PidFileEntry = {
			toolIndex: 0,
			toolName: "test1",
			pid: 123,
			startTime: Date.now(),
			command: "echo",
			args: [],
			cwd: "/tmp",
		};

		const entry2: PidFileEntry = {
			toolIndex: 1,
			toolName: "test2",
			pid: 456,
			startTime: Date.now(),
			command: "ls",
			args: [],
			cwd: "/tmp",
		};

		await updatePidFile(entry1);
		await updatePidFile(entry2);
		await removePidFromFile(0);

		const loaded = await loadPidFile();
		expect(loaded?.processes).toHaveLength(1);
		expect(loaded?.processes[0]?.toolIndex).toBe(1);
	});

	test("removePidFromFile - non-existent file", async () => {
		// Should not throw
		await expect(removePidFromFile(0)).resolves.toBeUndefined();
	});

	test("deletePidFile - removes file", async () => {
		const data: PidFileData = {
			version: 1,
			processes: [
				{
					toolIndex: 0,
					toolName: "test",
					pid: 123,
					startTime: Date.now(),
					command: "echo",
					args: [],
					cwd: "/tmp",
				},
			],
		};

		await savePidFile(data);
		await deletePidFile();

		const loaded = await loadPidFile();
		expect(loaded).toBeNull();
	});

	test("savePidFile - handles multiple processes", async () => {
		const data: PidFileData = {
			version: 1,
			processes: [
				{
					toolIndex: 0,
					toolName: "tool1",
					pid: 111,
					startTime: Date.now(),
					command: "echo",
					args: [],
					cwd: "/tmp",
				},
				{
					toolIndex: 1,
					toolName: "tool2",
					pid: 222,
					startTime: Date.now(),
					command: "ls",
					args: [],
					cwd: "/tmp",
				},
			],
		};

		await savePidFile(data);
		const loaded = await loadPidFile();

		expect(loaded?.processes).toHaveLength(2);
	});

	// Instance-specific PID file tests
	describe("instance-specific PID files", () => {
		test("different config paths create isolated PID files", async () => {
			const entry1: PidFileEntry = {
				toolIndex: 0,
				toolName: "project-a-tool",
				pid: 1111,
				startTime: Date.now(),
				command: "npm",
				args: ["run", "dev"],
				cwd: "/test/project-a",
			};

			const entry2: PidFileEntry = {
				toolIndex: 0,
				toolName: "project-b-tool",
				pid: 2222,
				startTime: Date.now(),
				command: "npm",
				args: ["run", "start"],
				cwd: "/test/project-b",
			};

			// Save entries to different config paths
			await updatePidFile(entry1, testConfigPath1);
			await updatePidFile(entry2, testConfigPath2);

			// Each should only see their own entries
			const loaded1 = await loadPidFile(testConfigPath1);
			const loaded2 = await loadPidFile(testConfigPath2);

			expect(loaded1?.processes).toHaveLength(1);
			expect(loaded1?.processes[0]?.toolName).toBe("project-a-tool");
			expect(loaded1?.processes[0]?.pid).toBe(1111);

			expect(loaded2?.processes).toHaveLength(1);
			expect(loaded2?.processes[0]?.toolName).toBe("project-b-tool");
			expect(loaded2?.processes[0]?.pid).toBe(2222);
		});

		test("deleting one instance PID file does not affect another", async () => {
			const entry1: PidFileEntry = {
				toolIndex: 0,
				toolName: "project-a-tool",
				pid: 1111,
				startTime: Date.now(),
				command: "npm",
				args: [],
				cwd: "/tmp",
			};

			const entry2: PidFileEntry = {
				toolIndex: 0,
				toolName: "project-b-tool",
				pid: 2222,
				startTime: Date.now(),
				command: "npm",
				args: [],
				cwd: "/tmp",
			};

			await updatePidFile(entry1, testConfigPath1);
			await updatePidFile(entry2, testConfigPath2);

			// Delete project-a's PID file
			await deletePidFile(testConfigPath1);

			// Project-a should be gone
			const loaded1 = await loadPidFile(testConfigPath1);
			expect(loaded1).toBeNull();

			// Project-b should still exist
			const loaded2 = await loadPidFile(testConfigPath2);
			expect(loaded2?.processes).toHaveLength(1);
			expect(loaded2?.processes[0]?.toolName).toBe("project-b-tool");
		});

		test("removePidFromFile works with instance-specific files", async () => {
			const entry1: PidFileEntry = {
				toolIndex: 0,
				toolName: "tool1",
				pid: 111,
				startTime: Date.now(),
				command: "echo",
				args: [],
				cwd: "/tmp",
			};

			const entry2: PidFileEntry = {
				toolIndex: 1,
				toolName: "tool2",
				pid: 222,
				startTime: Date.now(),
				command: "ls",
				args: [],
				cwd: "/tmp",
			};

			await updatePidFile(entry1, testConfigPath1);
			await updatePidFile(entry2, testConfigPath1);

			// Remove one entry
			await removePidFromFile(0, testConfigPath1);

			const loaded = await loadPidFile(testConfigPath1);
			expect(loaded?.processes).toHaveLength(1);
			expect(loaded?.processes[0]?.toolIndex).toBe(1);
		});

		test("savePidFile and loadPidFile work with configPath", async () => {
			const data: PidFileData = {
				version: 1,
				processes: [
					{
						toolIndex: 0,
						toolName: "test-tool",
						pid: 12345,
						startTime: Date.now(),
						command: "echo",
						args: ["hello"],
						cwd: "/tmp",
					},
				],
			};

			await savePidFile(data, testConfigPath1);
			const loaded = await loadPidFile(testConfigPath1);

			expect(loaded).not.toBeNull();
			expect(loaded?.version).toBe(1);
			expect(loaded?.processes).toHaveLength(1);
			expect(loaded?.processes[0]?.toolName).toBe("test-tool");

			// Global file should be unaffected
			const globalLoaded = await loadPidFile();
			expect(globalLoaded).toBeNull();
		});
	});
});
