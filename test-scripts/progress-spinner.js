#!/usr/bin/env bun

// Tests carriage return and line overwrite behavior
// Alternates between spinner and progress bar phases with pauses in between

const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const CYAN = `${ESC}36m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const BLUE = `${ESC}34m`;
const MAGENTA = `${ESC}35m`;
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
let cycle = 0;
let pauseCounter = 0;

// Phases: spinner -> pause -> progress -> pause -> (repeat)
let phase = "spinner";

const SPINNER_DURATION = 40; // ~4 seconds at 100ms interval
const PROGRESS_STEP = 3; // Progress increment per tick
const PAUSE_DURATION = 30; // ~3 seconds pause

const renderProgressBar = (pct) => {
	const width = 30;
	const filled = Math.floor((pct / 100) * width);
	const empty = width - filled;
	const bar = `${GREEN}${"█".repeat(filled)}${DIM}${"░".repeat(empty)}${RESET}`;
	return `[${bar}]`;
};

const tasks = [
	"Loading dependencies",
	"Compiling TypeScript",
	"Bundling modules",
	"Optimizing assets",
	"Running tests",
];

const interval = setInterval(() => {
	const taskName = tasks[cycle % tasks.length];

	if (phase === "spinner") {
		const frame = spinnerFrames[spinnerIndex % spinnerFrames.length];
		process.stdout.write(`\r${CYAN}${frame}${RESET} ${taskName}...`);
		spinnerIndex++;

		if (spinnerIndex >= SPINNER_DURATION) {
			console.log(`\r${GREEN}✅${RESET} ${taskName} complete!     `);
			phase = "pause-after-spinner";
			pauseCounter = 0;
		}
	} else if (phase === "pause-after-spinner") {
		pauseCounter++;
		if (pauseCounter >= PAUSE_DURATION) {
			console.log(
				`\n${MAGENTA}[LOG]${RESET} Starting build phase ${cycle + 1}...`,
			);
			phase = "progress";
			progress = 0;
		}
	} else if (phase === "progress") {
		progress += PROGRESS_STEP;

		if (progress >= 100) {
			progress = 100;
			console.log(
				`\r${renderProgressBar(100)} ${GREEN}100%${RESET} - Build complete!`,
			);
			phase = "pause-after-progress";
			pauseCounter = 0;
		} else {
			process.stdout.write(
				`\r${renderProgressBar(progress)} ${YELLOW}${progress.toString().padStart(3)}%${RESET} - Building...`,
			);
		}
	} else if (phase === "pause-after-progress") {
		pauseCounter++;
		if (pauseCounter >= PAUSE_DURATION) {
			cycle++;
			console.log(
				`\n${BLUE}[INFO]${RESET} Cycle ${cycle} finished. Starting next cycle...\n`,
			);
			phase = "spinner";
			spinnerIndex = 0;
		}
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
