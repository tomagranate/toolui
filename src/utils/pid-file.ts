import { tmpdir } from "node:os";
import { join } from "node:path";

export interface PidFileEntry {
	toolIndex: number;
	toolName: string;
	pid: number;
	startTime: number; // Unix timestamp
	command: string;
	args: string[];
	cwd: string;
}

export interface PidFileData {
	version: number;
	processes: PidFileEntry[];
}

/**
 * Get the path to the PID file in the OS temp directory.
 */
export function getPidFilePath(): string {
	const tempDir = tmpdir();
	return join(tempDir, "toolui-pids.json");
}

/**
 * Load and parse the PID file.
 * Returns null if file doesn't exist or is invalid.
 */
export async function loadPidFile(): Promise<PidFileData | null> {
	const filePath = getPidFilePath();

	try {
		const file = Bun.file(filePath);
		if (!(await file.exists())) {
			return null;
		}

		const content = await file.text();
		const data = JSON.parse(content) as PidFileData;

		// Validate structure
		if (
			typeof data === "object" &&
			data !== null &&
			typeof data.version === "number" &&
			Array.isArray(data.processes)
		) {
			return data;
		}

		return null;
	} catch {
		// File doesn't exist, is corrupted, or invalid JSON
		return null;
	}
}

/**
 * Save PID data to file atomically (write to temp file, then rename).
 */
export async function savePidFile(data: PidFileData): Promise<void> {
	const filePath = getPidFilePath();
	const tempPath = `${filePath}.tmp`;

	try {
		// Write to temp file first
		await Bun.write(tempPath, JSON.stringify(data, null, 2));

		// Atomic rename (works on both Unix and Windows)
		await Bun.write(filePath, await Bun.file(tempPath).text());

		// Clean up temp file
		try {
			await Bun.write(tempPath, ""); // Clear it
		} catch {
			// Ignore cleanup errors
		}
	} catch (error) {
		throw new Error(`Failed to save PID file: ${error}`);
	}
}

/**
 * Delete the PID file.
 */
export async function deletePidFile(): Promise<void> {
	const filePath = getPidFilePath();
	try {
		const file = Bun.file(filePath);
		if (await file.exists()) {
			await Bun.write(filePath, "");
		}
	} catch {
		// Ignore errors when deleting
	}
}

/**
 * Update PID file by adding or updating a process entry.
 */
export async function updatePidFile(entry: PidFileEntry): Promise<void> {
	const data = (await loadPidFile()) || { version: 1, processes: [] };

	// Remove existing entry for this toolIndex if it exists
	data.processes = data.processes.filter(
		(p) => p.toolIndex !== entry.toolIndex,
	);

	// Add new entry
	data.processes.push(entry);

	await savePidFile(data);
}

/**
 * Remove a process entry from the PID file by toolIndex.
 */
export async function removePidFromFile(toolIndex: number): Promise<void> {
	const data = await loadPidFile();
	if (!data) return;

	data.processes = data.processes.filter((p) => p.toolIndex !== toolIndex);

	if (data.processes.length === 0) {
		await deletePidFile();
	} else {
		await savePidFile(data);
	}
}
