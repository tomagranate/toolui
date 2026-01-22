#!/usr/bin/env bun

// Extended graceful shutdown - takes 6 seconds to cleanup
console.log("[SLOW-SHUTDOWN] Process started");
console.log(
	"[SLOW-SHUTDOWN] This process takes 6 seconds to shut down gracefully",
);

let count = 0;
let isShuttingDown = false;

const interval = setInterval(() => {
	if (isShuttingDown) return;
	count++;
	console.log(`[SLOW-SHUTDOWN] Working... iteration ${count}`);
}, 1500);

const gracefulShutdown = async (signal) => {
	if (isShuttingDown) return;
	isShuttingDown = true;
	clearInterval(interval);

	console.log(`\n[SLOW-SHUTDOWN] Received ${signal}`);
	console.log("[SLOW-SHUTDOWN] Beginning extended cleanup sequence...");

	console.log("[SLOW-SHUTDOWN] Step 1/6: Stopping new requests...");
	await new Promise((r) => setTimeout(r, 1000));

	console.log("[SLOW-SHUTDOWN] Step 2/6: Waiting for in-flight requests...");
	await new Promise((r) => setTimeout(r, 1000));

	console.log("[SLOW-SHUTDOWN] Step 3/6: Flushing write buffers...");
	await new Promise((r) => setTimeout(r, 1000));

	console.log("[SLOW-SHUTDOWN] Step 4/6: Closing database connections...");
	await new Promise((r) => setTimeout(r, 1000));

	console.log("[SLOW-SHUTDOWN] Step 5/6: Persisting state to disk...");
	await new Promise((r) => setTimeout(r, 1000));

	console.log("[SLOW-SHUTDOWN] Step 6/6: Final cleanup...");
	await new Promise((r) => setTimeout(r, 1000));

	console.log("[SLOW-SHUTDOWN] Graceful shutdown complete!");
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
