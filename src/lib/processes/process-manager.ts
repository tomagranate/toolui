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

	constructor(maxLogLines: number = 10000) {
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
				this.readStream(reader, (line) => {
					this.addLog(index, line);
				});
			}

			// Handle stderr
			if (proc.stderr) {
				const reader =
					proc.stderr.getReader() as ReadableStreamDefaultReader<Uint8Array>;
				this.readStream(reader, (line) => {
					this.addLog(index, `[stderr] ${line}`);
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

	private async readStream(
		reader: ReadableStreamDefaultReader<Uint8Array>,
		onLine: (line: string) => void,
	): Promise<void> {
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					onLine(line);
				}
			}

			// Handle remaining buffer
			if (buffer) {
				onLine(buffer);
			}
		} catch (_error) {
			// Stream closed or error
		}
	}

	private addLog(index: number, line: string): void {
		const tool = this.tools[index];
		if (!tool) return;

		// Parse ANSI codes into segments
		const segments = parseAnsiLine(line);
		tool.logs.push(segments);

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

	getRecentlyStopped(): Set<number> {
		return this.recentlyStopped;
	}

	resetShutdownState(): void {
		this.isShuttingDown = false;
		this.recentlyStopped.clear();
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
