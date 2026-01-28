#!/usr/bin/env bun
/**
 * MCP (Model Context Protocol) Server for toolui.
 *
 * This standalone server connects to toolui's HTTP API and exposes
 * process management capabilities to AI agents via MCP.
 *
 * Usage:
 *   bun run src/mcp-server.ts
 *
 * Environment variables:
 *   TOOLUI_API_URL - Base URL of toolui's HTTP API (default: http://localhost:18765)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Configuration
const TOOLUI_API_URL = process.env.TOOLUI_API_URL ?? "http://localhost:18765";

// Types for API responses
interface ProcessSummary {
	name: string;
	description?: string;
	status: "running" | "stopped" | "error" | "shuttingDown";
	exitCode: number | null;
	logCount: number;
	pid?: number;
	uptime?: number;
}

interface LogsResponse {
	name: string;
	totalLines: number;
	returnedLines: number;
	logs: string[];
}

interface ApiResponse<T> {
	ok: boolean;
	data?: T;
	error?: string;
}

/**
 * Make a request to the toolui HTTP API.
 */
async function apiRequest<T>(
	path: string,
	method: "GET" | "POST" = "GET",
): Promise<T> {
	const url = `${TOOLUI_API_URL}${path}`;

	try {
		const response = await fetch(url, { method });
		const json = (await response.json()) as ApiResponse<T>;

		if (!json.ok) {
			throw new Error(json.error ?? "Unknown API error");
		}

		return json.data as T;
	} catch (error) {
		if (error instanceof TypeError && error.message.includes("fetch")) {
			throw new Error(
				`Cannot connect to toolui API at ${TOOLUI_API_URL}. ` +
					"Make sure toolui is running with mcp.enabled = true in your config.",
			);
		}
		throw error;
	}
}

/**
 * Check if toolui API is reachable.
 */
async function checkHealth(): Promise<boolean> {
	try {
		await apiRequest<{ status: string }>("/api/health");
		return true;
	} catch {
		return false;
	}
}

// Create MCP server
const server = new McpServer({
	name: "toolui",
	version: "1.0.0",
	description:
		"Interact with local development processes managed by toolui. " +
		"Use these tools to read logs, debug errors, and control running servers. " +
		"Helpful when: debugging build/runtime errors, checking if a server started correctly, " +
		"viewing application output, or restarting crashed processes.",
});

// Register tools

// list_processes - List all processes with their status
server.tool(
	"list_processes",
	"List all running development processes (servers, workers, etc.) with their status. " +
		"Use this to see what's running, check if processes crashed, or find the name of a process to get logs from.",
	{},
	async () => {
		const processes = await apiRequest<ProcessSummary[]>("/api/processes");

		const formatted = processes
			.map((p) => {
				const status = p.status.toUpperCase();
				const exitInfo = p.exitCode !== null ? ` (exit: ${p.exitCode})` : "";
				const pidInfo = p.pid ? ` [PID: ${p.pid}]` : "";
				const uptimeInfo = p.uptime
					? ` (up ${Math.round(p.uptime / 1000)}s)`
					: "";
				const desc = p.description ? `\n  ${p.description}` : "";
				return `- ${p.name}: ${status}${exitInfo}${pidInfo}${uptimeInfo} (${p.logCount} lines)${desc}`;
			})
			.join("\n");

		return {
			content: [
				{
					type: "text",
					text: processes.length > 0 ? formatted : "No processes found",
				},
			],
		};
	},
);

