import type { ToolConfig, ToolState } from "../../types";
import { parseAnsiLine } from "../text";
import {
	deletePidFile,
	loadPidFile,
	type PidFileEntry,
	removePidFromFile,
	updatePidFile,
} from "./pid-file";
import { isProcessRunning, killProcessGracefully } from "./process-utils";

export class ProcessManager {
	private tools: ToolState[] = [];
	private maxLogLines: number;
	private isShuttingDown = false;
	private recentlyStopped = new Set<number>();

	constructor(maxLogLines: number = 100000) {
		this.maxLogLines = maxLogLines;
	}

	async initialize(configs: ToolConfig[]): Promise<ToolState[]> {
		// First, load and cleanup any orphaned processes from previous sessions
		await this.loadAndCleanupOrphanedProcesses();

		this.tools = configs.map((config) => ({
			config,
			process: null,
			logs: [],
			status: "stopped",
			exitCode: null,
		}));
		return this.tools;
	}

	async startTool(index: number): Promise<void> {
		const tool = this.tools[index];
		if (!tool || tool.status === "running") {
			return;
		}

		try {
			const { command, args = [], cwd, env } = tool.config;

			const proc = Bun.spawn([command, ...args], {
				cwd: cwd || process.cwd(),
				env: { ...process.env, ...env },
				stdout: "pipe",
				stderr: "pipe",
			});

			tool.process = proc;
			tool.status = "running";
			tool.logs = [];
			tool.exitCode = null;
			tool.pid = proc.pid;
			tool.startTime = Date.now();

			// Save PID to file for persistence
			await this.savePidToFile(index);

			// Handle stdout
			if (proc.stdout) {
				const reader =
					proc.stdout.getReader() as ReadableStreamDefaultReader<Uint8Array>;
				this.readStream(reader, (line, isReplacement) => {
					this.addLog(index, line, false, isReplacement);
				});
			}

			// Handle stderr
			if (proc.stderr) {
				const reader =
					proc.stderr.getReader() as ReadableStreamDefaultReader<Uint8Array>;
				this.readStream(reader, (line, isReplacement) => {
					this.addLog(index, line, true, isReplacement);
				});
			}

			// Handle process exit
			proc.exited.then(async (exitCode) => {
				// Only update status if not already shutting down (to preserve shutdown state)
				if (tool.status !== "shuttingDown") {
					tool.status = exitCode === 0 ? "stopped" : "error";
				} else {
					// If shutting down, mark as stopped after exit and track it
					tool.status = exitCode === 0 ? "stopped" : "error";
					if (this.isShuttingDown) {
						this.recentlyStopped.add(index);
					}
				}
				tool.exitCode = exitCode;
				tool.process = null;
				tool.pid = undefined;
				tool.startTime = undefined;
				// Remove PID from file when process exits
				await removePidFromFile(index);
				this.addLog(index, `\n[Process exited with code ${exitCode}]`);
			});
		} catch (error) {
			tool.status = "error";
			this.addLog(index, `[Error starting process: ${error}]`);
		}
	}

	/**
	 * Read a stream and emit lines, handling carriage returns for progress bars.
	 *
	 * Carriage return (`\r`) behavior:
	 * - `\r` within a complete line (ending with \n) means display content after last `\r`
	 * - `\r\n` is treated as a normal line ending (Windows style)
	 * - Incomplete lines with `\r` (real-time progress updates) trigger replacement
	 *
	 * Replacement logic:
	 * - Complete lines are always NEW lines (isReplacement = false)
	 * - Incomplete lines with `\r` are real-time updates (isReplacement = true)
	 */
	private async readStream(
		reader: ReadableStreamDefaultReader<Uint8Array>,
		onLine: (line: string, isReplacement: boolean) => void,
	): Promise<void> {
		const decoder = new TextDecoder();
		let buffer = "";
		// Track if the last emitted line was an incomplete replacement
		// so we know if we should continue replacing or start fresh
		let lastWasIncompleteReplacement = false;

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				// Process complete lines (ending with \n)
				let newlineIdx = buffer.indexOf("\n");
				while (newlineIdx !== -1) {
					let line = buffer.slice(0, newlineIdx);
					buffer = buffer.slice(newlineIdx + 1);

					// Handle \r\n (Windows line ending) - strip trailing \r
					if (line.endsWith("\r")) {
						line = line.slice(0, -1);
					}

					// Handle \r within the line - take last segment after any \r
					// This simulates terminal "carriage return" behavior where
					// \r moves cursor to start of line, overwriting previous content
					const crIdx = line.lastIndexOf("\r");
					if (crIdx >= 0) {
						line = line.slice(crIdx + 1);
					}

					// Complete lines are always emitted as NEW lines.
					// However, if the previous emission was an incomplete replacement,
					// this complete line should replace it (finalizing the progress bar).
					const isReplacement = lastWasIncompleteReplacement;
					lastWasIncompleteReplacement = false;

					onLine(line, isReplacement);

					// Check for more newlines in the remaining buffer
					newlineIdx = buffer.indexOf("\n");
				}

				// Handle incomplete lines with \r (real-time progress bar updates)
				// If buffer contains \r, the content after last \r is the "current" line
				// Emit it as a replacement so it updates the display in real-time
				const crIdx = buffer.lastIndexOf("\r");
				if (crIdx >= 0) {
					const currentLine = buffer.slice(crIdx + 1);
					buffer = currentLine; // Keep only content after \r
					if (currentLine.length > 0) {
						onLine(currentLine, true); // Emit as replacement
						lastWasIncompleteReplacement = true;
					}
				}
			}

