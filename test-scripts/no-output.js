#!/usr/bin/env bun

// Process that runs but produces no output
console.log("[INFO] Silent process started");
console.log("[INFO] This process will run silently for 10 seconds");

// Just wait without outputting anything
await new Promise((resolve) => setTimeout(resolve, 10000));

console.log("[INFO] Silent process completed");
process.exit(0);
