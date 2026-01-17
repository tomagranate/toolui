#!/usr/bin/env bun

// Outputs to both stdout and stderr continuously
console.log("[STDOUT] Starting process with mixed output");
console.error("[STDERR] This is an error message");
console.log("[STDOUT] Processing data...");
console.error("[STDERR] Warning: Low memory detected");
console.log("[STDOUT] Data processed successfully");
console.error("[STDERR] Error: Failed to write to cache");
console.log("[STDOUT] Continuing with fallback method...");
console.error("[STDERR] Critical: Database connection lost");
console.log("[STDOUT] Attempting to reconnect...");
console.error("[STDERR] Reconnection successful");

let count = 0;
const interval = setInterval(() => {
	count++;
	if (count % 2 === 0) {
		console.log(`[STDOUT] Status update ${count}: All systems operational`);
	} else {
		console.error(`[STDERR] Status update ${count}: Minor warning detected`);
	}
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("\n[STDOUT] Shutting down gracefully...");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("\n[STDOUT] Shutting down gracefully...");
	process.exit(0);
});
