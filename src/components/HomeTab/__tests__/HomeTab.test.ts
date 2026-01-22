import { describe, expect, test } from "bun:test";
import { HomeTab } from "../HomeTab";

describe("HomeTab", () => {
	test("should export HomeTab component", () => {
		expect(HomeTab).toBeDefined();
		expect(typeof HomeTab).toBe("function");
	});
});
