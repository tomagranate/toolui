#!/usr/bin/env bun

// Tests carriage return and line overwrite behavior
const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const CYAN = `${ESC}36m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const BLUE = `${ESC}34m`;
const DIM = `${ESC}2m`;

console.log(
	`${BLUE}[PROGRESS]${RESET} Testing progress bar and spinner rendering`,
);
console.log(
	`${DIM}[PROGRESS] Note: \\r sequences update the current line${RESET}\n`,
);

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIndex = 0;
let progress = 0;
let phase = "spinner"; // spinner, progress, complete

const renderProgressBar = (pct) => {
	const width = 30;
	const filled = Math.floor((pct / 100) * width);
	const empty = width - filled;
	const bar = `${GREEN}${"█".repeat(filled)}${DIM}${"░".repeat(empty)}${RESET}`;
	return `[${bar}]`;
};

const interval = setInterval(() => {
	if (phase === "spinner") {
		const frame = spinnerFrames[spinnerIndex % spinnerFrames.length];
		process.stdout.write(`\r${CYAN}${frame}${RESET} Loading dependencies...`);
		spinnerIndex++;
		if (spinnerIndex > 30) {
			console.log(`\r${GREEN}✅ Dependencies loaded!${RESET}     `);
			phase = "progress";
		}
	} else if (phase === "progress") {
		progress += Math.floor(Math.random() * 5) + 1;
		if (progress >= 100) {
			progress = 100;
			console.log(
				`\r${renderProgressBar(100)} ${GREEN}100%${RESET} - Complete!`,
			);
			console.log(`\n${GREEN}[PROGRESS]${RESET} Build finished successfully`);
			phase = "complete";
		} else {
			process.stdout.write(
				`\r${renderProgressBar(progress)} ${YELLOW}${progress}%${RESET} - Building...`,
			);
		}
	} else {
		// Complete - show occasional status updates
		const timestamp = new Date().toISOString();
		console.log(
			`${DIM}[${timestamp}]${RESET} ${CYAN}Watching for changes...${RESET}`,
		);
	}
}, 100);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log(`\n${YELLOW}[PROGRESS]${RESET} Shutting down`);
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log(`\n${YELLOW}[PROGRESS]${RESET} Shutting down`);
	process.exit(0);
});
