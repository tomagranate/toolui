#!/usr/bin/env bun

// Rapidly outputs many logs
console.log("[RAPID] Starting rapid-fire logging test");

for (let i = 1; i <= 100; i++) {
	console.log(
		`[LOG ${i}] This is log message number ${i} at ${new Date().toISOString()}`,
	);
	// Small delay to make it readable but still rapid
	await new Promise((resolve) => setTimeout(resolve, 50));
}

console.log("[RAPID] Rapid-fire logging complete - 100 messages sent");
process.exit(0);
