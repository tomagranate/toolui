# ToolUI

A Terminal User Interface (TUI) for running multiple local development servers and tools simultaneously, built with [OpenTUI](https://github.com/anomalyco/opentui).

## Features

- Run multiple long-running CLI processes in separate tabs
- View real-time logs for each process
- Responsive UI: vertical tab bar on the right (wide terminals) or horizontal scrollable tab bar (narrow terminals)
- Automatic cleanup commands on exit
- Keyboard shortcuts for navigation

## Installation

### Homebrew (macOS and Linux)

```bash
brew install tomagranate/toolui/toolui
```

### curl (macOS and Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/tomagranate/toolui/main/install.sh | bash
```

### NPM

```bash
# Install globally
npm install -g toolui

# Or run directly with npx
npx toolui
```

### Manual Download

Download the latest binary for your platform from the [Releases](https://github.com/tomagranate/toolui/releases) page.

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `toolui-darwin-arm64.tar.gz` |
| macOS (Intel) | `toolui-darwin-x64.tar.gz` |
| Linux (x64) | `toolui-linux-x64.tar.gz` |
| Linux (ARM64) | `toolui-linux-arm64.tar.gz` |
| Windows (x64) | `toolui-windows-x64.zip` |

After downloading, extract and move to a directory in your PATH:

```bash
# macOS/Linux
tar -xzf toolui-darwin-arm64.tar.gz
sudo mv toolui /usr/local/bin/

# Windows (PowerShell)
Expand-Archive toolui-windows-x64.zip
Move-Item toolui-windows-x64\toolui.exe C:\Windows\System32\
```

## Configuration

Create a `toolui.config.toml` file in your project root:

```toml
[ui]
sidebarPosition = "left"
horizontalTabPosition = "top"
widthThreshold = 100

[[tools]]
name = "web-server"
command = "npm"
args = ["run", "dev"]
cwd = "./web"
cleanup = ["echo 'Cleaning up web server'"]

[[tools]]
name = "api-server"
command = "python"
args = ["-u", "server.py"]
cwd = "./api"
cleanup = []

[[tools]]
name = "worker"
command = "./worker.sh"
args = []
cleanup = ["pkill -f worker.sh"]
```

### Config Fields

#### UI Options (optional)
- `ui.sidebarPosition` (optional): Position of vertical sidebar for wide terminals. Options: `"left"` (default) or `"right"`
- `ui.horizontalTabPosition` (optional): Position of horizontal tabs for narrow terminals. Options: `"top"` (default) or `"bottom"`
- `ui.widthThreshold` (optional): Terminal width threshold (in columns) for switching between vertical and horizontal layouts. Default: `100`
- `ui.theme` (optional): Color theme name. Options: `"default"`, `"dracula"`, `"nord"`, `"onedark"`, `"solarized"`, `"gruvbox"`, `"catppuccin"`. Default: `"default"`

#### Tool Fields
- `name` (required): Display name for the tab
- `command` (required): Command to execute
- `args` (optional): Array of command arguments
- `cwd` (optional): Working directory for the command
- `env` (optional): Environment variables as key-value pairs
- `cleanup` (optional): Array of shell commands to run on exit

## Usage

```bash
# Use default config file (toolui.config.toml)
toolui

# Specify a custom config file
toolui --config path/to/config.toml
toolui -c path/to/config.toml

# Initialize a new config file in the current directory
toolui init

# Show help
toolui --help
```

## Keyboard Shortcuts

- `q` - Quit (runs cleanup commands)
- `Ctrl+C` - Quit (runs cleanup commands)
- `←` / `→` or `h` / `l` - Switch between tabs
- `↑` / `↓` or `k` / `j` - Switch between tabs (vertical mode)
- `1-9` - Jump to tab by number

## UI Layout

- **Wide terminals (≥100 columns by default)**: Vertical tab bar sidebar (left by default, configurable)
- **Narrow terminals (<100 columns by default)**: Horizontal scrollable tab bar (top by default, configurable)

The layout automatically switches based on terminal width. You can configure:
- Sidebar position (left/right) for wide terminals
- Tab bar position (top/bottom) for narrow terminals
- Width threshold for switching between layouts

## Status Indicators

- `●` - Process is running
- `○` - Process is stopped
- `✗` - Process exited with error

## Themes

ToolUI supports multiple color themes based on popular terminal color schemes. Set the `ui.theme` option in your config file to use a theme:

- `default` - Classic terminal colors (black background, blue active tabs)
- `dracula` - Dracula theme (purple/pink accents)
- `nord` - Nord theme (cool blue/gray palette)
- `onedark` - One Dark theme (dark blue/green palette)
- `solarized` - Solarized Dark theme (blue/yellow palette)
- `gruvbox` - Gruvbox theme (warm colors)
- `catppuccin` - Catppuccin Mocha theme (pastel colors)

Example:
```toml
[ui]
theme = "dracula"
```

## MCP Integration (AI Agent Support)

ToolUI can expose an HTTP API that allows AI agents (like Cursor, Claude, etc.) to read process logs and control processes via the Model Context Protocol (MCP).

### Enabling MCP

Add the `[mcp]` section to your config file:

```toml
[mcp]
enabled = true
port = 18765  # optional, defaults to 18765
```

When enabled, a new "MCP API" tab will appear showing API server logs. The HTTP API will be available at `http://localhost:18765`.

### Cursor Integration

To use with Cursor, add the following to your MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "toolui": {
      "command": "toolui",
      "args": ["mcp"],
      "env": {
        "TOOLUI_API_URL": "http://localhost:18765"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_processes` | List all processes with their status |
| `get_logs` | Get recent logs from a process (supports search and line limits) |
| `stop_process` | Stop a running process |
| `restart_process` | Restart a process |
| `clear_logs` | Clear logs for a process |

### HTTP API Endpoints

The API can also be used directly:

- `GET /api/health` - Health check
- `GET /api/processes` - List all processes
- `GET /api/processes/:name` - Get process details
- `GET /api/processes/:name/logs?lines=100&search=error&searchType=substring` - Get logs
- `POST /api/processes/:name/stop` - Stop a process
- `POST /api/processes/:name/restart` - Restart a process
- `POST /api/processes/:name/clear` - Clear logs

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun dev

# Run tests
bun test

# Type check
bun run typecheck

# Lint and format
bun run check

# Build binary for current platform
bun run build

# Build binaries for all platforms
bun run build:all
```

## License

MIT