// get_logs - Get recent logs from a process
server.tool(
	"get_logs",
	"Get recent log output from a development process. " +
		"Use this to debug errors, see stack traces, check server startup messages, or find specific log entries. " +
		"Supports search filtering with substring (exact) or fuzzy matching.",
	{
		name: z.string().describe("Name of the process to get logs from"),
		lines: z
			.number()
			.optional()
			.describe("Number of recent lines to return (default: 100)"),
		search: z.string().optional().describe("Search query to filter logs"),
		searchType: z
			.enum(["substring", "fuzzy"])
			.optional()
			.describe(
				"Search type: 'substring' for exact match, 'fuzzy' for fuzzy matching (default: substring)",
			),
	},
	async ({ name, lines = 100, search, searchType = "substring" }) => {
		const params = new URLSearchParams();
		params.set("lines", String(lines));
		if (search) {
			params.set("search", search);
			params.set("searchType", searchType);
		}

		const response = await apiRequest<LogsResponse>(
			`/api/processes/${encodeURIComponent(name)}/logs?${params}`,
		);

		const header = `=== Logs for ${name} (${response.returnedLines}/${response.totalLines} lines) ===`;
		const logs = response.logs.join("\n");

		return {
			content: [
				{
					type: "text",
					text: logs ? `${header}\n${logs}` : `${header}\n(no logs)`,
				},
			],
		};
	},
);

// stop_process - Stop a running process
server.tool(
	"stop_process",
	"Stop a running process gracefully",
	{
		name: z.string().describe("Name of the process to stop"),
	},
	async ({ name }) => {
		const result = await apiRequest<{ message: string }>(
			`/api/processes/${encodeURIComponent(name)}/stop`,
			"POST",
		);

		return {
			content: [{ type: "text", text: result.message }],
		};
	},
);

// restart_process - Restart a process
server.tool(
	"restart_process",
	"Restart a development process to apply code changes or recover from a crash. " +
		"Use after making changes that require a server restart, or to recover a crashed process.",
	{
		name: z.string().describe("Name of the process to restart"),
	},
	async ({ name }) => {
		const result = await apiRequest<{ message: string }>(
			`/api/processes/${encodeURIComponent(name)}/restart`,
			"POST",
		);

		return {
			content: [{ type: "text", text: result.message }],
		};
	},
);

// clear_logs - Clear logs for a process
server.tool(
	"clear_logs",
	"Clear all logs for a process",
	{
		name: z.string().describe("Name of the process to clear logs for"),
	},
	async ({ name }) => {
		const result = await apiRequest<{ message: string }>(
			`/api/processes/${encodeURIComponent(name)}/clear`,
			"POST",
		);

		return {
			content: [{ type: "text", text: result.message }],
		};
	},
);

// reload_config - Reload the configuration file and restart all processes
server.tool(
	"reload_config",
	"Reload the toolui configuration file and restart all processes. " +
		"Use this after modifying toolui.config.toml to apply changes without restarting toolui. " +
		"All running processes will be stopped and restarted with the new configuration.",
	{},
	async () => {
		const result = await apiRequest<{
			message: string;
			tools: string[];
			warnings: string[];
		}>("/api/reload", "POST");

		let text = result.message;

		if (result.tools.length > 0) {
			text += `\n\nStarted processes:\n${result.tools.map((t) => `- ${t}`).join("\n")}`;
		}

		if (result.warnings.length > 0) {
			text += `\n\nWarnings:\n${result.warnings.map((w) => `- ${w}`).join("\n")}`;
		}

		return {
			content: [{ type: "text", text }],
		};
	},
);

// Register resources

// toolui://processes - List all processes
server.resource(
	"toolui://processes",
	"List of all processes managed by toolui",
	async () => {
		const processes = await apiRequest<ProcessSummary[]>("/api/processes");

		return {
			contents: [
				{
					uri: "toolui://processes",
					mimeType: "application/json",
					text: JSON.stringify(processes, null, 2),
				},
			],
		};
	},
);

// Main entry point
async function main() {
	// Check if toolui is reachable
	const healthy = await checkHealth();
	if (!healthy) {
		console.error(`Warning: Cannot connect to toolui API at ${TOOLUI_API_URL}`);
		console.error(
			"Make sure toolui is running with mcp.enabled = true in your config.",
		);
		// Continue anyway - the API might become available later
	}

	// Connect to stdio transport
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error("MCP server error:", error);
	process.exit(1);
});
