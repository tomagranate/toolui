#!/usr/bin/env bun

// Tests wide characters and special Unicode text
console.log("[UNICODE] Testing Unicode and emoji rendering");

// Emoji
console.log("[EMOJI] Simple: 👍 🎉 🚀 ✅ ❌ ⚠️ 💡 🔥 ⭐ 🎯");
console.log("[EMOJI] Sequence: 👨‍👩‍👧‍👦 👩‍💻 🏳️‍🌈 🇺🇸 🇯🇵 🇬🇧");
console.log("[EMOJI] Mixed: Status: ✅ Pass | ❌ Fail | ⚠️ Warn | 🔄 Running");

// CJK Characters (double-width)
console.log("[CJK] Japanese: 日本語テスト - こんにちは世界");
console.log("[CJK] Chinese: 中文测试 - 你好世界");
console.log("[CJK] Korean: 한국어 테스트 - 안녕하세요");

// Mixed width in same line
console.log("[MIXED] Start日本語Middle한국어End");
console.log("[MIXED] Status: 処理中... (50%) 진행 중...");

// Box drawing characters
console.log("[BOX] ┌────────────────┐");
console.log("[BOX] │  Box Drawing   │");
console.log("[BOX] └────────────────┘");

// Mathematical symbols
console.log("[MATH] ∑(i=1 to n) = n(n+1)/2  |  √2 ≈ 1.414  |  π ≈ 3.14159");

// Combining characters
console.log("[COMBINE] Café résumé naïve");
console.log("[COMBINE] Z̤͔ͧ̑a̢l̜̹̓g̫̝̿o̫̝̿ text test");

// Zero-width characters
console.log("[ZERO-WIDTH] Normal|​|Zero-width-space|‌|Zero-width-non-joiner");

let count = 0;
const interval = setInterval(() => {
	count++;
	const emojis = ["✅", "❌", "⚠️", "🔄", "⏳", "🎯", "💡", "🔥"];
	const emoji = emojis[count % emojis.length];
	console.log(
		`[UPDATE ${count}] ${emoji} Processing 処理 #${count} - Status: 진행중`,
	);
}, 2000);

process.on("SIGTERM", () => {
	clearInterval(interval);
	console.log("[UNICODE] Shutting down 終了 🛑");
	process.exit(0);
});

process.on("SIGINT", () => {
	clearInterval(interval);
	console.log("[UNICODE] Shutting down 終了 🛑");
	process.exit(0);
});
