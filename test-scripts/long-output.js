#!/usr/bin/env bun

// Generates a very long output stream
console.log("Starting long output generator...");
console.log("This script will produce thousands of lines of output");

const linesPerBatch = 100;
const totalBatches = 50; // 5000 lines total
let batchCount = 0;

const generateBatch = () => {
	for (let i = 0; i < linesPerBatch; i++) {
		const lineNumber = batchCount * linesPerBatch + i + 1;
		const timestamp = new Date().toISOString();
		const randomData = Math.random().toString(36).substring(2, 15);
		const randomValue = Math.floor(Math.random() * 10000);

		console.log(
			`[${timestamp}] Line ${lineNumber.toString().padStart(5, "0")}: ` +
				`Processing item ${randomData} with value ${randomValue} ` +
				`- Status: ${["pending", "processing", "completed", "failed"][Math.floor(Math.random() * 4)]} ` +
				`- Memory: ${(Math.random() * 100).toFixed(2)}MB ` +
				`- CPU: ${(Math.random() * 100).toFixed(1)}%`,
		);
	}

	batchCount++;

	if (batchCount < totalBatches) {
		// Small delay to make it more realistic
		setTimeout(generateBatch, 100);
	} else {
		console.log(
			`\nCompleted generating ${totalBatches * linesPerBatch} lines of output`,
		);
		console.log("Script will continue running until terminated...");

		// Continue with periodic updates
		let continuationCount = 0;
		const continuationInterval = setInterval(() => {
			continuationCount++;
			const timestamp = new Date().toISOString();
			console.log(
				`[${timestamp}] Continuation update ${continuationCount}: ` +
					`Still running after ${totalBatches * linesPerBatch} initial lines`,
			);
		}, 5000);

		process.on("SIGTERM", () => {
			clearInterval(continuationInterval);
			console.log("\n[SHUTDOWN] Long output generator stopped");
			process.exit(0);
		});

		process.on("SIGINT", () => {
			clearInterval(continuationInterval);
			console.log("\n[SHUTDOWN] Long output generator stopped");
			process.exit(0);
		});
	}
};

// Start generating batches
generateBatch();

// Also handle early termination
process.on("SIGTERM", () => {
	console.log("\n[SHUTDOWN] Long output generator stopped early");
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("\n[SHUTDOWN] Long output generator stopped early");
	process.exit(0);
});
