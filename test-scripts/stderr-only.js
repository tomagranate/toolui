#!/usr/bin/env bun

// All output goes to stderr
console.error("[STDERR] Process started - all output is stderr");
console.error("[STDERR] This tests stderr-only stream handling");

let count = 0;
const interval = setInterval(() => {
	count++;
	const timestamp = new Date().toISOString();
	console.error(`[STDERR] ${timestamp} - Error log #${count}`);

	if (count % 3 === 0) {
		console.error(
			`[STDERR] Warning: High memory usage detected (${60 + count}%)`,
		);
	}
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.error("[STDERR] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.error("[STDERR] Shutting down");
	process.exit(0);
});
