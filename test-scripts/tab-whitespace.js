#!/usr/bin/env bun

// Tests tab and whitespace character rendering
console.log("[TAB] Testing tab and whitespace rendering\n");

// Basic tabs
console.log("Col1\tCol2\tCol3\tCol4");
console.log("A\tB\tC\tD");
console.log("Short\tMediumText\tLongerTextHere\tX");
console.log("1\t22\t333\t4444");

console.log("\n[TAB] Make-style output:");
console.log("target:\tdependency");
console.log('\t@echo "Building..."');
console.log("\t$(CC) -o output input.c");
console.log('\t@echo "Done"');

console.log("\n[TAB] Indentation levels:");
console.log("Level 0");
console.log("\tLevel 1");
console.log("\t\tLevel 2");
console.log("\t\t\tLevel 3");
console.log("\t\t\t\tLevel 4");

console.log("\n[TAB] Mixed tabs and spaces:");
console.log("    4 spaces");
console.log("\t1 tab");
console.log("  \t2 spaces then tab");
console.log("\t  tab then 2 spaces");
console.log("    \t    4 spaces, tab, 4 spaces");

console.log("\n[TAB] Table alignment:");
console.log("Name\t\tAge\tCity");
console.log("Alice\t\t30\tNew York");
console.log("Bob\t\t25\tLos Angeles");
console.log("Charlie\t\t35\tChicago");

let count = 0;
const interval = setInterval(() => {
	count++;
	console.log(`[TAB]\tUpdate\t${count}\t${new Date().toISOString()}`);
}, 3000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[TAB] Shutting down");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[TAB] Shutting down");
	process.exit(0);
});
