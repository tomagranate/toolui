#!/usr/bin/env bun

// Rapid alternation between stdout and stderr
console.log("[INTERLEAVE] Starting rapid stdout/stderr interleaving");

let count = 0;
const interval = setInterval(() => {
	count++;

	// Rapidly alternate between stdout and stderr
	console.log(`[STDOUT ${count}A] Standard output message`);
	console.error(`[STDERR ${count}B] Error output message`);
	console.log(`[STDOUT ${count}C] Another stdout line`);
	console.error(`[STDERR ${count}D] Another stderr line`);

	if (count % 5 === 0) {
		// Burst of one type
		console.error(`[STDERR BURST] Error burst 1`);
		console.error(`[STDERR BURST] Error burst 2`);
		console.error(`[STDERR BURST] Error burst 3`);
		console.log(`[STDOUT] Back to normal`);
	}
}, 500);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[INTERLEAVE] Shutting down (stdout)");
	console.error("[INTERLEAVE] Shutting down (stderr)");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[INTERLEAVE] Shutting down (stdout)");
	console.error("[INTERLEAVE] Shutting down (stderr)");
	process.exit(0);
});
