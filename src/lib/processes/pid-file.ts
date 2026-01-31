import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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
 * Generate a short hash from a string for use in filenames.
 * Uses first 12 characters of SHA-256 hash for uniqueness while keeping filename reasonable.
 */
function hashConfigPath(configPath: string): string {
	const absolutePath = resolve(configPath);
	const hash = createHash("sha256").update(absolutePath).digest("hex");
	return hash.substring(0, 12);
}

/**
 * Get the path to the PID file in the OS temp directory.
 * When configPath is provided, generates an instance-specific filename to allow
 * multiple corsa instances (in different projects) to run simultaneously.
 *
 * @param configPath - Optional path to the config file. When provided, creates an
 *                     instance-specific PID file based on the config path hash.
 */
export function getPidFilePath(configPath?: string): string {
	const tempDir = tmpdir();
	if (configPath) {
		const hash = hashConfigPath(configPath);
		return join(tempDir, `corsa-${hash}.json`);
	}
	// Fallback for backward compatibility (no config path provided)
	return join(tempDir, "corsa-pids.json");
}

/**
 * Load and parse the PID file.
 * Returns null if file doesn't exist or is invalid.
 *
 * @param configPath - Optional config path for instance-specific PID file
 */
export async function loadPidFile(
	configPath?: string,
): Promise<PidFileData | null> {
	const filePath = getPidFilePath(configPath);

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
 *
 * @param data - The PID file data to save
 * @param configPath - Optional config path for instance-specific PID file
 */
export async function savePidFile(
	data: PidFileData,
	configPath?: string,
): Promise<void> {
	const filePath = getPidFilePath(configPath);
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
 *
 * @param configPath - Optional config path for instance-specific PID file
 */
export async function deletePidFile(configPath?: string): Promise<void> {
	const filePath = getPidFilePath(configPath);
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
 *
 * @param entry - The process entry to add or update
 * @param configPath - Optional config path for instance-specific PID file
 */
export async function updatePidFile(
	entry: PidFileEntry,
	configPath?: string,
): Promise<void> {
	const data = (await loadPidFile(configPath)) || {
		version: 1,
		processes: [],
	};

	// Remove existing entry for this toolIndex if it exists
	data.processes = data.processes.filter(
		(p) => p.toolIndex !== entry.toolIndex,
	);

	// Add new entry
	data.processes.push(entry);

	await savePidFile(data, configPath);
}

/**
 * Remove a process entry from the PID file by toolIndex.
 *
 * @param toolIndex - The tool index to remove
 * @param configPath - Optional config path for instance-specific PID file
 */
export async function removePidFromFile(
	toolIndex: number,
	configPath?: string,
): Promise<void> {
	const data = await loadPidFile(configPath);
	if (!data) return;

	data.processes = data.processes.filter((p) => p.toolIndex !== toolIndex);

	if (data.processes.length === 0) {
		await deletePidFile(configPath);
	} else {
		await savePidFile(data, configPath);
	}
}
