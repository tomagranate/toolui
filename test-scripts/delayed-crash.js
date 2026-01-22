#!/usr/bin/env bun

// Runs normally for a period, then crashes
console.log("[DELAYED] Process started successfully");
console.log("[DELAYED] Will crash in approximately 12 seconds...");

let count = 0;
const crashAfter = 12000; // 12 seconds
const startTime = Date.now();

const interval = setInterval(() => {
	count++;
	const elapsed = Math.floor((Date.now() - startTime) / 1000);
	const remaining = Math.max(0, 12 - elapsed);
	console.log(
		`[DELAYED] Working... iteration ${count} (crash in ${remaining}s)`,
	);

	if (Date.now() - startTime >= crashAfter) {
		clearInterval(interval);
		console.error("[DELAYED] ERROR: Simulated fatal error occurred!");
		console.error("[DELAYED] Memory corruption detected at 0xDEADBEEF");
		console.error("[DELAYED] Process terminating with error code 1");
		process.exit(1);
	}
}, 1500);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[DELAYED] Received SIGTERM before crash");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[DELAYED] Received SIGINT before crash");
	process.exit(0);
});
