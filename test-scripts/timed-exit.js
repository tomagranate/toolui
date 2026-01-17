#!/usr/bin/env bun

// Runs for 5 seconds then stops
const startTime = Date.now();
const duration = 5000; // 5 seconds

console.log(`[START] Process started at ${new Date().toISOString()}`);
console.log(`[INFO] This process will run for ${duration / 1000} seconds`);

let iteration = 0;
const interval = setInterval(() => {
	const elapsed = Date.now() - startTime;
	const remaining = Math.max(0, duration - elapsed);

	iteration++;
	console.log(
		`[${iteration}] Working... (${Math.floor(remaining / 1000)}s remaining)`,
	);

	if (elapsed >= duration) {
		clearInterval(interval);
		console.log(`[END] Process completed after ${duration / 1000} seconds`);
		console.log(`[INFO] Total iterations: ${iteration}`);
		process.exit(0);
	}
}, 1000);
