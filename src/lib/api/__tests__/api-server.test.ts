import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { ToolConfig } from "../../../types";
import { deletePidFile } from "../../processes/pid-file";
import { ProcessManager } from "../../processes/process-manager";
import { ApiServer } from "../api-server";

// Type for API responses
interface ApiResponse {
	ok: boolean;
	data?: unknown;
	error?: string;
}

const TEST_PORT = 19876;

let processManager: ProcessManager;
let apiServer: ApiServer;
let virtualToolIndex: number;

const apiUrl = (path: string) => `http://localhost:${TEST_PORT}${path}`;

beforeAll(async () => {
	processManager = new ProcessManager(100);
	await deletePidFile();

	const configs: ToolConfig[] = [
		{ name: "test-process", command: "echo", args: ["hello world"] },
		{ name: "long-running", command: "sleep", args: ["60"] },
	];
	await processManager.initialize(configs);

	virtualToolIndex = processManager.createVirtualTool("MCP API");
	apiServer = new ApiServer(processManager, TEST_PORT, virtualToolIndex);
	apiServer.start();

	await new Promise((resolve) => setTimeout(resolve, 200));
});

afterAll(async () => {
	apiServer.stop();
	await processManager.cleanup();
	await deletePidFile();
});

describe("ApiServer", () => {
	test("GET /api/health returns healthy status", async () => {
		const response = await fetch(apiUrl("/api/health"));
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(200);
		expect(json).toEqual({ ok: true, data: { status: "healthy" } });
	});

	test("GET /api/processes lists processes excluding MCP API", async () => {
		const response = await fetch(apiUrl("/api/processes"));
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(200);
		expect(json.ok).toBe(true);
		const data = json.data as { name: string }[];
		expect(data.length).toBeGreaterThanOrEqual(2);

		const names = data.map((p) => p.name);
		expect(names).toContain("test-process");
		expect(names).toContain("long-running");
		expect(names).not.toContain("MCP API");
	});

	test("GET /api/processes/:name returns process details", async () => {
		const response = await fetch(apiUrl("/api/processes/test-process"));
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(200);
		expect(json.ok).toBe(true);
		const data = json.data as { name: string; command: string };
		expect(data.name).toBe("test-process");
		expect(data.command).toBe("echo");
	});

	test("GET /api/processes/:name returns 404 for unknown process", async () => {
		const response = await fetch(apiUrl("/api/processes/nonexistent"));
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(404);
		expect(json.ok).toBe(false);
	});

	test("GET /api/processes/:name/logs returns 404 for unknown process", async () => {
		const response = await fetch(apiUrl("/api/processes/nonexistent/logs"));
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(404);
		expect(json.ok).toBe(false);
	});

	test("POST /api/processes/:name/stop returns 400 when process not running", async () => {
		const response = await fetch(apiUrl("/api/processes/test-process/stop"), {
			method: "POST",
		});
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(400);
		expect(json.ok).toBe(false);
		expect(json.error).toContain("not running");
	});

	test("POST /api/processes/:name/stop returns 404 for unknown process", async () => {
		const response = await fetch(apiUrl("/api/processes/nonexistent/stop"), {
			method: "POST",
		});
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(404);
		expect(json.ok).toBe(false);
	});

	test("POST /api/processes/:name/restart returns success", async () => {
		const response = await fetch(
			apiUrl("/api/processes/long-running/restart"),
			{ method: "POST" },
		);
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(200);
		expect(json.ok).toBe(true);
		const data = json.data as { message: string };
		expect(data.message).toContain("Restarted");
	});

	test("POST /api/processes/:name/restart returns 404 for unknown process", async () => {
		const response = await fetch(apiUrl("/api/processes/nonexistent/restart"), {
			method: "POST",
		});
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(404);
		expect(json.ok).toBe(false);
	});

	test("POST /api/processes/:name/clear returns 404 for unknown process", async () => {
		const response = await fetch(apiUrl("/api/processes/nonexistent/clear"), {
			method: "POST",
		});
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(404);
		expect(json.ok).toBe(false);
	});

	test("unknown routes return 404", async () => {
		const response = await fetch(apiUrl("/api/unknown"));
		const json = (await response.json()) as ApiResponse;

		expect(response.status).toBe(404);
		expect(json.ok).toBe(false);
		expect(json.error).toBe("Not found");
	});

	test("virtual tool receives startup logs", async () => {
		const virtualTool = processManager.getTool(virtualToolIndex);
		expect(virtualTool?.logs.length).toBeGreaterThan(0);

		const allLogText = virtualTool?.logs
			.map((log) => log.segments.map((seg) => seg.text).join(""))
			.join("\n");

		expect(allLogText).toContain("MCP API server listening");
	});
});
