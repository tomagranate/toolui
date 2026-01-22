#!/usr/bin/env bun

// Generates 5000 lines of output for scroll performance testing
console.log("[5K] Starting 5000 line volume test");
console.log("[5K] Generating lines in batches...\n");

const totalLines = 5000;
const batchSize = 100;
let lineCount = 0;

const generateBatch = () => {
	const batchEnd = Math.min(lineCount + batchSize, totalLines);

	while (lineCount < batchEnd) {
		lineCount++;
		const timestamp = new Date().toISOString();
		const level = ["DEBUG", "INFO", "WARN", "ERROR"][lineCount % 4];
		const data = Math.random().toString(36).substring(2, 12);
		console.log(
			`[${timestamp}] [${level}] Line ${lineCount.toString().padStart(5, "0")}/${totalLines} - ` +
				`Processing item ${data} - Memory: ${(40 + Math.random() * 30).toFixed(1)}% - ` +
				`CPU: ${(10 + Math.random() * 40).toFixed(1)}%`,
		);
	}

	if (lineCount < totalLines) {
		// Small delay between batches
		setTimeout(generateBatch, 50);
	} else {
		console.log(`\n[5K] === Completed generating ${totalLines} lines ===`);
		console.log("[5K] Now running with periodic updates...");
		startPeriodicUpdates();
	}
};

const startPeriodicUpdates = () => {
	let updateCount = 0;
	const interval = setInterval(() => {
		updateCount++;
		console.log(
			`[5K] Continuation update #${updateCount} at ${new Date().toISOString()}`,
		);
	}, 5000);

	process.on("SIGTERM", () => {
		clearInterval(interval);
		console.log("[5K] Shutting down");
		process.exit(0);
	});

	process.on("SIGINT", () => {
		clearInterval(interval);
		console.log("[5K] Shutting down");
		process.exit(0);
	});
};

// Handle early termination
process.on("SIGTERM", () => {
	console.log("[5K] Shutting down early");
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("[5K] Shutting down early");
	process.exit(0);
});

// Start generation
generateBatch();
