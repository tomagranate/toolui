#!/usr/bin/env bun

// Tests empty line handling
console.log("[BLANK] Testing blank and whitespace line handling");
console.log("");
console.log("[BLANK] Line after single blank");
console.log("");
console.log("");
console.log("[BLANK] Line after double blank");
console.log("   ");
console.log("[BLANK] Line after whitespace-only line (3 spaces)");
console.log("\t");
console.log("[BLANK] Line after tab-only line");
console.log("");
console.log("");
console.log("");
console.log("[BLANK] Line after triple blank");

let count = 0;
const interval = setInterval(() => {
	count++;
	console.log(`[BLANK] Update ${count}`);

	if (count % 2 === 0) {
		console.log(""); // Add blank line
	}

	if (count % 5 === 0) {
		console.log("");
		console.log("");
		console.log(`[BLANK] After double blank - update ${count}`);
	}
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("");
	console.log("[BLANK] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("");
	console.log("[BLANK] Shutting down");
	process.exit(0);
});
