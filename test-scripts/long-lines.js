#!/usr/bin/env bun

// Tests horizontal overflow and line wrapping with varying line lengths
console.log("[LONG] Testing lines of varying lengths");

const generateLine = (length, label) => {
	const prefix = `[${label}] `;
	const remaining = length - prefix.length;
	const chars =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let content = "";
	for (let i = 0; i < remaining; i++) {
		content += chars[i % chars.length];
	}
	return prefix + content;
};

// Initial batch of different lengths
console.log(generateLine(50, "50-CHARS"));
console.log(generateLine(100, "100-CHARS"));
console.log(generateLine(150, "150-CHARS"));
console.log(generateLine(200, "200-CHARS"));
console.log(generateLine(300, "300-CHARS"));
console.log(generateLine(500, "500-CHARS"));
console.log(generateLine(800, "800-CHARS"));
console.log(generateLine(1000, "1000-CHARS"));

// Line with no natural break points (no spaces)
console.log(`[NO-BREAKS] ${"x".repeat(300)}`);

// Line with some break points
console.log(`[WITH-BREAKS] ${Array(30).fill("word").join(" ")}`);

let count = 0;
const interval = setInterval(() => {
	count++;
	const length = 100 + Math.floor(Math.random() * 400);
	console.log(generateLine(length, `UPDATE-${count}`));
}, 3000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[LONG] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[LONG] Shutting down");
	process.exit(0);
});
