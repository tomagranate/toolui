#!/usr/bin/env bun

// Baseline normal process - outputs one line every 2 seconds
const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const GREEN = `${ESC}32m`;
const CYAN = `${ESC}36m`;
const YELLOW = `${ESC}33m`;
const DIM = `${ESC}2m`;

let count = 0;

console.log(`${GREEN}[HEARTBEAT]${RESET} Process started`);

const interval = setInterval(() => {
	count++;
	const timestamp = new Date().toISOString();
	console.log(
		`${DIM}[${timestamp}]${RESET} ${CYAN}Heartbeat #${count}${RESET} - All systems nominal`,
	);
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log(
		`${YELLOW}[HEARTBEAT]${RESET} Received SIGTERM, shutting down gracefully`,
	);
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log(
		`${YELLOW}[HEARTBEAT]${RESET} Received SIGINT, shutting down gracefully`,
	);
	process.exit(0);
});
