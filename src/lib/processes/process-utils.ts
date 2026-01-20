// Use process.platform for cross-platform detection

/**
 * Check if a process with the given PID is still running.
 * Cross-platform implementation.
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
	if (pid <= 0) return false;

	try {
		if (process.platform === "win32") {
			// Windows: Use tasklist to check if process exists
			const proc = Bun.spawn(
				["tasklist", "/FI", `PID eq ${pid}`, "/FO", "CSV"],
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);
			const output = await new Response(proc.stdout).text();
			// tasklist returns header line + data line if process exists
			// If only header, process doesn't exist
			const lines = output.trim().split("\n");
			return lines.length > 1;
		} else {
			// Unix: Use kill(pid, 0) - signal 0 doesn't kill, just checks if process exists
			// This is the standard Unix way to check if a process is running
			const proc = Bun.spawn(["kill", "-0", pid.toString()], {
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;
			// Exit code 0 means process exists, non-zero means it doesn't
			return proc.exitCode === 0;
		}
	} catch {
		// If command fails, assume process is not running
		return false;
	}
}

/**
 * Kill a process by PID.
 * Sends SIGTERM first for graceful shutdown, then SIGKILL if needed.
 */
export async function killProcess(
	pid: number,
	signal: "SIGTERM" | "SIGKILL" = "SIGTERM",
): Promise<boolean> {
	if (pid <= 0) return false;

	try {
		if (process.platform === "win32") {
			// Windows: Use taskkill
			const signalFlag = signal === "SIGKILL" ? "/F" : "";
			const proc = Bun.spawn(
				["taskkill", "/PID", pid.toString(), signalFlag].filter(Boolean),
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);
			await proc.exited;
			return proc.exitCode === 0;
		} else {
			// Unix: Use kill command
			const signalFlag = signal === "SIGKILL" ? "-9" : "-15";
			const proc = Bun.spawn(["kill", signalFlag, pid.toString()], {
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;
			return proc.exitCode === 0;
		}
	} catch {
		return false;
	}
}

/**
 * Kill a process gracefully, then force kill if it doesn't exit.
 * Returns true if process was killed (or already dead), false on error.
 */
export async function killProcessGracefully(
	pid: number,
	timeoutMs: number = 3000,
): Promise<boolean> {
	// First check if process is running
	const isRunning = await isProcessRunning(pid);
	if (!isRunning) {
		return true; // Already dead
	}

	// Try graceful shutdown
	const killed = await killProcess(pid, "SIGTERM");
	if (!killed) {
		return false; // Failed to send signal
	}

	// Wait for process to exit
	const startTime = Date.now();
	while (Date.now() - startTime < timeoutMs) {
		const stillRunning = await isProcessRunning(pid);
		if (!stillRunning) {
			return true; // Process exited gracefully
		}
		await new Promise((resolve) => setTimeout(resolve, 100)); // Check every 100ms
	}

	// Process didn't exit, force kill
	return await killProcess(pid, "SIGKILL");
}
