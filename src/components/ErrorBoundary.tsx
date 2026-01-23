import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { Component, type ErrorInfo, type ReactNode, useState } from "react";

interface Props {
	children?: ReactNode;
	/** Called when exiting from error state - should clean up renderer */
	onExit?: () => void;
	/** Called to copy text to clipboard - should use renderer's real stdout */
	onCopy?: (text: string) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

/**
 * Error boundary that catches React rendering errors.
 * Renders a clean error page with Ctrl-C handling to exit.
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	override componentDidCatch(_error: Error, errorInfo: ErrorInfo): void {
		// Store error info for display
		this.setState({ errorInfo });
	}

	override render(): ReactNode {
		if (this.state.hasError) {
			return (
				<ErrorPage
					error={this.state.error}
					errorInfo={this.state.errorInfo}
					onExit={this.props.onExit}
					onCopy={this.props.onCopy}
				/>
			);
		}

		return this.props.children;
	}
}

// Moss theme colors
const colors = {
	surface0: "#0f1214", // Darker charcoal base
	surface1: "#1a1f22", // Slightly elevated
	surface2: "#262d31", // Overlay/modal
	text: "#c8d0d8", // Soft white with slight green tint
	textDim: "#8a9ba5", // Muted
	textMuted: "#4a5860", // Very muted
	accent: "#2d6b52", // Deep British racing green
	error: "#c75f5f", // Muted red
};

/** Error page component styled with Moss theme */
function ErrorPage({
	error,
	errorInfo,
	onExit,
	onCopy,
}: {
	error: Error | null;
	errorInfo: ErrorInfo | null;
	onExit?: () => void;
	onCopy?: (text: string) => void;
}) {
	const { width, height } = useTerminalDimensions();
	const [copied, setCopied] = useState(false);

	// Split stack trace into lines for display
	const stackLines = error?.stack?.split("\n").slice(1) ?? []; // Skip first line (error message)
	const componentStackLines =
		errorInfo?.componentStack?.split("\n").filter((line) => line.trim()) ?? [];

	// Handle keyboard shortcuts
	useKeyboard((key) => {
		if (key.ctrl && key.name === "c") {
			// Use provided cleanup if available (properly stops renderer)
			if (onExit) {
				onExit();
			}
			process.exit(1);
		}

		// 'c' to copy stack trace
		if (key.name === "c" && !key.ctrl && onCopy && error?.stack) {
			onCopy(error.stack);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	});

	return (
		<box
			width={width}
			height={height}
			flexDirection="column"
			backgroundColor={colors.surface0}
		>
			{/* Header */}
			<box height={1} backgroundColor={colors.error} paddingLeft={1}>
				<text fg={colors.surface0} attributes={TextAttributes.BOLD}>
					Application Error
				</text>
			</box>

			{/* Content */}
			<scrollbox
				flexGrow={1}
				paddingLeft={1}
				paddingTop={1}
				backgroundColor={colors.surface0}
			>
				{/* Error message */}
				<text fg={colors.error} attributes={TextAttributes.BOLD}>
					Error:{" "}
				</text>
				<text fg={colors.text}>{error?.message ?? "Unknown error"}</text>
				<text> </text>

				{/* Stack trace */}
				{stackLines.length > 0 && (
					<>
						<text fg={colors.accent} attributes={TextAttributes.BOLD}>
							Stack Trace:
						</text>
						{stackLines.map((line, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: stack lines have no stable identity
							<text key={i} fg={colors.textDim}>
								{line}
							</text>
						))}
						<text> </text>
					</>
				)}

				{/* Component stack */}
				{componentStackLines.length > 0 && (
					<>
						<text fg={colors.accent} attributes={TextAttributes.BOLD}>
							Component Stack:
						</text>
						{componentStackLines.map((line, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: stack lines have no stable identity
							<text key={i} fg={colors.textDim}>
								{line}
							</text>
						))}
					</>
				)}
			</scrollbox>

			{/* Footer */}
			<box height={1} backgroundColor={colors.surface1} paddingLeft={1}>
				{copied ? (
					<text fg={colors.accent} attributes={TextAttributes.BOLD}>
						Copied to clipboard!
					</text>
				) : (
					<text fg={colors.textDim}>
						<b>c</b> copy stack trace {"  "} <b>Ctrl+C</b> exit
					</text>
				)}
			</box>
		</box>
	);
}
