#!/usr/bin/env bun

// Writes a bunch of logs at the beginning then stops
console.log("Starting initialization...");
console.log("Loading configuration files...");
console.log("Connecting to database...");
console.log("Database connection established");
console.log("Loading user data...");
console.log("User data loaded: 1,234 users");
console.log("Loading product catalog...");
console.log("Product catalog loaded: 567 products");
console.log("Initializing cache...");
console.log("Cache initialized with 10MB capacity");
console.log("Starting HTTP server...");
console.log("HTTP server listening on port 3000");
console.log("All systems ready!");
console.log("\n[INFO] Initialization complete. Process will exit now.");
console.log("[INFO] This process has finished its work.");

// Exit after a short delay to ensure all logs are flushed
setTimeout(() => {
	process.exit(0);
}, 100);
