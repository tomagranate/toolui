import type { ToolState } from "../types";
import type { Theme } from "../utils/themes";

interface LogViewerProps {
	tool: ToolState;
	theme: Theme;
}

export function LogViewer({ tool, theme }: LogViewerProps) {
	const { colors } = theme;

	// Convert logs to plain text (just concatenate segment text)
	const logLines = tool.logs.map((segments) =>
		segments.map((segment) => segment.text).join(""),
	);

	return (
		<scrollbox
			flexGrow={1}
			height="100%"
			border
			borderStyle="single"
			padding={1}
			flexDirection="column"
			backgroundColor={colors.background}
			focused
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
	);
}
