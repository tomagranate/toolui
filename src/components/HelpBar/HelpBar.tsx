import type { Theme } from "../../lib/theme";

export type HelpBarMode = "normal" | "search" | "commandPalette" | "shortcuts";

interface HelpBarProps {
	theme: Theme;
	mode: HelpBarMode;
	/** Whether the layout is vertical (sidebar) or horizontal (top/bottom tabs) */
	isVerticalLayout: boolean;
	/** Terminal width for responsive display */
	width: number;
}

interface HintItem {
	/** Full key description */
	key: string;
	/** Compact key description */
	compactKey: string;
	/** Full action description */
	action: string;
	/** Compact action description */
	compactAction: string;
}

/**
 * Get hints based on current mode
 */
function getHintsForMode(mode: HelpBarMode, isVertical: boolean): HintItem[] {
	switch (mode) {
		case "search":
			return [
				{
					key: "^H",
					compactKey: "^H",
					action: "toggle filter",
					compactAction: "filter",
				},
				{
					key: "Enter",
					compactKey: "↵",
					action: "confirm",
					compactAction: "ok",
				},
				{ key: "Esc", compactKey: "⎋", action: "cancel", compactAction: "×" },
			];

		case "commandPalette":
		case "shortcuts":
			return [
				{
					key: "↑↓",
					compactKey: "↑↓",
					action: "navigate",
					compactAction: "nav",
				},
				{
					key: "Enter",
					compactKey: "↵",
					action: "select",
					compactAction: "sel",
				},
				{ key: "Esc", compactKey: "⎋", action: "close", compactAction: "×" },
			];

		default: {
			const tabHint = isVertical
				? {
						key: "j/k",
						compactKey: "j/k",
						action: "tabs",
						compactAction: "tabs",
					}
				: {
						key: "h/l",
						compactKey: "h/l",
						action: "tabs",
						compactAction: "tabs",
					};

			return [
				{
					key: "^P",
					compactKey: "^P",
					action: "palette",
					compactAction: "cmd",
				},
				{
					key: "?",
					compactKey: "?",
					action: "shortcuts",
					compactAction: "keys",
				},
				tabHint,
				{ key: "/", compactKey: "/", action: "search", compactAction: "find" },
				{ key: "q", compactKey: "q", action: "quit", compactAction: "quit" },
			];
		}
	}
}

/**
 * Format hints into a display string based on available width
 */
export function formatHints(hints: HintItem[], availableWidth: number): string {
	// Try full format first: "key: action | key: action"
	const fullFormat = hints.map((h) => `${h.key}: ${h.action}`).join(" | ");
	if (fullFormat.length <= availableWidth) {
		return fullFormat;
	}

	// Try compact format: "key:action | key:action"
	const compactFormat = hints
		.map((h) => `${h.compactKey}:${h.compactAction}`)
		.join(" | ");
	if (compactFormat.length <= availableWidth) {
		return compactFormat;
	}

	// Ultra-compact: "key key key"
	const ultraCompact = hints.map((h) => h.compactKey).join(" ");
	if (ultraCompact.length <= availableWidth) {
		return ultraCompact;
	}

	// Truncate if still too long
	return `${ultraCompact.slice(0, availableWidth - 1)}…`;
}

export function HelpBar({
	theme,
	mode,
	isVerticalLayout,
	width,
}: HelpBarProps) {
	const { colors } = theme;

	// Account for padding (1 char each side = 2 total)
	const availableWidth = width - 2;

	const hints = getHintsForMode(mode, isVerticalLayout);
	const displayText = formatHints(hints, availableWidth);

	return (
		<box
			height={1}
			width="100%"
			backgroundColor={colors.surface1}
			justifyContent="center"
			alignItems="center"
		>
			<text fg={colors.text}>{displayText}</text>
		</box>
	);
}
