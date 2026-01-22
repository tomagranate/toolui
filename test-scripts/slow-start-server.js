/**
 * A server that takes a while to start up, then becomes healthy.
 * Useful for testing the "starting" state with retries.
 * - GET / - Returns a simple HTML page
 * - GET /health - Returns 503 for first 10 seconds, then 200
 */

const PORT = process.env.PORT || 7772;
const STARTUP_DELAY_MS = 10000; // 10 seconds to "boot up"

const startTime = Date.now();
let isReady = false;

console.log(
	`[slow-start-server] Starting up... will be ready in ${STARTUP_DELAY_MS / 1000}s`,
);

// Simulate slow startup
setTimeout(() => {
	isReady = true;
	console.log(`[slow-start-server] ✓ Now ready and healthy!`);
}, STARTUP_DELAY_MS);

Bun.serve({
	port: PORT,
	fetch(req) {
		const url = new URL(req.url);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

		if (url.pathname === "/health") {
			if (isReady) {
				return new Response("OK", { status: 200 });
			}
			return new Response("Service Unavailable - Still starting", {
				status: 503,
			});
		}

		if (url.pathname === "/") {
			const status = isReady ? "Ready" : "Starting...";
			const color = isReady ? "#4ade80" : "#facc15";
			return new Response(
				`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Slow Start Server</title>
  <meta http-equiv="refresh" content="2">
  <style>
    body { font-family: system-ui; padding: 2rem; background: #1a1a2e; color: #eee; }
    .status { color: ${color}; font-size: 2rem; }
  </style>
</head>
<body>
  <h1>Slow Start Server</h1>
  <p class="status">${isReady ? "●" : "◐"} ${status}</p>
  <p>Uptime: ${elapsed}s</p>
  <p>Health endpoint: <a href="/health" style="color: #60a5fa">/health</a></p>
</body>
</html>`,
				{
					headers: { "Content-Type": "text/html; charset=utf-8" },
				},
			);
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.log(`[slow-start-server] Server listening on http://localhost:${PORT}`);
console.log(
	`[slow-start-server] Health endpoint: http://localhost:${PORT}/health (will return 503 until ready)`,
);

// Keep running with status updates
setInterval(() => {
	const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
	console.log(`[slow-start-server] Uptime: ${elapsed}s | Ready: ${isReady}`);
}, 5000);
