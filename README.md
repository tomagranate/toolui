# ToolUI

A Terminal User Interface (TUI) for managing multiple local development processes. View real-time logs, monitor status, and control all your dev servers from a single dashboard.

Built with [OpenTUI](https://github.com/anomalyco/opentui).

## Why ToolUI?

When working on a full-stack project, you often need to run multiple processes simultaneously—a frontend dev server, a backend API, database containers, workers, etc. ToolUI gives you:

- **Single dashboard** for all your processes with tabbed log viewing
- **Real-time logs** with search and ANSI color support
- **Status monitoring** to see at a glance what's running, stopped, or crashed
- **Health checks** to monitor service availability
- **AI integration** via MCP to let your IDE assistant read logs and control processes

## Installation

### Homebrew (macOS and Linux)

```bash
brew install tomagranate/toolui/toolui
```

### NPM

```bash
npm install -g @tomagranate/toolui
```

### curl (macOS and Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/tomagranate/toolui/main/install.sh | bash
```

### Manual Download

Download the latest binary for your platform from [Releases](https://github.com/tomagranate/toolui/releases).

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `toolui-darwin-arm64.tar.gz` |
| macOS (Intel) | `toolui-darwin-x64.tar.gz` |
| Linux (x64) | `toolui-linux-x64.tar.gz` |
| Linux (ARM64) | `toolui-linux-arm64.tar.gz` |
| Windows (x64) | `toolui-windows-x64.zip` |

## Quick Start

1. Create a config file in your project:

```bash
toolui init
```

2. Edit `toolui.config.toml` to add your processes:

```toml
[[tools]]
name = "frontend"
command = "npm"
args = ["run", "dev"]
cwd = "./frontend"

[[tools]]
name = "backend"
command = "python"
args = ["-m", "uvicorn", "main:app", "--reload"]
cwd = "./backend"
```

3. Start the dashboard:

```bash
toolui
```

## CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `toolui` | Start the TUI dashboard |
| `toolui init` | Create a sample config file in the current directory |
| `toolui mcp` | Start the MCP server for AI agent integration |

### Options

| Option | Description |
|--------|-------------|
| `-c, --config <path>` | Path to config file (default: `toolui.config.toml`) |
| `-h, --help` | Show help message |

### Examples

```bash
# Start with default config
toolui

# Use a custom config file
toolui --config ./configs/dev.toml
toolui -c ./configs/dev.toml

# Create a new config file
toolui init

# Start MCP server for AI integration
toolui mcp
```

## Configuration

ToolUI is configured via a TOML file. By default, it looks for `toolui.config.toml` in the current directory.

### Minimal Example

```toml
[[tools]]
name = "server"
command = "npm"
args = ["run", "dev"]
```

### Full Example

```toml
[home]
enabled = true
title = "My Project"

[ui]
theme = "mist"
showTabNumbers = true

[mcp]
enabled = true

[[tools]]
name = "web"
command = "npm"
args = ["run", "dev"]
cwd = "./web"
description = "Next.js frontend"

[tools.ui]
label = "Open App"
url = "http://localhost:3000"

[tools.healthCheck]
url = "http://localhost:3000/api/health"
interval = 5000

[[tools]]
name = "api"
command = "cargo"
args = ["watch", "-x", "run"]
cwd = "./api"
description = "Rust API server"
cleanup = ["pkill -f 'target/debug/api'"]

[tools.env]
RUST_LOG = "debug"
```

For a complete reference of all configuration options, see the [sample config file](src/sample-config.toml).



## Themes

ToolUI includes several built-in themes. Set in your config:

```toml
[ui]
theme = "mist"
```

Available themes: `default` (Moss), `mist`, `cappuccino`, `synthwave`, `terminal` (auto-detect from your terminal).

## MCP Integration

ToolUI can expose an HTTP API for AI agents (Cursor, Claude, etc.) via the Model Context Protocol.

### Enable in Config

```toml
[mcp]
enabled = true
port = 18765
```

### Configure Your IDE

Add to your MCP configuration (e.g., `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "toolui": {
      "command": "toolui",
      "args": ["mcp"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_processes` | List all processes with their status |
| `get_logs` | Get recent logs (supports search and line limits) |
| `stop_process` | Stop a running process |
| `restart_process` | Restart a process |
| `clear_logs` | Clear logs for a process |

## Contributing

See the [Contributing Guide](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
