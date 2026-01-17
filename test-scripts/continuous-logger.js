#!/usr/bin/env bun

// Continuously logs random messages every few seconds
const messages = [
	"Processing request...",
	"Database query executed",
	"Cache hit for key: user_123",
	"Rendering component: Header",
	"API call to /users completed",
	"Logging user activity",
	"Updating session data",
	"Compiling assets...",
	"Running tests...",
	"Deploying to staging",
];

let count = 0;
const interval = setInterval(
	() => {
		const message = messages[Math.floor(Math.random() * messages.length)];
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] ${message} (iteration ${++count})`);
	},
	2000 + Math.random() * 3000,
); // Random interval between 2-5 seconds

// Keep running until killed
process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("\n[Shutdown] Continuous logger stopped");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("\n[Shutdown] Continuous logger stopped");
	process.exit(0);
});
