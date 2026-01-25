#!/usr/bin/env node

/**
 * Postinstall script for toolui NPM package.
 * Downloads the appropriate binary for the current platform.
 */

const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const zlib = require("node:zlib");

// Configuration
const REPO = "tomagranate/toolui";
const GITHUB_RELEASES = `https://github.com/${REPO}/releases`;

// Platform mappings
const PLATFORM_MAP = {
	darwin: "darwin",
	linux: "linux",
	win32: "windows",
};

const ARCH_MAP = {
	arm64: "arm64",
	x64: "x64",
};

/**
 * Make an HTTPS GET request
 */
function httpsGet(url, options = {}) {
	return new Promise((resolve, reject) => {
		const opts = {
			...options,
			headers: {
				"User-Agent": "toolui-postinstall",
				...options.headers,
			},
		};

		https
			.get(url, opts, (res) => {
				// Handle redirects
				if (
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location
				) {
					return httpsGet(res.headers.location, options)
						.then(resolve)
						.catch(reject);
				}

				if (res.statusCode !== 200) {
					reject(new Error(`HTTP ${res.statusCode}: ${url}`));
					return;
				}

				const chunks = [];
				res.on("data", (chunk) => chunks.push(chunk));
				res.on("end", () => resolve(Buffer.concat(chunks)));
				res.on("error", reject);
			})
			.on("error", reject);
	});
}

/**
 * Get the version from package.json
 */
function getVersion() {
	const packageJson = JSON.parse(
		fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"),
	);
	return packageJson.version;
}

/**
 * Download and extract the binary
 */
async function downloadBinary(url, destPath) {
	console.log(`Downloading from ${url}...`);
	const data = await httpsGet(url);

	// Extract tar.gz
	return new Promise((resolve, reject) => {
		const gunzip = zlib.createGunzip();
		const chunks = [];

		gunzip.on("data", (chunk) => chunks.push(chunk));
		gunzip.on("end", () => {
			const tarData = Buffer.concat(chunks);
			// Simple tar extraction - find the file content
			// tar format: 512-byte header blocks followed by file content
			let offset = 0;
			while (offset < tarData.length) {
				const header = tarData.slice(offset, offset + 512);
				if (header[0] === 0) break; // End of archive

				// Get filename (bytes 0-99)
				const filename = header
					.slice(0, 100)
					.toString("utf-8")
					.replace(/\0/g, "");

				// Get file size (bytes 124-135, octal)
				const sizeStr = header
					.slice(124, 136)
					.toString("utf-8")
					.replace(/\0/g, "")
					.trim();
				const size = parseInt(sizeStr, 8) || 0;

				offset += 512; // Move past header

				if (filename && size > 0 && filename.startsWith("toolui")) {
					const content = tarData.slice(offset, offset + size);
					fs.writeFileSync(destPath, content);
					fs.chmodSync(destPath, 0o755);
					resolve();
					return;
				}

				// Move to next file (content is padded to 512-byte blocks)
				offset += Math.ceil(size / 512) * 512;
			}
			reject(new Error("Could not find toolui binary in archive"));
		});
		gunzip.on("error", reject);

		gunzip.end(data);
	});
}

/**
 * Download Windows zip and extract
 */
async function downloadWindowsBinary(url, destPath) {
	console.log(`Downloading from ${url}...`);
	const data = await httpsGet(url);

	// Write zip to temp file
	const zipPath = `${destPath}.zip`;
	fs.writeFileSync(zipPath, data);

	// Use unzip if available, otherwise try PowerShell
	try {
		if (process.platform === "win32") {
			execSync(
				`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${path.dirname(destPath)}' -Force"`,
				{ stdio: "pipe" },
			);
		} else {
			execSync(`unzip -o "${zipPath}" -d "${path.dirname(destPath)}"`, {
				stdio: "pipe",
			});
		}
	} finally {
		fs.unlinkSync(zipPath);
	}
}

async function main() {
	const platform = PLATFORM_MAP[process.platform];
	const arch = ARCH_MAP[process.arch];

	if (!platform || !arch) {
		console.log(`Unsupported platform: ${process.platform}-${process.arch}`);
		console.log("You may need to build from source or download manually.");
		process.exit(0); // Don't fail installation
	}

	const version = getVersion();
	const binaryName = `toolui-${platform}-${arch}`;
	const binDir = path.join(__dirname, "..", "bin");
	const destPath = path.join(
		binDir,
		binaryName + (platform === "windows" ? ".exe" : ""),
	);

	// Skip if binary already exists
	if (fs.existsSync(destPath)) {
		console.log(`Binary already exists: ${destPath}`);
		return;
	}

	// Ensure bin directory exists
	if (!fs.existsSync(binDir)) {
		fs.mkdirSync(binDir, { recursive: true });
	}

	const archiveExt = platform === "windows" ? "zip" : "tar.gz";
	const downloadUrl = `${GITHUB_RELEASES}/download/v${version}/${binaryName}.${archiveExt}`;

	try {
		if (platform === "windows") {
			await downloadWindowsBinary(downloadUrl, destPath);
		} else {
			await downloadBinary(downloadUrl, destPath);
		}
		console.log(`Successfully installed toolui binary to ${destPath}`);
	} catch (error) {
		console.error(`Failed to download binary: ${error.message}`);
		console.error("");
		console.error("You can manually download the binary from:");
		console.error(`  ${GITHUB_RELEASES}/latest`);
		console.error("");
		console.error("Or install via the install script:");
		console.error(
			`  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`,
		);
		// Don't fail the install - the user can still use the package
		process.exit(0);
	}
}

main();