			// Handle remaining buffer when stream ends
			if (buffer) {
				// Process any final \r in the remaining buffer
				const crIdx = buffer.lastIndexOf("\r");
				const finalLine = crIdx >= 0 ? buffer.slice(crIdx + 1) : buffer;
				if (finalLine.length > 0) {
					// If there's remaining content, it replaces the last incomplete line
					onLine(finalLine, lastWasIncompleteReplacement);
				}
			}
		} catch (_error) {
			// Stream closed or error
		}
	}

	/**
	 * Add a log line for a tool.
	 *
	 * @param index - Tool index
	 * @param line - Log line text
	 * @param isStderr - Whether this line came from stderr
	 * @param isReplacement - If true, replace the last log line instead of appending
	 *                        (used for progress bars and spinners that use \r)
	 */
	private addLog(
		index: number,
		line: string,
		isStderr = false,
		isReplacement = false,
	): void {
		const tool = this.tools[index];
		if (!tool) return;

		// Parse ANSI codes into segments
		const segments = parseAnsiLine(line);
		const logEntry = { segments, isStderr: isStderr || undefined };

		if (isReplacement && tool.logs.length > 0) {
			// Replace the last log line instead of appending
			// This handles progress bars and spinners that use \r to update in place
			tool.logs[tool.logs.length - 1] = logEntry;
		} else {
			tool.logs.push(logEntry);
		}

		// Limit log size
		if (tool.logs.length > this.maxLogLines) {
			tool.logs.shift();
		}
	}

	getTools(): ToolState[] {
		return this.tools;
	}

	getTool(index: number): ToolState | undefined {
		return this.tools[index];
	}

	async stopTool(index: number): Promise<void> {
		const tool = this.tools[index];
		if (!tool || !tool.process) return;

		try {
			// Send SIGTERM for graceful shutdown
			tool.process.kill("SIGTERM");
			// Wait for process to exit (up to 3 seconds)
			const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
			const exitPromise = tool.process.exited;

			await Promise.race([exitPromise, timeout]);

			// Check if process exited
			if (tool.process && !tool.process.killed) {
				// Still running after timeout - will be force killed in cleanup
				return;
			} else {
				// Process exited
				tool.status = "stopped";
				tool.process = null;
				tool.pid = undefined;
				tool.startTime = undefined;
				await removePidFromFile(index);
			}
		} catch (_error) {
			// Ignore errors
			tool.status = "stopped";
			tool.process = null;
			tool.pid = undefined;
			tool.startTime = undefined;
			await removePidFromFile(index);
		}
	}

	async restartTool(index: number): Promise<void> {
		const tool = this.tools[index];
		if (!tool) return;

		// If running, stop first (graceful with force kill on timeout)
		if (
			tool.process &&
			(tool.status === "running" || tool.status === "shuttingDown")
		) {
			try {
				tool.process.kill("SIGTERM");
				const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
				const exitPromise = tool.process.exited;

				await Promise.race([exitPromise, timeout]);

				// Force kill if still running after timeout
				if (tool.process && !tool.process.killed) {
					tool.process.kill("SIGKILL");
					await tool.process.exited;
				}
			} catch (_error) {
				// Ignore errors during stop
			}

			tool.process = null;
			tool.pid = undefined;
			tool.startTime = undefined;
			await removePidFromFile(index);
		}

		// Start fresh
		await this.startTool(index);
	}

	clearLogs(index: number): void {
		const tool = this.tools[index];
		if (tool) {
			tool.logs = [];
		}
	}

	async cleanup(): Promise<void> {
		// Set shutdown state
		this.isShuttingDown = true;
		this.recentlyStopped.clear();

		// Mark all running processes as shutting down and send SIGTERM immediately
		const shutdownPromises: Promise<void>[] = [];

		for (let i = 0; i < this.tools.length; i++) {
			const tool = this.tools[i];
			if (tool?.process && tool.status === "running") {
				// Mark as shutting down immediately
				tool.status = "shuttingDown";
				this.addLog(i, "\n[SHUTDOWN] Initiating graceful shutdown...");

				// Start shutdown process (don't await yet)
				shutdownPromises.push(this.stopTool(i));
			}
		}

		// Wait for all processes to shutdown in parallel (with timeout)
		await Promise.allSettled(shutdownPromises);

		// Force kill any processes that are still running after timeout
		for (let i = 0; i < this.tools.length; i++) {
			const tool = this.tools[i];
			if (tool?.process && !tool.process.killed) {
				this.addLog(
					i,
					"[SHUTDOWN] Process did not exit gracefully, forcing termination...",
				);
				tool.process.kill("SIGKILL");
				tool.status = "stopped";
				if (this.isShuttingDown) {
					this.recentlyStopped.add(i);
				}
				tool.process = null;
			}
		}

		// Run cleanup commands in parallel
		const cleanupPromises: Promise<void>[] = [];
		for (const tool of this.tools) {
			if (!tool) continue;
			if (tool.config.cleanup && tool.config.cleanup.length > 0) {
				for (const cleanupCmd of tool.config.cleanup) {
					cleanupPromises.push(
						(async () => {
							try {
								const proc = Bun.spawn(["sh", "-c", cleanupCmd], {
									cwd: tool.config.cwd || process.cwd(),
								});
								await proc.exited;
							} catch (error) {
								// Log but don't fail on cleanup errors
								console.error(
									`Cleanup failed for ${tool.config.name}: ${error}`,
								);
							}
						})(),
					);
				}
			}
		}

		await Promise.allSettled(cleanupPromises);

		// Clear PID file after cleanup completes
		await deletePidFile();
	}

	getIsShuttingDown(): boolean {
		return this.isShuttingDown;
	}

	/**
	 * Synchronously kill all running processes.
	 * This is used in the process.on('exit') handler where async code can't run.
	 * Sends SIGTERM to all processes without waiting for them to exit.
	 */
	killAllSync(): void {
		for (const tool of this.tools) {
			if (tool?.process && !tool.process.killed) {
				try {
					tool.process.kill("SIGTERM");
				} catch {
					// Ignore errors - process may have already exited
				}
			}
		}
	}

	getRecentlyStopped(): Set<number> {
		return this.recentlyStopped;
	}

	resetShutdownState(): void {
		this.isShuttingDown = false;
		this.recentlyStopped.clear();
	}

	/**
	 * Find a tool by name.
	 * @returns The tool index and state, or undefined if not found
	 */
	getToolByName(name: string): { index: number; tool: ToolState } | undefined {
		const index = this.tools.findIndex((t) => t.config.name === name);
		if (index === -1) return undefined;
		const tool = this.tools[index];
		if (!tool) return undefined;
		return { index, tool };
	}

	/**
	 * Create a virtual tool (no spawned process) for internal use like MCP API.
	 * The tool starts in "running" status and can receive logs via addLogToTool().
	 * @returns The index of the created virtual tool
	 */
	createVirtualTool(name: string): number {
		const tool: ToolState = {
			config: { name, command: "" },
			process: null,
			logs: [],
			status: "running",
			exitCode: null,
		};
		this.tools.push(tool);
		return this.tools.length - 1;
	}

	/**
	 * Add a log line to a tool (public API for virtual tools).
	 * @param index - Tool index
	 * @param message - Plain text message to log
	 */
	addLogToTool(index: number, message: string): void {
		this.addLog(index, message);
	}

	/**
	 * Save PID to file for a specific tool.
	 */
	private async savePidToFile(index: number): Promise<void> {
		const tool = this.tools[index];
		if (!tool || !tool.process || !tool.pid) return;

		const entry: PidFileEntry = {
			toolIndex: index,
			toolName: tool.config.name,
			pid: tool.pid,
			startTime: tool.startTime || Date.now(),
			command: tool.config.command,
			args: tool.config.args || [],
			cwd: tool.config.cwd || process.cwd(),
		};

		await updatePidFile(entry);
	}

	/**
	 * Load PID file and cleanup any orphaned processes from previous sessions.
	 * Kills any processes that are still running and logs the cleanup.
	 */
	private async loadAndCleanupOrphanedProcesses(): Promise<void> {
		const pidData = await loadPidFile();
		if (!pidData || pidData.processes.length === 0) {
			return;
		}

		const cleanupLog: string[] = [];
		cleanupLog.push(
			`[PID Cleanup] Found ${pidData.processes.length} process(es) from previous session`,
		);

		for (const entry of pidData.processes) {
			const isRunning = await isProcessRunning(entry.pid);
			if (isRunning) {
				cleanupLog.push(
					`[PID Cleanup] Killing orphaned process: ${entry.toolName} (PID: ${entry.pid})`,
				);
				const killed = await killProcessGracefully(entry.pid, 3000);
				if (killed) {
					cleanupLog.push(
						`[PID Cleanup] Successfully killed process ${entry.pid}`,
					);
				} else {
					cleanupLog.push(`[PID Cleanup] Failed to kill process ${entry.pid}`);
				}
			} else {
				cleanupLog.push(
					`[PID Cleanup] Process ${entry.pid} (${entry.toolName}) is already dead`,
				);
			}
		}

		// Log cleanup actions (will be visible when tools start)
		console.log(cleanupLog.join("\n"));
	}
}
