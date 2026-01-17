#!/usr/bin/env bun

// Simulates a process that errors out
console.log("[INFO] Starting error simulation...");
console.log("[INFO] Loading critical module...");
console.log("[INFO] Module loaded successfully");
console.log("[WARN] Detected potential issue...");
console.log("[ERROR] Failed to connect to required service");
console.log("[ERROR] Service unavailable: connection timeout");
console.log("[ERROR] Cannot proceed without service connection");
console.log("[FATAL] Process must exit with error code");

// Exit with error code
process.exit(1);
