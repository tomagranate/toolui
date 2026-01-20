import { type CliRenderer, TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { CommandPalette, commandPalette } from "./components/CommandPalette";
import { HelpBar, type HelpBarMode } from "./components/HelpBar";
import { LogViewer } from "./components/LogViewer";
import { TabBar } from "./components/TabBar";
import { ToastContainer } from "./components/Toast";
import { StatusIcons } from "./constants";
import type { Config } from "./lib/config";
import type { ProcessManager } from "./lib/processes";
import type { Theme } from "./lib/theme";
import type { ToolState } from "./types";

/** Per-tab search state */
interface TabSearchState {
	searchMode: boolean;
	searchQuery: string;
	filterMode: boolean;
	currentMatchIndex: number;
}

const DEFAULT_SEARCH_STATE: TabSearchState = {
	searchMode: false,
	searchQuery: "",
	filterMode: true, // Default ON per requirements
	currentMatchIndex: 0,
};

interface AppProps {
	processManager: ProcessManager;
	initialTools: ToolState[];
	renderer: CliRenderer;
	config: Config;
	theme: Theme;
}

const DEFAULT_WIDTH_THRESHOLD = 100;

export function App({
	processManager,
	initialTools,
	renderer,
	config,
	theme,
}: AppProps) {
	const [tools, setTools] = useState<ToolState[]>(initialTools);
	const [activeIndex, setActiveIndex] = useState(0);
	const [navigationKey, setNavigationKey] = useState(0);
	const [tabSearchStates, setTabSearchStates] = useState<
		Map<string, TabSearchState>
	>(new Map());
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [lineWrap, setLineWrap] = useState(true); // Line wrapping enabled by default
	const { width: terminalWidth } = useTerminalDimensions();

	// Get search state for a specific tab (returns default if not set)
	const getTabSearchState = useCallback(
		(toolName: string): TabSearchState => {
			return tabSearchStates.get(toolName) ?? { ...DEFAULT_SEARCH_STATE };
		},
		[tabSearchStates],
	);

	// Update search state for a specific tab
	const updateTabSearchState = useCallback(
		(toolName: string, updates: Partial<TabSearchState>) => {
			setTabSearchStates((prev) => {
				const newMap = new Map(prev);
				const current = prev.get(toolName) ?? { ...DEFAULT_SEARCH_STATE };
				newMap.set(toolName, { ...current, ...updates });
				return newMap;
			});
		},
		[],
	);

	// Get current tab's search state
	const currentTool = tools[activeIndex];
	const currentToolName = currentTool?.config.name ?? "";
	const currentSearchState = getTabSearchState(currentToolName);

	const widthThreshold = config.ui?.widthThreshold ?? DEFAULT_WIDTH_THRESHOLD;
	const sidebarPosition = config.ui?.sidebarPosition ?? "left";
	const horizontalTabPosition = config.ui?.horizontalTabPosition ?? "top";
	const showTabNumbers = config.ui?.showTabNumbers ?? false;
	const useVertical = terminalWidth >= widthThreshold;

	// Update tools state periodically to reflect log changes
	useEffect(() => {
		const interval = setInterval(() => {
			setTools([...processManager.getTools()]);
		}, 100);

		return () => clearInterval(interval);
	}, [processManager]);

	// Start all tools on mount
	useEffect(() => {
		for (let i = 0; i < initialTools.length; i++) {
			processManager.startTool(i);
		}
	}, [processManager, initialTools.length]);

	// Toggle line wrap function (used by both keyboard and command palette)
	const toggleLineWrap = useCallback(() => {
		setLineWrap((prev) => !prev);
	}, []);

	// Toggle debug console (OpenTUI built-in console)
	const toggleConsole = useCallback(() => {
		renderer.console.toggle();
	}, [renderer]);

	// Register commands for the command palette
	useEffect(() => {
		const commands = [
			{
				id: "search",
				label: "Search logs",
				shortcut: "/",
				category: "Navigation",
				action: () => {
					if (currentToolName) {
						updateTabSearchState(currentToolName, { searchMode: true });
					}
				},
			},
			{
				id: "toggle-line-wrap",
				label: lineWrap ? "Disable line wrapping" : "Enable line wrapping",
				shortcut: "w",
				category: "View",
				action: toggleLineWrap,
			},
			{
				id: "toggle-console",
				label: "Toggle debug console",
				category: "View",
				action: toggleConsole,
			},
			{
				id: "quit",
				label: "Quit",
				shortcut: "q",
				category: "Application",
				action: async () => {
					await processManager.cleanup();
					renderer.stop();
					renderer.destroy();
					process.exit(0);
				},
			},
			{
				id: "shortcuts",
				label: "Show keyboard shortcuts",
				shortcut: "?",
				category: "Help",
				action: () => setShortcutsOpen(true),
			},
		];

		// Add tab switching commands for all tabs (shortcuts only for first 9)
		for (let i = 0; i < tools.length; i++) {
			const tool = tools[i];
			if (tool) {
				commands.push({
					id: `switch-tab-${i}`,
					label: `Switch to ${tool.config.name}`,
					shortcut: i < 9 ? `${i + 1}` : undefined,
					category: "Tabs",
					action: () => {
						setNavigationKey((k) => k + 1);
						setActiveIndex(i);
					},
				});
			}
		}

		commandPalette.register(commands);

		return () => {
			commandPalette.clear();
		};
	}, [
		tools,
		processManager,
		renderer,
		currentToolName,
		updateTabSearchState,
		lineWrap,
		toggleLineWrap,
		toggleConsole,
	]);

	// Handle keyboard input
	useKeyboard(async (key) => {
		const isShuttingDown = processManager.getIsShuttingDown();

		if (key.ctrl && key.name === "c") {
			if (isShuttingDown) {
				// Already shutting down - force quit
				renderer.stop();
				renderer.destroy();
				process.exit(1);
				return;
			}

			// Priority 1: Close console if open
			if (renderer.console.visible) {
				renderer.console.hide();
				return;
			}

			// Priority 2: Close command palette if open
			if (commandPaletteOpen) {
				setCommandPaletteOpen(false);
				return;
			}

			// Priority 3: Close shortcuts modal if open
			if (shortcutsOpen) {
				setShortcutsOpen(false);
				return;
			}

			// Priority 4: Exit the program
			await processManager.cleanup();
			renderer.stop();
			renderer.destroy();
			process.exit(0);
			return;
		}

		// Skip most key handling when modals are open (they handle their own input)
		if (commandPaletteOpen || shortcutsOpen) {
			return;
		}

		// Skip most key handling when in search mode (LogViewer handles it)
		if (currentSearchState.searchMode) {
			return;
		}

		// Command palette shortcut: Ctrl+P or Ctrl+K
		if (key.ctrl && (key.name === "p" || key.name === "k")) {
			setCommandPaletteOpen(true);
			return;
		}

		// Shortcuts modal: ?
		if (key.name === "?") {
			setShortcutsOpen(true);
			return;
		}

		// Toggle line wrapping: w
		if (key.name === "w") {
			toggleLineWrap();
			return;
		}

		if (key.name === "q") {
			if (isShuttingDown) {
				// Already shutting down - ignore 'q'
				return;
			}
			// Start graceful shutdown
			await processManager.cleanup();
			renderer.stop();
			renderer.destroy();
			process.exit(0);
			return;
		}

		// Tab navigation - increment navigationKey to signal auto-scroll should happen
		if (key.name === "h" || key.name === "left") {
			setNavigationKey((k) => k + 1);
			setActiveIndex((prev) => (prev > 0 ? prev - 1 : tools.length - 1));
		}
		if (key.name === "l" || key.name === "right") {
			setNavigationKey((k) => k + 1);
			setActiveIndex((prev) => (prev < tools.length - 1 ? prev + 1 : 0));
		}
		if (key.name === "j" || key.name === "down") {
			if (useVertical) {
				setNavigationKey((k) => k + 1);
				setActiveIndex((prev) => (prev < tools.length - 1 ? prev + 1 : 0));
			}
		}
		if (key.name === "k" || key.name === "up") {
			if (useVertical) {
				setNavigationKey((k) => k + 1);
				setActiveIndex((prev) => (prev > 0 ? prev - 1 : tools.length - 1));
			}
		}

		// Number keys to switch tabs
		if (key.number && key.name) {
			const num = parseInt(key.name, 10);
			if (num >= 1 && num <= tools.length) {
				setNavigationKey((k) => k + 1);
				setActiveIndex(num - 1);
			}
		}
	});

	// Filter tabs based on shutdown state
	const isShuttingDown = processManager.getIsShuttingDown();
	const activeTools = tools.filter((tool) => {
		if (isShuttingDown) {
			// During shutdown: only show processes that are gracefully shutting down
			return tool.status === "shuttingDown";
		}
		// Normal operation: show all tabs (running, stopped, error, shuttingDown)
		return true;
	});

	// Find the active tool index in the filtered list
	const activeToolIndex = currentTool ? activeTools.indexOf(currentTool) : -1;
	const displayActiveIndex = activeToolIndex >= 0 ? activeToolIndex : 0;
	const activeTool = activeTools[displayActiveIndex];

	// During shutdown, ensure active tab stays valid as tabs are removed
	useEffect(() => {
		if (!isShuttingDown || activeTools.length === 0) return;

		// If current tool is no longer in activeTools, switch to first available
		if (activeToolIndex < 0 && activeTools.length > 0) {
			const firstShuttingDown = activeTools[0];
			if (firstShuttingDown) {
				const originalIndex = tools.indexOf(firstShuttingDown);
				if (originalIndex >= 0) {
					setNavigationKey((k) => k + 1);
					setActiveIndex(originalIndex);
				}
			}
		}
	}, [isShuttingDown, activeToolIndex, activeTools, tools]);

	const shuttingDownCount = activeTools.length;
	const hasShuttingDown = isShuttingDown && shuttingDownCount > 0;

	const tabBarComponent = (
		<TabBar
			tools={activeTools}
			activeIndex={displayActiveIndex}
			onSelect={(idx) => {
				const tool = activeTools[idx];
				if (tool) {
					const originalIndex = tools.indexOf(tool);
					if (originalIndex >= 0) {
						setActiveIndex(originalIndex);
					}
				}
			}}
			vertical={useVertical}
			theme={theme}
			width={terminalWidth}
			showTabNumbers={showTabNumbers}
			navigationKey={navigationKey}
		/>
	);

	const showLineNumbers = config.ui?.showLineNumbers ?? "auto";

	// Calculate sidebar width when in vertical mode (for LogViewer truncation calculation)
	// Vertical TabBar has width={20} + gap (1 char) = 21 chars
	const sidebarWidth = useVertical ? 21 : 0;

	const logViewerComponent = (
		<box
			flexGrow={1}
			flexDirection="column"
			height="100%"
			backgroundColor={theme.colors.surface0}
		>
			{activeTool ? (
				<LogViewer
					tool={activeTool}
					theme={theme}
					searchMode={currentSearchState.searchMode}
					searchQuery={currentSearchState.searchQuery}
					filterMode={currentSearchState.filterMode}
					currentMatchIndex={currentSearchState.currentMatchIndex}
					onSearchModeChange={(active) =>
						updateTabSearchState(activeTool.config.name, { searchMode: active })
					}
					onSearchQueryChange={(query) =>
						updateTabSearchState(activeTool.config.name, {
							searchQuery: query,
							currentMatchIndex: 0,
						})
					}
					onFilterModeChange={(filter) =>
						updateTabSearchState(activeTool.config.name, { filterMode: filter })
					}
					onCurrentMatchIndexChange={(index) =>
						updateTabSearchState(activeTool.config.name, {
							currentMatchIndex: index,
						})
					}
					showLineNumbers={showLineNumbers}
					lineWrap={lineWrap}
					sidebarWidth={sidebarWidth}
				/>
			) : (
				<scrollbox
					flexGrow={1}
					height="100%"
					padding={1}
					flexDirection="column"
					backgroundColor={theme.colors.background}
				>
					<text fg={theme.colors.text}>No active processes</text>
				</scrollbox>
			)}
		</box>
	);

	return (
		<box
			flexDirection="column"
			flexGrow={1}
			width="100%"
			height="100%"
			backgroundColor={theme.colors.background}
		>
			{hasShuttingDown && (
				<box
					height={1}
					paddingLeft={1}
					paddingRight={1}
					backgroundColor={theme.colors.warningBackground}
				>
					<text attributes={TextAttributes.BOLD} fg={theme.colors.warningText}>
						{StatusIcons.WARNING} WARNING: {shuttingDownCount} process
						{shuttingDownCount > 1 ? "es" : ""} shutting down gracefully. Please
						wait... Ctrl+C to force quit.
					</text>
				</box>
			)}
			{useVertical ? (
				// Vertical layout: sidebar on left or right
				<box flexDirection="row" flexGrow={1} width="100%" gap={1}>
					{sidebarPosition === "left" && tabBarComponent}
					{logViewerComponent}
					{sidebarPosition === "right" && tabBarComponent}
				</box>
			) : (
				// Horizontal layout: tabs on top or bottom
				<box flexDirection="column" flexGrow={1} width="100%">
					{horizontalTabPosition === "top" && tabBarComponent}
					{logViewerComponent}
					{horizontalTabPosition === "bottom" && tabBarComponent}
				</box>
			)}
			<HelpBar
				theme={theme}
				mode={getHelpBarMode()}
				isVerticalLayout={useVertical}
				width={terminalWidth}
			/>
			<ToastContainer theme={theme} />
			<CommandPalette
				theme={theme}
				isOpen={commandPaletteOpen}
				onClose={() => setCommandPaletteOpen(false)}
			/>
			<CommandPalette
				theme={theme}
				isOpen={shortcutsOpen}
				onClose={() => setShortcutsOpen(false)}
				showShortcuts
			/>
		</box>
	);

	function getHelpBarMode(): HelpBarMode {
		if (commandPaletteOpen) return "commandPalette";
		if (shortcutsOpen) return "shortcuts";
		if (currentSearchState.searchMode) return "search";
		return "normal";
	}
}
