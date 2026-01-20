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
	beforeEach(async () => {
		// Clean up before each test
		await deletePidFile();
	});

	afterEach(async () => {
		// Clean up after each test
		await deletePidFile();
	});

	test("getPidFilePath - returns valid path", () => {
		const path = getPidFilePath();
		expect(path).toContain("toolui-pids.json");
		expect(typeof path).toBe("string");
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
});
