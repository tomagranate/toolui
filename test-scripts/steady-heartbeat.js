#!/usr/bin/env bun

// Baseline normal process - outputs one line every 2 seconds
let count = 0;

console.log("[HEARTBEAT] Process started");

const interval = setInterval(() => {
	count++;
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] Heartbeat #${count} - All systems nominal`);
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[HEARTBEAT] Received SIGTERM, shutting down gracefully");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[HEARTBEAT] Received SIGINT, shutting down gracefully");
	process.exit(0);
});
