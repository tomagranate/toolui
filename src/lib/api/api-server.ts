import type { Server } from "bun";
import type { ProcessManager } from "../processes";
import { fuzzyFindLines, substringFindLines } from "../search";

/** Default port for the MCP API server */
export const DEFAULT_MCP_PORT = 18765;

/** API response wrapper for success */
interface ApiSuccessResponse<T> {
	ok: true;
	data: T;
}

/** API response wrapper for errors */
interface ApiErrorResponse {
	ok: false;
	error: string;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Process summary returned by list endpoint */
interface ProcessSummary {
	name: string;
	description?: string;
	status: "running" | "stopped" | "error" | "shuttingDown" | "waiting";
	exitCode: number | null;
	logCount: number;
	pid?: number;
	uptime?: number; // milliseconds since start
}

/** Full process details */
interface ProcessDetails extends ProcessSummary {
	command: string;
	args?: string[];
	cwd?: string;
}

/**
 * HTTP API server for MCP integration.
 * Runs in-process and logs to a virtual tool tab.
 */
export class ApiServer {
	private server: Server | null = null;
	private processManager: ProcessManager;
	private port: number;
	private toolIndex: number;

	constructor(processManager: ProcessManager, port: number, toolIndex: number) {
		this.processManager = processManager;
		this.port = port;
		this.toolIndex = toolIndex;
	}

	/**
	 * Start the HTTP server.
	 */
	start(): void {
		this.server = Bun.serve({
			port: this.port,
			fetch: (req) => this.handleRequest(req),
		});
		this.log(`MCP API server listening on http://localhost:${this.port}`);
		this.log("Endpoints:");
		this.log("  GET  /api/health");
		this.log("  GET  /api/processes");
		this.log("  GET  /api/processes/:name");
		this.log("  GET  /api/processes/:name/logs");
		this.log("  POST /api/processes/:name/stop");
		this.log("  POST /api/processes/:name/restart");
		this.log("  POST /api/processes/:name/clear");
	}

	/**
	 * Stop the HTTP server.
	 */
	stop(): void {
		if (this.server) {
			this.server.stop();
			this.server = null;
			this.log("MCP API server stopped");
		}
	}

	/**
	 * Log a message to the virtual tool tab.
	 */
	private log(message: string): void {
		const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
		this.processManager.addLogToTool(
			this.toolIndex,
			`[${timestamp}] ${message}`,
		);
	}

	/**
	 * Handle an incoming HTTP request.
	 */
	private async handleRequest(req: Request): Promise<Response> {
		const url = new URL(req.url);
		const path = url.pathname;
		const method = req.method;

		// Log the request
		this.log(`${method} ${path}`);

		try {
			// Health check
			if (path === "/api/health" && method === "GET") {
				return this.jsonResponse({ ok: true, data: { status: "healthy" } });
			}

			// List all processes
			if (path === "/api/processes" && method === "GET") {
				return this.handleListProcesses();
			}

			// Process-specific routes
			const processMatch = path.match(/^\/api\/processes\/([^/]+)(\/.*)?$/);
			if (processMatch) {
				const name = decodeURIComponent(processMatch[1] ?? "");
				const subPath = processMatch[2] ?? "";

				// Get process details
				if (subPath === "" && method === "GET") {
					return this.handleGetProcess(name);
				}

				// Get process logs
				if (subPath === "/logs" && method === "GET") {
					const lines = url.searchParams.get("lines");
					const search = url.searchParams.get("search");
					const searchType = url.searchParams.get("searchType") as
						| "substring"
						| "fuzzy"
						| null;
					return this.handleGetLogs(name, {
						lines: lines ? parseInt(lines, 10) : undefined,
						search: search ?? undefined,
						searchType: searchType ?? "substring",
					});
				}

				// Stop process
				if (subPath === "/stop" && method === "POST") {
					return this.handleStopProcess(name);
				}

				// Restart process
				if (subPath === "/restart" && method === "POST") {
					return this.handleRestartProcess(name);
				}

				// Clear logs
				if (subPath === "/clear" && method === "POST") {
					return this.handleClearLogs(name);
				}
			}

			// Not found
			return this.jsonResponse({ ok: false, error: "Not found" }, 404);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.log(`Error: ${message}`);
			return this.jsonResponse({ ok: false, error: message }, 500);
		}
	}

