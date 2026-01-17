import { type CliRenderer, TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import { LogViewer } from "./components/LogViewer";
import { TabBar } from "./components/TabBar";
import type { ProcessManager } from "./process-manager";
import type { Config, ToolState } from "./types";
import { getTheme } from "./utils/themes";

interface AppProps {
	processManager: ProcessManager;
	initialTools: ToolState[];
	renderer: CliRenderer;
	config: Config;
}

const DEFAULT_WIDTH_THRESHOLD = 100;

export function App({
	processManager,
	initialTools,
	renderer,
	config,
}: AppProps) {
	const [tools, setTools] = useState<ToolState[]>(initialTools);
	const [activeIndex, setActiveIndex] = useState(0);
	const { width: terminalWidth } = useTerminalDimensions();

	const widthThreshold = config.ui?.widthThreshold ?? DEFAULT_WIDTH_THRESHOLD;
	const sidebarPosition = config.ui?.sidebarPosition ?? "left";
	const horizontalTabPosition = config.ui?.horizontalTabPosition ?? "top";
	const theme = getTheme(config.ui?.theme);
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

	// Handle keyboard input
	useKeyboard(async (key) => {
		if (key.ctrl && key.name === "c") {
			// Trigger graceful shutdown (same as 'q')
			// Don't stop renderer yet - let it show shutdown progress
			await processManager.cleanup();
			renderer.stop();
			renderer.destroy();
			process.exit(0);
			return;
		}

		if (key.name === "q") {
			// Trigger graceful shutdown
			// Don't stop renderer yet - let it show shutdown progress
			await processManager.cleanup();
			renderer.stop();
			renderer.destroy();
			process.exit(0);
			return;
		}

		// Tab navigation
		if (key.name === "h" || key.name === "left") {
			setActiveIndex((prev) => (prev > 0 ? prev - 1 : tools.length - 1));
		}
		if (key.name === "l" || key.name === "right") {
			setActiveIndex((prev) => (prev < tools.length - 1 ? prev + 1 : 0));
		}
		if (key.name === "j" || key.name === "down") {
			if (useVertical) {
				setActiveIndex((prev) => (prev < tools.length - 1 ? prev + 1 : 0));
			}
		}
		if (key.name === "k" || key.name === "up") {
			if (useVertical) {
				setActiveIndex((prev) => (prev > 0 ? prev - 1 : tools.length - 1));
			}
		}

		// Number keys to switch tabs
		if (key.number && key.name) {
			const num = parseInt(key.name, 10);
			if (num >= 1 && num <= tools.length) {
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
	const currentTool = tools[activeIndex];
	const activeToolIndex = currentTool ? activeTools.indexOf(currentTool) : -1;
	const displayActiveIndex = activeToolIndex >= 0 ? activeToolIndex : 0;
	const activeTool = activeTools[displayActiveIndex];

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
		/>
	);

	const logViewerComponent = (
		<box
			flexGrow={1}
			flexDirection="column"
			height="100%"
			border
			borderStyle="rounded"
		>
			{activeTool ? (
				<LogViewer tool={activeTool} theme={theme} />
			) : (
				<scrollbox
					flexGrow={1}
					height="100%"
					padding={1}
					flexDirection="column"
					backgroundColor={theme.colors.background}
					focused
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
						WARNING: {shuttingDownCount} process
						{shuttingDownCount > 1 ? "es" : ""} shutting down gracefully. Please
						wait...
					</text>
				</box>
			)}
			{useVertical ? (
				// Vertical layout: sidebar on left or right
				<box flexDirection="row" flexGrow={1} width="100%">
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
			<box
				height={3}
				border
				borderStyle="rounded"
				paddingLeft={1}
				paddingRight={1}
				backgroundColor={theme.colors.background}
			>
				<text fg={theme.colors.text}>
					{useVertical
						? "←/→ or h/l: switch tabs | Page Up/Down: scroll logs | Home/End: top/bottom | q: quit"
						: "←/→ or h/l: switch tabs | 1-9: jump to tab | Page Up/Down: scroll logs | Home/End: top/bottom | q: quit"}
				</text>
			</box>
		</box>
	);
}
