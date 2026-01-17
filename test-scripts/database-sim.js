#!/usr/bin/env bun

// Simulates a database process
console.log("[DB] Initializing database connection pool...");
console.log("[DB] Connection pool ready (10 connections)");

let queryCount = 0;
const interval = setInterval(() => {
	queryCount++;
	const timestamp = new Date().toISOString();
	console.log(
		`[${timestamp}] [DB] Executed query #${queryCount} (SELECT * FROM users)`,
	);
}, 3000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("\n[DB] Graceful shutdown initiated...");
	console.log("[DB] Closing all active connections...");
	setTimeout(() => {
		console.log("[DB] All connections closed. Database stopped.");
		process.exit(0);
	}, 1500);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("\n[DB] Graceful shutdown initiated...");
	console.log("[DB] Closing all active connections...");
	setTimeout(() => {
		console.log("[DB] All connections closed. Database stopped.");
		process.exit(0);
	}, 1500);
});
