/**
 * A simple healthy server with a health endpoint and a basic UI.
 * - GET / - Returns a simple HTML page
 * - GET /health - Returns 200 OK
 */

const PORT = process.env.PORT || 7771;

Bun.serve({
	port: PORT,
	fetch(req) {
		const url = new URL(req.url);

		if (url.pathname === "/health") {
			return new Response("OK", { status: 200 });
		}

		if (url.pathname === "/") {
			return new Response(
				`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Healthy Server</title>
  <style>
    body { font-family: system-ui; padding: 2rem; background: #1a1a2e; color: #eee; }
    .status { color: #4ade80; font-size: 2rem; }
  </style>
</head>
<body>
  <h1>Healthy Server</h1>
  <p class="status">● Running on port ${PORT}</p>
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

console.log(`[healthy-server] Started on http://localhost:${PORT}`);
console.log(
	`[healthy-server] Health endpoint: http://localhost:${PORT}/health`,
);

// Keep running
setInterval(() => {
	console.log(
		`[healthy-server] Still running... (${new Date().toISOString()})`,
	);
}, 10000);
