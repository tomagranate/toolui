import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { ToolConfig } from "../../../types";
import { HealthChecker } from "../health-checker";

/**
 * Create a mock fetch function that satisfies TypeScript's fetch type
 */
function createMockFetch(fn: () => Promise<Response>): typeof global.fetch {
	const mockFn = mock(fn) as unknown as typeof global.fetch;
	return mockFn;
}

describe("HealthChecker", () => {
	let checker: HealthChecker;
	let originalFetch: typeof global.fetch;

	beforeEach(() => {
		checker = new HealthChecker();
		originalFetch = global.fetch;
	});

	afterEach(() => {
		checker.stop();
		global.fetch = originalFetch;
	});

	describe("initialize", () => {
		test("should set up health states for tools with health checks", () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
				{
					name: "tool2",
					command: "cmd2",
					// No health check
				},
				{
					name: "tool3",
					command: "cmd3",
					healthCheck: { url: "http://localhost:4000/health" },
				},
			];

			checker.initialize(tools);

			// Should have health states for tools with health checks
			expect(checker.getHealthState("tool1")).toBeDefined();
			expect(checker.getHealthState("tool1")?.status).toBe("starting");
			expect(checker.getHealthState("tool2")).toBeUndefined();
			expect(checker.getHealthState("tool3")).toBeDefined();
			expect(checker.getHealthState("tool3")?.status).toBe("starting");
		});

		test("should initialize all states as starting with zero failure count", () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
			];

			checker.initialize(tools);

			const state = checker.getHealthState("tool1");
			expect(state?.status).toBe("starting");
			expect(state?.failureCount).toBe(0);
		});
	});

	describe("getAllHealthStates", () => {
		test("should return a copy of all health states", () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
				{
					name: "tool2",
					command: "cmd2",
					healthCheck: { url: "http://localhost:4000/health" },
				},
			];

			checker.initialize(tools);
			const states = checker.getAllHealthStates();

			expect(states.size).toBe(2);
			expect(states.get("tool1")?.status).toBe("starting");
			expect(states.get("tool2")?.status).toBe("starting");

			// Verify it's a copy (modifying shouldn't affect internal state)
			states.clear();
			expect(checker.getAllHealthStates().size).toBe(2);
		});
	});

	describe("onChange", () => {
		test("should call callback when health state changes", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
			];

			// Mock successful fetch
			global.fetch = createMockFetch(() =>
				Promise.resolve(new Response("OK", { status: 200 })),
			);

			const changes: Array<{ toolName: string; status: string }> = [];
			checker.initialize(tools);
			checker.onChange((toolName, state) => {
				changes.push({ toolName, status: state.status });
			});

			await checker.checkNow("tool1");

			expect(changes.length).toBe(1);
			expect(changes[0]?.toolName).toBe("tool1");
			expect(changes[0]?.status).toBe("healthy");
		});

		test("should return unsubscribe function", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
			];

			global.fetch = createMockFetch(() =>
				Promise.resolve(new Response("OK", { status: 200 })),
			);

			const changes: string[] = [];
			checker.initialize(tools);
			const unsubscribe = checker.onChange((toolName) => {
				changes.push(toolName);
			});

			await checker.checkNow("tool1");
			expect(changes.length).toBe(1);

			// Unsubscribe
			unsubscribe();

			// Reset state to trigger another change
			checker.resetHealthState("tool1");
			await checker.checkNow("tool1");

			// Should only have 2 changes (reset + check), but callback should only get 1
			// Actually, the first check + the reset = 2 changes if callback is still subscribed
			// After unsubscribe, we shouldn't get more
			expect(changes.length).toBe(1);
		});
	});

	describe("checkNow", () => {
		test("should mark tool as healthy on successful response", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
			];

			global.fetch = createMockFetch(() =>
				Promise.resolve(new Response("OK", { status: 200 })),
			);

			checker.initialize(tools);
			await checker.checkNow("tool1");

			const state = checker.getHealthState("tool1");
			expect(state?.status).toBe("healthy");
			expect(state?.failureCount).toBe(0);
			expect(state?.lastCheck).toBeDefined();
		});

		test("should increment failure count on failed response", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health", retries: 3 },
				},
			];

			global.fetch = createMockFetch(() =>
				Promise.resolve(new Response("Error", { status: 500 })),
			);

			checker.initialize(tools);
			await checker.checkNow("tool1");

			const state = checker.getHealthState("tool1");
			// Still starting because we haven't exhausted retries
			expect(state?.status).toBe("starting");
			expect(state?.failureCount).toBe(1);
		});

		test("should mark as unhealthy after exhausting retries", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health", retries: 2 },
				},
			];

			global.fetch = createMockFetch(() =>
				Promise.resolve(new Response("Error", { status: 500 })),
			);

			checker.initialize(tools);

			// First failure - still starting
			await checker.checkNow("tool1");
			expect(checker.getHealthState("tool1")?.status).toBe("starting");

			// Second failure - should be unhealthy (retries = 2 means 2 attempts before unhealthy)
			await checker.checkNow("tool1");
			expect(checker.getHealthState("tool1")?.status).toBe("unhealthy");
		});

		test("should handle fetch errors", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health", retries: 1 },
				},
			];

			global.fetch = createMockFetch(() =>
				Promise.reject(new Error("Network error")),
			) as typeof global.fetch;

			checker.initialize(tools);
			await checker.checkNow("tool1");

			const state = checker.getHealthState("tool1");
			expect(state?.status).toBe("unhealthy");
			expect(state?.failureCount).toBe(1);
		});

		test("should not check tools without health check config", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					// No health check
				},
			];

			let fetchCalled = false;
			global.fetch = createMockFetch(() => {
				fetchCalled = true;
				return Promise.resolve(new Response("OK", { status: 200 }));
			});

			checker.initialize(tools);
			await checker.checkNow("tool1");

			// Fetch should not have been called
			expect(fetchCalled).toBe(false);
		});
	});

	describe("resetHealthState", () => {
		test("should reset health state to starting", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
			];

			global.fetch = createMockFetch(() =>
				Promise.resolve(new Response("OK", { status: 200 })),
			);

			checker.initialize(tools);
			await checker.checkNow("tool1");

			// Should be healthy
			expect(checker.getHealthState("tool1")?.status).toBe("healthy");

			// Reset
			checker.resetHealthState("tool1");

			// Should be starting again
			const state = checker.getHealthState("tool1");
			expect(state?.status).toBe("starting");
			expect(state?.failureCount).toBe(0);
		});

		test("should notify subscribers on reset", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health" },
				},
			];

			global.fetch = createMockFetch(() =>
				Promise.resolve(new Response("OK", { status: 200 })),
			);

			const changes: string[] = [];
			checker.initialize(tools);
			checker.onChange((_, state) => {
				changes.push(state.status);
			});

			await checker.checkNow("tool1");
			checker.resetHealthState("tool1");

			expect(changes).toContain("starting");
		});
	});

	describe("healthy to unhealthy transition", () => {
		test("should immediately mark as unhealthy when healthy tool fails", async () => {
			const tools: ToolConfig[] = [
				{
					name: "tool1",
					command: "cmd1",
					healthCheck: { url: "http://localhost:3000/health", retries: 5 },
				},
			];

			// First call succeeds
			let callCount = 0;
			global.fetch = createMockFetch(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.resolve(new Response("OK", { status: 200 }));
				}
				return Promise.resolve(new Response("Error", { status: 500 }));
			});

			checker.initialize(tools);

			// First check - healthy
			await checker.checkNow("tool1");
			expect(checker.getHealthState("tool1")?.status).toBe("healthy");

			// Second check - should immediately go unhealthy (no retry for healthy->unhealthy)
			await checker.checkNow("tool1");
			expect(checker.getHealthState("tool1")?.status).toBe("unhealthy");
		});
	});
});
