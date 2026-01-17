#!/usr/bin/env bun

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
	bgYellow: "\x1b[43m",
	bgBlue: "\x1b[44m",
};

console.log(
	`${colors.green}${colors.bright}[SUCCESS]${colors.reset} Application started successfully`,
);
console.log(`${colors.blue}[INFO]${colors.reset} Initializing components...`);
console.log(
	`${colors.yellow}[WARNING]${colors.reset} Configuration file not found, using defaults`,
);
console.log(
	`${colors.red}[ERROR]${colors.reset} Failed to connect to database`,
);
console.log(
	`${colors.cyan}[DEBUG]${colors.reset} Processing user request: ID 12345`,
);
console.log(
	`${colors.magenta}[TRACE]${colors.reset} Entering function: processData()`,
);

let count = 0;
const interval = setInterval(() => {
	count++;
	const timestamp = new Date().toISOString();

	// Rotate through different color combinations
	const colorPairs = [
		{ fg: colors.green, label: "SUCCESS" },
		{ fg: colors.blue, label: "INFO" },
		{ fg: colors.yellow, label: "WARNING" },
		{ fg: colors.red, label: "ERROR" },
		{ fg: colors.cyan, label: "DEBUG" },
		{ fg: colors.magenta, label: "TRACE" },
	];

	const colorPair = colorPairs[count % colorPairs.length];
	const bgColor = count % 2 === 0 ? colors.bgBlue : colors.bgGreen;

	console.log(
		`${colorPair.fg}${colors.bright}[${colorPair.label}]${colors.reset} ` +
			`${bgColor}${colors.white}${timestamp}${colors.reset} ` +
			`${colors.dim}Iteration ${count}${colors.reset}`,
	);

	// Also output colored text to stderr occasionally
	if (count % 3 === 0) {
		console.error(
			`${colors.red}${colors.bright}[STDERR]${colors.reset} ` +
				`${colors.yellow}This is a colored error message ${count}${colors.reset}`,
		);
	}
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log(
		`\n${colors.green}${colors.bright}[SHUTDOWN]${colors.reset} Gracefully shutting down...`,
	);
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log(
		`\n${colors.green}${colors.bright}[SHUTDOWN]${colors.reset} Gracefully shutting down...`,
	);
	process.exit(0);
});
