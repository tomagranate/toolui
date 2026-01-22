#!/usr/bin/env bun

// No output for 5 seconds during "initialization"
// Tests UI handling of processes that take time to start

// Simulate slow startup with no output
await new Promise((r) => setTimeout(r, 5000));

console.log("[STARTUP] === Process initialized after 5 second delay ===");
console.log("[STARTUP] Slow startup complete, now running normally");

let count = 0;
const interval = setInterval(() => {
	count++;
	console.log(`[STARTUP] Running... iteration ${count}`);
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[STARTUP] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[STARTUP] Shutting down");
	process.exit(0);
});
