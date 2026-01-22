#!/usr/bin/env bun

// Outputs realistic stack traces for testing multi-line error patterns
const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const RED = `${ESC}31m`;
const YELLOW = `${ESC}33m`;
const CYAN = `${ESC}36m`;
const DIM = `${ESC}2m`;
const BOLD = `${ESC}1m`;

console.log(`${CYAN}[STACK]${RESET} Starting stack trace generator`);
console.log(`${DIM}[STACK] Simulating errors with full traces${RESET}\n`);

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
	let trace = `${BOLD}${RED}${errorType.name}:${RESET} ${RED}${errorType.message}${RESET}\n`;
	for (const frame of errorType.files) {
		trace += `    at ${YELLOW}${frame.fn}${RESET} ${DIM}(${frame.file}:${frame.line}:11)${RESET}\n`;
	}
	// Add some common trailing frames
	trace += `    at ${YELLOW}processTicksAndRejections${RESET} ${DIM}(node:internal/process/task_queues:95:5)${RESET}\n`;
	trace += `    at ${YELLOW}async Promise.all${RESET} ${DIM}(index 0)${RESET}`;
	return trace;
};

let count = 0;
const interval = setInterval(() => {
	count++;

	if (count % 3 === 0) {
		// Generate an error with stack trace
		const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
		console.error(`\n${RED}[ERROR #${count}]${RESET} Caught exception:`);
		console.error(generateStackTrace(errorType));
		console.error(`${RED}[ERROR #${count}]${RESET} End of stack trace\n`);
	} else {
		// Normal log line
		const timestamp = new Date().toISOString();
		console.log(`${DIM}[${timestamp}]${RESET} Processing request #${count}...`);
	}
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log(`${YELLOW}[STACK]${RESET} Shutting down`);
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log(`${YELLOW}[STACK]${RESET} Shutting down`);
	process.exit(0);
});
