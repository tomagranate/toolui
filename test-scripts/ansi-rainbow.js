#!/usr/bin/env bun

// Full ANSI escape sequence coverage
const ESC = "\x1b[";
const RESET = `${ESC}0m`;

console.log("[ANSI] Testing ANSI color and style rendering\n");

// Basic 16 colors
console.log("=== Basic 16 Colors ===");
console.log(
	`${ESC}30mBlack${RESET} ${ESC}31mRed${RESET} ${ESC}32mGreen${RESET} ${ESC}33mYellow${RESET} ${ESC}34mBlue${RESET} ${ESC}35mMagenta${RESET} ${ESC}36mCyan${RESET} ${ESC}37mWhite${RESET}`,
);
console.log(
	`${ESC}90mBright Black${RESET} ${ESC}91mBright Red${RESET} ${ESC}92mBright Green${RESET} ${ESC}93mBright Yellow${RESET} ${ESC}94mBright Blue${RESET} ${ESC}95mBright Magenta${RESET} ${ESC}96mBright Cyan${RESET} ${ESC}97mBright White${RESET}`,
);

// Background colors
console.log("\n=== Background Colors ===");
console.log(
	`${ESC}40m BG-Black ${RESET} ${ESC}41m BG-Red ${RESET} ${ESC}42m BG-Green ${RESET} ${ESC}43m BG-Yellow ${RESET} ${ESC}44m BG-Blue ${RESET} ${ESC}45m BG-Magenta ${RESET} ${ESC}46m BG-Cyan ${RESET} ${ESC}47m BG-White ${RESET}`,
);

// Text styles
console.log("\n=== Text Styles ===");
console.log(
	`${ESC}1mBold${RESET} | ${ESC}2mDim${RESET} | ${ESC}3mItalic${RESET} | ${ESC}4mUnderline${RESET} | ${ESC}5mBlink${RESET} | ${ESC}7mReverse${RESET} | ${ESC}9mStrikethrough${RESET}`,
);

// Reverse/Inverse demo with colors
console.log("\n=== Reverse/Inverse Demo ===");
console.log(
	`${ESC}31;44m Red on Blue (normal) ${RESET} → ${ESC}7;31;44m Red on Blue (reversed) ${RESET}`,
);
console.log(
	`${ESC}32;43m Green on Yellow (normal) ${RESET} → ${ESC}7;32;43m Green on Yellow (reversed) ${RESET}`,
);
console.log(
	`${ESC}97;45m White on Magenta (normal) ${RESET} → ${ESC}7;97;45m White on Magenta (reversed) ${RESET}`,
);

// Combined styles
console.log("\n=== Combined Styles ===");
console.log(
	`${ESC}1;31mBold Red${RESET} | ${ESC}1;4;32mBold Underline Green${RESET} | ${ESC}3;33mItalic Yellow${RESET}`,
);
console.log(`${ESC}1;4;3;35mBold+Underline+Italic Magenta${RESET}`);

// 256 color mode
console.log("\n=== 256 Colors (sample) ===");
let line256 = "";
for (let i = 16; i < 52; i++) {
	line256 += `${ESC}38;5;${i}m█${RESET}`;
}
console.log(line256);

line256 = "";
for (let i = 52; i < 88; i++) {
	line256 += `${ESC}38;5;${i}m█${RESET}`;
}
console.log(line256);

// RGB colors (24-bit)
console.log("\n=== RGB Colors (24-bit) ===");
let rgbLine = "";
for (let r = 0; r < 255; r += 25) {
	rgbLine += `${ESC}38;2;${r};100;200m█${RESET}`;
}
console.log(`${rgbLine} (red gradient)`);

rgbLine = "";
for (let g = 0; g < 255; g += 25) {
	rgbLine += `${ESC}38;2;100;${g};200m█${RESET}`;
}
console.log(`${rgbLine} (green gradient)`);

// Nested/overlapping attributes
console.log("\n=== Nested Attributes ===");
console.log(
	`${ESC}31mRed ${ESC}1mNow Bold ${ESC}4mNow Underlined${ESC}22m No Bold${ESC}24m No Underline${RESET} Back to normal`,
);

// Real-world log levels
console.log("\n=== Log Level Simulation ===");
console.log(
	`${ESC}90m[DEBUG]${RESET} ${ESC}2mThis is debug information${RESET}`,
);
console.log(`${ESC}34m[INFO]${RESET}  Normal information message`);
console.log(
	`${ESC}33m[WARN]${RESET}  ${ESC}33mWarning: something might be wrong${RESET}`,
);
console.log(
	`${ESC}31m[ERROR]${RESET} ${ESC}1;31mError: something went wrong!${RESET}`,
);
console.log(
	`${ESC}1;37;41m[FATAL]${RESET} ${ESC}1;31mFatal: system is crashing!${RESET}`,
);

let count = 0;
const interval = setInterval(() => {
	count++;
	const hue = (count * 30) % 360;
	// HSL to RGB approximation for rainbow effect
	const r = Math.floor(128 + 127 * Math.sin((hue * Math.PI) / 180));
	const g = Math.floor(128 + 127 * Math.sin(((hue + 120) * Math.PI) / 180));
	const b = Math.floor(128 + 127 * Math.sin(((hue + 240) * Math.PI) / 180));
	console.log(
		`${ESC}38;2;${r};${g};${b}m[RAINBOW ${count}]${RESET} Color cycling update #${count}`,
	);
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log(`${ESC}32m[ANSI] Shutting down${RESET}`);
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log(`${ESC}32m[ANSI] Shutting down${RESET}`);
	process.exit(0);
});
