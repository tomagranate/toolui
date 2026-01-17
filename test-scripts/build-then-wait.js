#!/usr/bin/env bun

// Builds something, then waits for cleanup
console.log("[BUILD] Starting build process...");
console.log("[BUILD] Compiling TypeScript...");
await new Promise((resolve) => setTimeout(resolve, 1500));
console.log("[BUILD] TypeScript compilation complete");

console.log("[BUILD] Bundling assets...");
await new Promise((resolve) => setTimeout(resolve, 1500));
console.log("[BUILD] Asset bundling complete");

console.log("[BUILD] Optimizing images...");
await new Promise((resolve) => setTimeout(resolve, 1000));
console.log("[BUILD] Image optimization complete");

console.log("[BUILD] Build complete! Output in ./dist");
console.log("[BUILD] Waiting for cleanup signal...");

let isShuttingDown = false;
const gracefulShutdown = async (signal) => {
	if (isShuttingDown) return;
	isShuttingDown = true;

	console.log(`\n[CLEANUP] Received ${signal}, cleaning up build artifacts...`);
	console.log("[CLEANUP] Removing build cache...");
	await new Promise((resolve) => setTimeout(resolve, 600));

	console.log("[CLEANUP] Cleaning temporary files...");
	await new Promise((resolve) => setTimeout(resolve, 600));

	console.log("[CLEANUP] Cleanup complete.");
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Keep process alive
await new Promise(() => {});
