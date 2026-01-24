#!/usr/bin/env bun

// Generates 110000 lines of output for extreme volume performance testing
console.log("[110K] Starting 110000 line volume test");
console.log("[110K] WARNING: This generates a HUGE amount of output!");
console.log("[110K] Generating lines in batches...\n");

const totalLines = 110000;
const batchSize = 500;
let lineCount = 0;

const services = [
	"api",
	"db",
	"cache",
	"auth",
	"worker",
	"gateway",
	"scheduler",
];
const actions = [
	"request",
	"response",
	"query",
	"update",
	"insert",
	"delete",
	"validate",
];

const generateBatch = () => {
	const batchEnd = Math.min(lineCount + batchSize, totalLines);

	while (lineCount < batchEnd) {
		lineCount++;
		const timestamp = new Date().toISOString();
		const level = ["DEBUG", "DEBUG", "INFO", "INFO", "INFO", "WARN", "ERROR"][
			lineCount % 7
		];
		const service = services[lineCount % services.length];
		const action = actions[lineCount % actions.length];
		const reqId = `REQ-${lineCount.toString().padStart(6, "0")}`;
		const duration = Math.floor(Math.random() * 500);

		console.log(
			`[${timestamp}] [${level.padEnd(5)}] [${service.padEnd(9)}] ${reqId} - ` +
				`${action} completed in ${duration}ms`,
		);
	}

	// Progress indicator every 10000 lines
	if (lineCount % 10000 === 0) {
		const pct = Math.floor((lineCount / totalLines) * 100);
		console.log(
			`[110K] === Progress: ${lineCount}/${totalLines} (${pct}%) ===`,
		);
	}

	if (lineCount < totalLines) {
		// Small delay between batches to prevent blocking
		setTimeout(generateBatch, 10);
	} else {
		console.log(`\n[110K] === Completed generating ${totalLines} lines ===`);
		console.log("[110K] Now running with periodic updates...");
		startPeriodicUpdates();
	}
};

const startPeriodicUpdates = () => {
	let updateCount = 0;
	const interval = setInterval(() => {
		updateCount++;
		console.log(
			`[110K] Continuation update #${updateCount} at ${new Date().toISOString()}`,
		);
	}, 5000);

	process.on("SIGTERM", () => {
		clearInterval(interval);
		console.log("[110K] Shutting down");
		process.exit(0);
	});

	process.on("SIGINT", () => {
		clearInterval(interval);
		console.log("[110K] Shutting down");
		process.exit(0);
	});
};

// Handle early termination
process.on("SIGTERM", () => {
	console.log("[110K] Shutting down early");
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("[110K] Shutting down early");
	process.exit(0);
});

// Start generation
generateBatch();
