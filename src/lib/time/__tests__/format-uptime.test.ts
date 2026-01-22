import { describe, expect, test } from "bun:test";
import { formatUptime } from "../format-uptime";

describe("formatUptime", () => {
	test("formats seconds", () => {
		const now = Date.now();
		expect(formatUptime(now - 5000)).toBe("5s");
		expect(formatUptime(now - 30000)).toBe("30s");
		expect(formatUptime(now - 59000)).toBe("59s");
	});

	test("formats minutes", () => {
		const now = Date.now();
		expect(formatUptime(now - 60000)).toBe("1m");
		expect(formatUptime(now - 120000)).toBe("2m");
		expect(formatUptime(now - 3540000)).toBe("59m");
	});

	test("formats hours and minutes", () => {
		const now = Date.now();
		expect(formatUptime(now - 3600000)).toBe("1h");
		expect(formatUptime(now - 3660000)).toBe("1h 1m");
		expect(formatUptime(now - 7200000)).toBe("2h");
		expect(formatUptime(now - 7260000)).toBe("2h 1m");
		expect(formatUptime(now - 45000000)).toBe("12h 30m");
	});

	test("formats days and hours", () => {
		const now = Date.now();
		const oneDay = 86400000;
		expect(formatUptime(now - oneDay)).toBe("1d");
		expect(formatUptime(now - (oneDay + 3600000))).toBe("1d 1h");
		expect(formatUptime(now - 2 * oneDay)).toBe("2d");
		expect(formatUptime(now - (2 * oneDay + 12 * 3600000))).toBe("2d 12h");
	});

	test("handles zero duration", () => {
		const now = Date.now();
		expect(formatUptime(now)).toBe("0s");
	});
});
