#!/usr/bin/env bun

// Simulates a web server that runs continuously
console.log("[SERVER] Starting web server...");
console.log("[SERVER] Listening on http://localhost:3000");
console.log("[SERVER] Server ready!");

let requestCount = 0;
const interval = setInterval(
	() => {
		requestCount++;
		const timestamp = new Date().toISOString();
		console.log(
			`[${timestamp}] GET /api/users - 200 OK (req #${requestCount})`,
		);
	},
	2000 + Math.random() * 2000,
);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("\n[SERVER] Shutting down gracefully...");
	console.log("[SERVER] Waiting for active requests to complete...");
	setTimeout(() => {
		console.log("[SERVER] All requests completed. Server stopped.");
		process.exit(0);
	}, 1000);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("\n[SERVER] Shutting down gracefully...");
	console.log("[SERVER] Waiting for active requests to complete...");
	setTimeout(() => {
		console.log("[SERVER] All requests completed. Server stopped.");
		process.exit(0);
	}, 1000);
});
