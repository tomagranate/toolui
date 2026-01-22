#!/usr/bin/env bun

// Designed for comprehensive search/filter testing
console.log("[SEARCH] Starting searchable patterns generator");
console.log(
	"[SEARCH] This output is designed for testing search/filter features\n",
);

const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
const modules = ["auth", "api", "database", "cache", "worker"];

let requestId = 0;

const generateLog = () => {
	requestId++;
	const level = levels[Math.floor(Math.random() * levels.length)];
	const module = modules[Math.floor(Math.random() * modules.length)];
	const timestamp = new Date().toISOString();
	const reqId = `REQ-${requestId.toString().padStart(4, "0")}`;

	// Various patterns for search testing
	const messages = [
		`Processing request ${reqId}`,
		`User login successful for user_${Math.floor(Math.random() * 1000)}`,
		`Cache hit for key: session_${Math.floor(Math.random() * 100)}`,
		`Database query took ${Math.floor(Math.random() * 500)}ms`,
		`API response status: ${[200, 201, 400, 404, 500][Math.floor(Math.random() * 5)]}`,
		`Memory usage: ${Math.floor(Math.random() * 100)}%`,
		`Connection established to server-${Math.floor(Math.random() * 10)}`,
		`Retry attempt ${Math.floor(Math.random() * 5) + 1} of 5`,
	];

	const message = messages[Math.floor(Math.random() * messages.length)];

	return `[${timestamp}] [${level}] [${module}] ${reqId} - ${message}`;
};

// Initial batch with specific patterns
console.log(
	"[2024-01-15T10:00:00.000Z] [INFO] [auth] REQ-0001 - User login successful for user_42",
);
console.log(
	"[2024-01-15T10:00:01.000Z] [DEBUG] [api] REQ-0002 - Processing request REQ-0002",
);
console.log(
	"[2024-01-15T10:00:02.000Z] [WARN] [database] REQ-0003 - Database query took 450ms",
);
console.log(
	"[2024-01-15T10:00:03.000Z] [ERROR] [cache] REQ-0004 - Cache miss for key: session_99",
);
console.log(
	"[2024-01-15T10:00:04.000Z] [INFO] [worker] REQ-0005 - Job completed successfully",
);

// Case variation tests
console.log("[INFO] Testing case variations: Error, ERROR, error, ErRoR");
console.log(
	"[INFO] Testing word boundaries: error, errors, erroring, error-prone",
);

// Repeated word test
console.log("[DEBUG] The quick brown fox jumps over the lazy dog");
console.log("[DEBUG] The quick brown fox jumps over the lazy dog");
console.log("[DEBUG] The quick brown fox jumps over the lazy dog");

// Special characters
console.log("[INFO] Path: /var/log/app/error.log");
console.log("[INFO] Regex test: [a-z]+ and (group) and {braces}");
console.log("[INFO] Special chars: $dollar @at #hash %percent");

let count = 5;
const interval = setInterval(() => {
	count++;
	console.log(generateLog());

	// Occasionally output duplicate patterns
	if (count % 10 === 0) {
		console.log(`[INFO] Checkpoint reached at request ${count}`);
		console.log(`[INFO] Checkpoint reached at request ${count}`);
	}
}, 1500);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[SEARCH] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[SEARCH] Shutting down");
	process.exit(0);
});
