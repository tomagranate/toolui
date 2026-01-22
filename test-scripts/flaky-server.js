/**
 * A server that alternates between healthy and unhealthy states.
 * Useful for testing health state transitions.
 * - GET / - Returns a simple HTML page showing current state
 * - GET /health - Alternates between 200 and 500 every 15 seconds
 */

const PORT = process.env.PORT || 7773;
const FLIP_INTERVAL_MS = 15000; // Toggle every 15 seconds

let isHealthy = true;

console.log(`[flaky-server] Starting in healthy state`);

// Toggle health state periodically
setInterval(() => {
	isHealthy = !isHealthy;
	console.log(
		`[flaky-server] Health state changed: ${isHealthy ? "HEALTHY ✓" : "UNHEALTHY ✗"}`,
	);
}, FLIP_INTERVAL_MS);

Bun.serve({
	port: PORT,
	fetch(req) {
		const url = new URL(req.url);

		if (url.pathname === "/health") {
			if (isHealthy) {
				return new Response("OK", { status: 200 });
			}
			return new Response("Internal Server Error", { status: 500 });
		}

		if (url.pathname === "/") {
			const status = isHealthy ? "Healthy" : "Unhealthy";
			const color = isHealthy ? "#4ade80" : "#f87171";
			const icon = isHealthy ? "●" : "✗";
			return new Response(
				`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Flaky Server</title>
  <meta http-equiv="refresh" content="2">
  <style>
    body { font-family: system-ui; padding: 2rem; background: #1a1a2e; color: #eee; }
    .status { color: ${color}; font-size: 2rem; }
  </style>
</head>
<body>
  <h1>Flaky Server</h1>
  <p class="status">${icon} ${status}</p>
  <p>This server toggles health every ${FLIP_INTERVAL_MS / 1000} seconds.</p>
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

console.log(`[flaky-server] Server listening on http://localhost:${PORT}`);
console.log(`[flaky-server] Health endpoint: http://localhost:${PORT}/health`);
console.log(
	`[flaky-server] Health will toggle every ${FLIP_INTERVAL_MS / 1000}s`,
);
