#!/usr/bin/env bun

// Runs continuously, then handles graceful shutdown on SIGTERM/SIGINT
console.log("[INFO] Graceful shutdown test started");
console.log("[INFO] This process will run until terminated");
console.log("[INFO] On shutdown, it will perform cleanup operations");

let count = 0;
let isShuttingDown = false;

const interval = setInterval(() => {
	if (isShuttingDown) return;
	count++;
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] Processing task ${count}...`);
}, 1500);

const gracefulShutdown = async (signal) => {
	if (isShuttingDown) return;
	isShuttingDown = true;

	clearInterval(interval);
	console.log(
		`\n[SHUTDOWN] Received ${signal}, initiating graceful shutdown...`,
	);
	console.log("[SHUTDOWN] Saving current state...");
	await new Promise((resolve) => setTimeout(resolve, 500));

	console.log("[SHUTDOWN] Closing database connections...");
	await new Promise((resolve) => setTimeout(resolve, 500));

	console.log("[SHUTDOWN] Flushing cache...");
	await new Promise((resolve) => setTimeout(resolve, 500));

	console.log("[SHUTDOWN] Cleanup complete. Exiting gracefully.");
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
