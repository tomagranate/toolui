#!/usr/bin/env bun

// Ignores SIGTERM - requires SIGKILL to stop
console.log("[STUBBORN] Process started");
console.log("[STUBBORN] WARNING: This process ignores SIGTERM!");
console.log("[STUBBORN] It will only stop with SIGKILL (force quit)");

let count = 0;
let sigtermCount = 0;

const _interval = setInterval(() => {
	count++;
	console.log(`[STUBBORN] Still running... iteration ${count}`);
}, 2000);

process.on("SIGTERM", () => {
	sigtermCount++;
	console.log(`[STUBBORN] Received SIGTERM #${sigtermCount} - IGNORING!`);
	console.log("[STUBBORN] I refuse to shut down gracefully 😈");
	// Don't exit!
});

process.on("SIGINT", () => {
	sigtermCount++;
	console.log(`[STUBBORN] Received SIGINT #${sigtermCount} - IGNORING!`);
	console.log("[STUBBORN] You'll need to force kill me!");
	// Don't exit!
});

// SIGKILL cannot be caught - process will terminate
