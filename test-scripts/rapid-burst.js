#!/usr/bin/env bun

// High-volume output stress test - 50 lines rapidly, then pause, repeat
let burstCount = 0;

console.log("[BURST] Starting rapid burst logging test");

const doBurst = () => {
	burstCount++;
	console.log(`[BURST] === Starting burst #${burstCount} ===`);

	for (let i = 1; i <= 50; i++) {
		const timestamp = new Date().toISOString();
		console.log(
			`[BURST ${burstCount}] Line ${i.toString().padStart(2, "0")}/50 - ` +
				`${timestamp} - Data: ${Math.random().toString(36).substring(2, 10)}`,
		);
	}

	console.log(`[BURST] === Burst #${burstCount} complete, pausing 5s ===`);
};

doBurst();
const interval = setInterval(doBurst, 5000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[BURST] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[BURST] Shutting down");
	process.exit(0);
});
