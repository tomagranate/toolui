#!/usr/bin/env bun

// Does work, then waits for cleanup signal
console.log("[WORK] Starting work process...");
console.log("[WORK] Processing batch 1...");
await new Promise((resolve) => setTimeout(resolve, 1000));
console.log("[WORK] Batch 1 complete");

console.log("[WORK] Processing batch 2...");
await new Promise((resolve) => setTimeout(resolve, 1000));
console.log("[WORK] Batch 2 complete");

console.log("[WORK] Processing batch 3...");
await new Promise((resolve) => setTimeout(resolve, 1000));
console.log("[WORK] Batch 3 complete");

console.log("[WORK] All work complete. Waiting for cleanup signal...");
console.log("[WORK] Process is ready for graceful shutdown.");

// Wait for shutdown signal
let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
	if (isShuttingDown) return;
	isShuttingDown = true;

	console.log(`\n[CLEANUP] Received ${signal}, starting cleanup...`);
	console.log("[CLEANUP] Removing temporary files...");
	await new Promise((resolve) => setTimeout(resolve, 800));

	console.log("[CLEANUP] Archiving results...");
	await new Promise((resolve) => setTimeout(resolve, 800));

	console.log("[CLEANUP] Cleanup complete. Exiting.");
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Keep process alive
await new Promise(() => {});
