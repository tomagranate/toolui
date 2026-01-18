import type { ScrollBoxRenderable } from "@opentui/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolState } from "../types";
import type { Theme } from "../utils/themes";

interface LogViewerProps {
	tool: ToolState;
	theme: Theme;
}

interface ScrollInfo {
	linesAbove: number;
	linesBelow: number;
}

export function LogViewer({ tool, theme }: LogViewerProps) {
	const { colors } = theme;
	const scrollboxRef = useRef<ScrollBoxRenderable>(null);
	const [scrollInfo, setScrollInfo] = useState<ScrollInfo>({
		linesAbove: 0,
		linesBelow: 0,
	});

	// Convert logs to plain text (just concatenate segment text)
	const logLines = tool.logs.map((segments) =>
		segments.map((segment) => segment.text).join(""),
	);

	const totalLines = logLines.length;

	// Update scroll info based on current scroll position
	const updateScrollInfo = useCallback(() => {
		const scrollbox = scrollboxRef.current;
		if (!scrollbox) return;

		const scrollTop = scrollbox.scrollTop;
		const viewportHeight = scrollbox.viewport.height;
		const contentHeight = scrollbox.scrollHeight;

		// Calculate lines above and below (assuming 1 line = 1 unit height)
		const linesAbove = Math.floor(scrollTop);
		const linesBelow = Math.max(
			0,
			Math.floor(contentHeight - scrollTop - viewportHeight),
		);

		setScrollInfo({ linesAbove, linesBelow });
	}, []);

	// Update scroll info when logs change
	// biome-ignore lint/correctness/useExhaustiveDependencies: totalLines triggers update when new logs arrive
	useEffect(() => {
		updateScrollInfo();
	}, [updateScrollInfo, totalLines]);

	// Set up an interval to check scroll position periodically
	useEffect(() => {
		const interval = setInterval(updateScrollInfo, 100);
		return () => clearInterval(interval);
	}, [updateScrollInfo]);

	const scrollToTop = useCallback(() => {
		scrollboxRef.current?.scrollTo(0);
	}, []);

	const scrollToBottom = useCallback(() => {
		const scrollbox = scrollboxRef.current;
		if (scrollbox) {
			scrollbox.scrollTo(scrollbox.scrollHeight);
		}
	}, []);

	return (
		<box flexGrow={1} height="100%" flexDirection="column">
			{/* Top scroll indicator */}
			{scrollInfo.linesAbove > 0 && (
				<box
					height={1}
					width="100%"
					justifyContent="center"
					alignItems="center"
					backgroundColor={colors.background}
					onMouseUp={scrollToTop}
				>
					<text fg={colors.inactiveTabText}>
						↑ {scrollInfo.linesAbove} more ↑
					</text>
				</box>
			)}

			<scrollbox
				ref={scrollboxRef}
				flexGrow={1}
				height="100%"
				paddingLeft={1}
				paddingRight={1}
				backgroundColor={colors.background}
				stickyScroll
				stickyStart="bottom"
				scrollbarOptions={{
					paddingLeft: 1,
				}}
			>
				{tool.logs.length === 0 ? (
					<text fg={colors.text}>
						{tool.status === "running"
							? "Waiting for output..."
							: tool.status === "shuttingDown"
								? "Shutting down gracefully..."
								: tool.status === "error"
									? `Process error (exit code: ${tool.exitCode ?? "unknown"})`
									: "Process not started"}
					</text>
				) : (
					logLines.map((line, index) => (
						<text key={`log-${tool.config.name}-${index}`} fg={colors.text}>
							{line}
						</text>
					))
				)}
			</scrollbox>

			{/* Bottom scroll indicator */}
			{scrollInfo.linesBelow > 0 && (
				<box
					height={1}
					width="100%"
					justifyContent="center"
					alignItems="center"
					backgroundColor={colors.background}
					onMouseUp={scrollToBottom}
				>
					<text fg={colors.inactiveTabText}>
						↓ {scrollInfo.linesBelow} more ↓
					</text>
				</box>
			)}
		</box>
	);
}
