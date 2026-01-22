#!/usr/bin/env bun

// Immediate error exit with code 1
console.log("[CRASH] Starting process...");
console.log("[CRASH] Loading configuration...");
console.error(
	"[CRASH] FATAL: Missing required environment variable: DATABASE_URL",
);
console.error("[CRASH] Cannot continue without database connection");
process.exit(1);
