#!/usr/bin/env bun

// Minimal output - tests long idle periods
console.log("[SILENT] Process started - will be mostly quiet");
console.log("[SILENT] Next output in 30 seconds...");

let count = 0;

// Only output every 30 seconds
const interval = setInterval(() => {
	count++;
	console.log(`[SILENT] Heartbeat #${count} - still alive (next in 30s)`);
}, 30000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[SILENT] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[SILENT] Shutting down");
	process.exit(0);
});
