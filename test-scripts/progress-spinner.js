#!/usr/bin/env bun

// Tests carriage return and line overwrite behavior
console.log("[PROGRESS] Testing progress bar and spinner rendering");
console.log("[PROGRESS] Note: \\r sequences update the current line\n");

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIndex = 0;
let progress = 0;
let phase = "spinner"; // spinner, progress, complete

const renderProgressBar = (pct) => {
	const width = 30;
	const filled = Math.floor((pct / 100) * width);
	const empty = width - filled;
	return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
};

const interval = setInterval(() => {
	if (phase === "spinner") {
		const frame = spinnerFrames[spinnerIndex % spinnerFrames.length];
		process.stdout.write(`\r${frame} Loading dependencies...`);
		spinnerIndex++;
		if (spinnerIndex > 30) {
			console.log("\r✅ Dependencies loaded!     ");
			phase = "progress";
		}
	} else if (phase === "progress") {
		progress += Math.floor(Math.random() * 5) + 1;
		if (progress >= 100) {
			progress = 100;
			console.log(`\r${renderProgressBar(100)} 100% - Complete!`);
			console.log("\n[PROGRESS] Build finished successfully");
			phase = "complete";
		} else {
			process.stdout.write(
				`\r${renderProgressBar(progress)} ${progress}% - Building...`,
			);
		}
	} else {
		// Complete - show occasional status updates
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] Watching for changes...`);
	}
}, 100);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("\n[PROGRESS] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("\n[PROGRESS] Shutting down");
	process.exit(0);
});