	/**
	 * List all processes with summary information.
	 */
	private handleListProcesses(): Response {
		const tools = this.processManager.getTools();
		const processes: ProcessSummary[] = tools
			.filter((tool) => tool.config.name !== "MCP API") // Exclude self
			.map((tool) => ({
				name: tool.config.name,
				description: tool.config.description,
				status: tool.status,
				exitCode: tool.exitCode,
				logCount: tool.logs.length,
				pid: tool.pid,
				uptime: tool.startTime ? Date.now() - tool.startTime : undefined,
			}));

		return this.jsonResponse({ ok: true, data: processes });
	}

	/**
	 * Get details for a specific process.
	 */
	private handleGetProcess(name: string): Response {
		const result = this.processManager.getToolByName(name);
		if (!result) {
			return this.jsonResponse(
				{ ok: false, error: `Process not found: ${name}` },
				404,
			);
		}

		const { tool } = result;
		const details: ProcessDetails = {
			name: tool.config.name,
			status: tool.status,
			exitCode: tool.exitCode,
			logCount: tool.logs.length,
			pid: tool.pid,
			uptime: tool.startTime ? Date.now() - tool.startTime : undefined,
			command: tool.config.command,
			args: tool.config.args,
			cwd: tool.config.cwd,
		};

		return this.jsonResponse({ ok: true, data: details });
	}

	/**
	 * Get logs for a specific process with optional filtering.
	 */
	private handleGetLogs(
		name: string,
		options: {
			lines?: number;
			search?: string;
			searchType: "substring" | "fuzzy";
		},
	): Response {
		const result = this.processManager.getToolByName(name);
		if (!result) {
			return this.jsonResponse(
				{ ok: false, error: `Process not found: ${name}` },
				404,
			);
		}

		const { tool } = result;

		// Convert logs to plain text
		let logTexts = tool.logs.map((logLine) =>
			logLine.segments.map((seg) => seg.text).join(""),
		);

		// Apply search filter if provided
		if (options.search) {
			const matchingIndices =
				options.searchType === "fuzzy"
					? fuzzyFindLines(logTexts, options.search).map((m) => m.index)
					: substringFindLines(logTexts, options.search);

			logTexts = matchingIndices.map((i) => logTexts[i] ?? "");
		}

		// Apply line limit (from the end)
		if (options.lines && options.lines > 0) {
			logTexts = logTexts.slice(-options.lines);
		}

		return this.jsonResponse({
			ok: true,
			data: {
				name,
				totalLines: tool.logs.length,
				returnedLines: logTexts.length,
				logs: logTexts,
			},
		});
	}

	/**
	 * Stop a running process.
	 */
	private async handleStopProcess(name: string): Promise<Response> {
		const result = this.processManager.getToolByName(name);
		if (!result) {
			return this.jsonResponse(
				{ ok: false, error: `Process not found: ${name}` },
				404,
			);
		}

		const { index, tool } = result;

		if (tool.status !== "running") {
			return this.jsonResponse(
				{ ok: false, error: `Process is not running: ${name}` },
				400,
			);
		}

		this.log(`Stopping process: ${name}`);
		await this.processManager.stopTool(index);

		return this.jsonResponse({
			ok: true,
			data: { message: `Stopped: ${name}` },
		});
	}

	/**
	 * Restart a process.
	 */
	private async handleRestartProcess(name: string): Promise<Response> {
		const result = this.processManager.getToolByName(name);
		if (!result) {
			return this.jsonResponse(
				{ ok: false, error: `Process not found: ${name}` },
				404,
			);
		}

		const { index } = result;

		this.log(`Restarting process: ${name}`);
		await this.processManager.restartTool(index);

		return this.jsonResponse({
			ok: true,
			data: { message: `Restarted: ${name}` },
		});
	}

	/**
	 * Clear logs for a process.
	 */
	private handleClearLogs(name: string): Response {
		const result = this.processManager.getToolByName(name);
		if (!result) {
			return this.jsonResponse(
				{ ok: false, error: `Process not found: ${name}` },
				404,
			);
		}

		const { index } = result;

		this.log(`Clearing logs for: ${name}`);
		this.processManager.clearLogs(index);

		return this.jsonResponse({
			ok: true,
			data: { message: `Cleared logs: ${name}` },
		});
	}

	/**
	 * Create a JSON response.
	 */
	private jsonResponse<T>(data: ApiResponse<T>, status = 200): Response {
		return new Response(JSON.stringify(data), {
			status,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}
}
