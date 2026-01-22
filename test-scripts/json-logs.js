#!/usr/bin/env bun

// Outputs newline-delimited JSON logs
console.log("[JSON] Starting JSON structured logging");

const levels = ["debug", "info", "warn", "error"];
const services = ["api", "db", "cache", "auth", "worker"];
const actions = ["request", "response", "query", "update", "delete", "create"];

const generateLog = (count) => {
	const level = levels[Math.floor(Math.random() * levels.length)];
	const service = services[Math.floor(Math.random() * services.length)];
	const action = actions[Math.floor(Math.random() * actions.length)];

	const log = {
		timestamp: new Date().toISOString(),
		level,
		service,
		action,
		requestId: `req-${count.toString().padStart(4, "0")}`,
		duration: Math.floor(Math.random() * 500),
		metadata: {
			userId: `user-${Math.floor(Math.random() * 1000)}`,
			ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
		},
	};

	// Occasionally add nested data
	if (Math.random() > 0.7) {
		log.payload = {
			items: Array.from(
				{ length: Math.floor(Math.random() * 5) + 1 },
				(_, i) => ({
					id: i,
					name: `item-${i}`,
					value: Math.random() * 100,
				}),
			),
		};
	}

	// Occasionally add error details
	if (level === "error") {
		log.error = {
			message: "Something went wrong",
			code: `ERR_${Math.floor(Math.random() * 100)}`,
			stack:
				"Error: Something went wrong\n    at processRequest (/app/src/handler.js:42:11)\n    at async Router.handle (/app/src/router.js:15:5)",
		};
	}

	return log;
};

// Initial batch
for (let i = 1; i <= 10; i++) {
	console.log(JSON.stringify(generateLog(i)));
}

// Also output some non-JSON lines occasionally
console.log("[JSON] === Non-JSON status message ===");

let count = 10;
const interval = setInterval(() => {
	count++;

	if (count % 10 === 0) {
		// Non-JSON status line
		console.log(`[JSON] Processed ${count} requests so far`);
	} else {
		console.log(JSON.stringify(generateLog(count)));
	}
}, 1500);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			level: "info",
			message: "Shutting down",
		}),
	);
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log(
		JSON.stringify({
			timestamp: new Date().toISOString(),
			level: "info",
			message: "Shutting down",
		}),
	);
	process.exit(0);
});
