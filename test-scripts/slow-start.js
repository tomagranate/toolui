#!/usr/bin/env bun

// Starts slowly, then runs continuously
console.log("[INIT] Initializing...");
await new Promise((resolve) => setTimeout(resolve, 2000));

console.log("[INIT] Loading dependencies...");
await new Promise((resolve) => setTimeout(resolve, 1500));

console.log("[INIT] Establishing connections...");
await new Promise((resolve) => setTimeout(resolve, 1000));

console.log("[READY] System ready! Starting continuous logging...");

let count = 0;
const interval = setInterval(() => {
	count++;
	console.log(`[FAST] Quick update ${count} - ${new Date().toISOString()}`);
}, 1000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("\n[SHUTDOWN] Gracefully shutting down...");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("\n[SHUTDOWN] Gracefully shutting down...");
	process.exit(0);
});
