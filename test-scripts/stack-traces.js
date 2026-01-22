#!/usr/bin/env bun

// Outputs realistic stack traces for testing multi-line error patterns
console.log("[STACK] Starting stack trace generator");
console.log("[STACK] Simulating errors with full traces\n");

const errorTypes = [
	{
		name: "TypeError",
		message: "Cannot read properties of undefined (reading 'map')",
		files: [
			{ file: "src/components/UserList.tsx", line: 42, fn: "UserList" },
			{ file: "src/hooks/useUsers.ts", line: 15, fn: "useUsers" },
			{
				file: "node_modules/react/cjs/react.development.js",
				line: 1456,
				fn: "renderWithHooks",
			},
		],
	},
	{
		name: "ReferenceError",
		message: "fetchData is not defined",
		files: [
			{ file: "src/api/client.ts", line: 23, fn: "ApiClient.get" },
			{
				file: "src/services/user-service.ts",
				line: 67,
				fn: "UserService.getById",
			},
			{
				file: "src/controllers/user-controller.ts",
				line: 34,
				fn: "async handleGetUser",
			},
		],
	},
	{
		name: "SyntaxError",
		message: "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON",
		files: [
			{ file: "src/utils/parse.ts", line: 12, fn: "parseResponse" },
			{ file: "src/api/fetch.ts", line: 45, fn: "async fetchJSON" },
			{ file: "src/hooks/useQuery.ts", line: 89, fn: "async executeQuery" },
		],
	},
	{
		name: "Error",
		message: "ECONNREFUSED: Connection refused to localhost:5432",
		files: [
			{ file: "src/db/connection.ts", line: 28, fn: "DatabasePool.connect" },
			{ file: "src/db/query.ts", line: 56, fn: "async executeQuery" },
			{
				file: "src/repositories/user-repo.ts",
				line: 19,
				fn: "async UserRepository.findAll",
			},
		],
	},
];

const generateStackTrace = (errorType) => {
	let trace = `${errorType.name}: ${errorType.message}\n`;
	for (const frame of errorType.files) {
		trace += `    at ${frame.fn} (${frame.file}:${frame.line}:11)\n`;
	}
	// Add some common trailing frames
	trace += `    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n`;
	trace += `    at async Promise.all (index 0)`;
	return trace;
};

let count = 0;
const interval = setInterval(() => {
	count++;

	if (count % 3 === 0) {
		// Generate an error with stack trace
		const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
		console.error(`\n[ERROR #${count}] Caught exception:`);
		console.error(generateStackTrace(errorType));
		console.error(`[ERROR #${count}] End of stack trace\n`);
	} else {
		// Normal log line
		const timestamp = new Date().toISOString();
		console.log(`[${timestamp}] Processing request #${count}...`);
	}
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[STACK] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[STACK] Shutting down");
	process.exit(0);
});
