import {
	ghosttyConfigToTerminalColors,
	readGhosttyConfig,
} from "./ghostty-config";
import {
	queryTerminalColorsBatch,
	type TerminalColors,
} from "./terminal-colors";

export interface Theme {
	name: string;
	colors: {
		background: string;
		text: string;
		activeTabBackground: string;
		activeTabText: string;
		inactiveTabText: string;
		statusRunning: string;
		statusShuttingDown: string;
		statusError: string;
		statusStopped: string;
		warningBackground: string;
		warningText: string;
		// Log viewer colors
		lineNumberText: string;
		selectedLineBackground: string;
		searchMatchBackground: string;
		searchMatchText: string;
		searchSlash: string;
	};
}

const DEFAULT_THEME: Theme = {
	name: "Default",
	colors: {
		background: "black",
		text: "white",
		activeTabBackground: "#333333",
		activeTabText: "white",
		inactiveTabText: "white",
		statusRunning: "green",
		statusShuttingDown: "yellow",
		statusError: "red",
		statusStopped: "white",
		warningBackground: "yellow",
		warningText: "black",
		lineNumberText: "#666666",
		selectedLineBackground: "#333333",
		searchMatchBackground: "#444400",
		searchMatchText: "#ffff00",
		searchSlash: "#ffff00",
	},
};

export const themes: Record<string, Theme> = {
	default: DEFAULT_THEME,
	dracula: {
		name: "Dracula",
		colors: {
			background: "#282a36",
			text: "#f8f8f2",
			activeTabBackground: "#bd93f9",
			activeTabText: "#282a36",
			inactiveTabText: "#f8f8f2",
			statusRunning: "#50fa7b",
			statusShuttingDown: "#f1fa8c",
			statusError: "#ff5555",
			statusStopped: "#6272a4",
			warningBackground: "#f1fa8c",
			warningText: "#282a36",
			lineNumberText: "#6272a4",
			selectedLineBackground: "#44475a",
			searchMatchBackground: "#50fa7b33",
			searchMatchText: "#50fa7b",
			searchSlash: "#bd93f9",
		},
	},
	nord: {
		name: "Nord",
		colors: {
			background: "#2e3440",
			text: "#eceff4",
			activeTabBackground: "#5e81ac",
			activeTabText: "#eceff4",
			inactiveTabText: "#d8dee9",
			statusRunning: "#a3be8c",
			statusShuttingDown: "#ebcb8b",
			statusError: "#bf616a",
			statusStopped: "#4c566a",
			warningBackground: "#ebcb8b",
			warningText: "#2e3440",
			lineNumberText: "#4c566a",
			selectedLineBackground: "#3b4252",
			searchMatchBackground: "#ebcb8b33",
			searchMatchText: "#ebcb8b",
			searchSlash: "#5e81ac",
		},
	},
	onedark: {
		name: "One Dark",
		colors: {
			background: "#282c34",
			text: "#abb2bf",
			activeTabBackground: "#61afef",
			activeTabText: "#282c34",
			inactiveTabText: "#abb2bf",
			statusRunning: "#98c379",
			statusShuttingDown: "#e5c07b",
			statusError: "#e06c75",
			statusStopped: "#5c6370",
			warningBackground: "#e5c07b",
			warningText: "#282c34",
			lineNumberText: "#5c6370",
			selectedLineBackground: "#3e4451",
			searchMatchBackground: "#e5c07b33",
			searchMatchText: "#e5c07b",
			searchSlash: "#61afef",
		},
	},
	solarized: {
		name: "Solarized Dark",
		colors: {
			background: "#002b36",
			text: "#839496",
			activeTabBackground: "#268bd2",
			activeTabText: "#fdf6e3",
			inactiveTabText: "#93a1a1",
			statusRunning: "#859900",
			statusShuttingDown: "#b58900",
			statusError: "#dc322f",
			statusStopped: "#586e75",
			warningBackground: "#b58900",
			warningText: "#002b36",
			lineNumberText: "#586e75",
			selectedLineBackground: "#073642",
			searchMatchBackground: "#b5890033",
			searchMatchText: "#b58900",
			searchSlash: "#268bd2",
		},
	},
	gruvbox: {
		name: "Gruvbox",
		colors: {
			background: "#282828",
			text: "#ebdbb2",
			activeTabBackground: "#fe8019",
			activeTabText: "#282828",
			inactiveTabText: "#ebdbb2",
			statusRunning: "#b8bb26",
			statusShuttingDown: "#fabd2f",
			statusError: "#fb4934",
			statusStopped: "#928374",
			warningBackground: "#fabd2f",
			warningText: "#282828",
			lineNumberText: "#928374",
			selectedLineBackground: "#3c3836",
			searchMatchBackground: "#fabd2f33",
			searchMatchText: "#fabd2f",
			searchSlash: "#fe8019",
		},
	},
	catppuccin: {
		name: "Catppuccin Mocha",
		colors: {
			background: "#1e1e2e",
			text: "#cdd6f4",
			activeTabBackground: "#cba6f7",
			activeTabText: "#1e1e2e",
			inactiveTabText: "#bac2de",
			statusRunning: "#a6e3a1",
			statusShuttingDown: "#f9e2af",
			statusError: "#f38ba8",
			statusStopped: "#6c7086",
			warningBackground: "#f9e2af",
			warningText: "#1e1e2e",
			lineNumberText: "#6c7086",
			selectedLineBackground: "#313244",
			searchMatchBackground: "#f9e2af33",
			searchMatchText: "#f9e2af",
			searchSlash: "#cba6f7",
		},
	},
};

export function getTheme(themeName?: string): Theme {
	if (!themeName) {
		return DEFAULT_THEME;
	}
	const theme = themes[themeName];
	return theme ?? DEFAULT_THEME;
}

/**
 * Maps ANSI color codes to OpenTUI-compatible color names or hex values.
 * @param ansiCode - ANSI color code (30-37 for standard, 90-97 for bright)
 * @param isBright - Whether this is a bright color (90-97 range)
 * @returns Color name or hex value, or undefined if not supported
 */
export function mapAnsiColor(
	ansiCode: number,
	isBright: boolean,
): string | undefined {
	// Standard colors (30-37) and bright colors (90-97)
	const colorMap: Record<number, { standard: string; bright: string }> = {
		0: { standard: "black", bright: "black" },
		1: { standard: "red", bright: "red" },
		2: { standard: "green", bright: "green" },
		3: { standard: "yellow", bright: "yellow" },
		4: { standard: "blue", bright: "blue" },
		5: { standard: "magenta", bright: "magenta" },
		6: { standard: "cyan", bright: "cyan" },
		7: { standard: "white", bright: "white" },
	};

	const baseCode = isBright ? ansiCode - 90 : ansiCode - 30;
	const color = colorMap[baseCode];
	if (!color) {
		return undefined;
	}

	return isBright ? color.bright : color.standard;
}

/**
 * Calculates the relative luminance of a hex color.
 * Used to determine if text should be light or dark for contrast.
 * @param hex - Hex color string (e.g., "#1e1e2e")
 * @returns Luminance value between 0 (black) and 1 (white)
 */
function getLuminance(hex: string): number {
	// Remove # prefix if present
	const color = hex.replace(/^#/, "");

	// Parse RGB components
	const r = Number.parseInt(color.substring(0, 2), 16) / 255;
	const g = Number.parseInt(color.substring(2, 4), 16) / 255;
	const b = Number.parseInt(color.substring(4, 6), 16) / 255;

	// Apply sRGB gamma correction
	const rLinear = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
	const gLinear = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
	const bLinear = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

	// Calculate luminance using ITU-R BT.709 coefficients
	return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Returns a contrasting text color (black or white) for the given background.
 * Uses a lower threshold (0.4) to ensure better readability on medium-bright
 * colors like yellow/gold which have luminance around 0.5.
 */
function getContrastingTextColor(backgroundColor: string): string {
	const luminance = getLuminance(backgroundColor);
	// Use black text on backgrounds with luminance > 0.4 for better contrast
	// This ensures yellows/golds (luminance ~0.5) get dark text
	return luminance > 0.4 ? "#000000" : "#ffffff";
}

/**
 * Dims a hex color by mixing it with black.
 * @param hex - Hex color string
 * @param amount - Amount to dim (0-1, where 0 is no change and 1 is black)
 */
function dimColor(hex: string, amount: number): string {
	const color = hex.replace(/^#/, "");
	const r = Math.round(
		Number.parseInt(color.substring(0, 2), 16) * (1 - amount),
	);
	const g = Math.round(
		Number.parseInt(color.substring(2, 4), 16) * (1 - amount),
	);
	const b = Math.round(
		Number.parseInt(color.substring(4, 6), 16) * (1 - amount),
	);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Lightens a hex color by mixing it with white.
 * @param hex - Hex color string
 * @param amount - Amount to lighten (0-1, where 0 is no change and 1 is white)
 */
function lightenColor(hex: string, amount: number): string {
	const color = hex.replace(/^#/, "");
	const r = Math.round(
		Number.parseInt(color.substring(0, 2), 16) +
			(255 - Number.parseInt(color.substring(0, 2), 16)) * amount,
	);
	const g = Math.round(
		Number.parseInt(color.substring(2, 4), 16) +
			(255 - Number.parseInt(color.substring(2, 4), 16)) * amount,
	);
	const b = Math.round(
		Number.parseInt(color.substring(4, 6), 16) +
			(255 - Number.parseInt(color.substring(4, 6), 16)) * amount,
	);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Builds a Theme object from terminal colors.
 * Maps ANSI palette colors to semantic theme colors.
 *
 * @param colors - Terminal colors from OSC query or config file
 * @returns A complete Theme object
 */
export function buildTerminalTheme(colors: TerminalColors): Theme {
	// Default fallbacks
	const background = colors.background ?? "#000000";
	const foreground = colors.foreground ?? "#ffffff";

	// ANSI palette mapping:
	// 0: black, 1: red, 2: green, 3: yellow, 4: blue, 5: magenta, 6: cyan, 7: white
	const paletteRed = colors.palette[1] ?? "#ff0000";
	const paletteGreen = colors.palette[2] ?? "#00ff00";
	const paletteYellow = colors.palette[3] ?? "#ffff00";
	const paletteBlue = colors.palette[4] ?? "#0000ff";

	// Use blue for active tab background - it's more consistent across themes
	// (magenta/slot 5 varies wildly: purple, orange, pink, etc.)
	const activeTabBackground = paletteBlue;

	// Derive contrasting text colors
	const activeTabText = getContrastingTextColor(activeTabBackground);
	const warningText = getContrastingTextColor(paletteYellow);

	// Create a dimmed version of foreground for stopped status
	const statusStopped = dimColor(foreground, 0.4);

	// Create a dimmed version of foreground for line numbers
	const lineNumberText = dimColor(foreground, 0.5);

	// Create a slightly lighter background for selection
	const selectedLineBackground = lightenColor(background, 0.15);

	return {
		name: "Terminal",
		colors: {
			background,
			text: foreground,
			activeTabBackground,
			activeTabText,
			inactiveTabText: foreground,
			statusRunning: paletteGreen,
			statusShuttingDown: paletteYellow,
			statusError: paletteRed,
			statusStopped,
			warningBackground: paletteYellow,
			warningText,
			lineNumberText,
			selectedLineBackground,
			searchMatchBackground: `${paletteYellow}33`,
			searchMatchText: paletteYellow,
			searchSlash: paletteBlue,
		},
	};
}

/**
 * Detects and builds a theme from the terminal's colors.
 * Uses a hybrid approach:
 * 1. First tries OSC escape sequence queries (works with any xterm-compatible terminal)
 * 2. Falls back to parsing Ghostty config file
 * 3. Returns undefined if neither method works
 *
 * @returns A Theme object or undefined if detection fails
 */
export async function getTerminalTheme(): Promise<Theme | undefined> {
	// Try OSC query first (most portable)
	const oscColors = await queryTerminalColorsBatch(300);
	if (oscColors && (oscColors.foreground || oscColors.background)) {
		return buildTerminalTheme(oscColors);
	}

	// Fall back to Ghostty config parsing
	const ghosttyConfig = await readGhosttyConfig();
	if (ghosttyConfig && (ghosttyConfig.foreground || ghosttyConfig.background)) {
		const colors = ghosttyConfigToTerminalColors(ghosttyConfig);
		return buildTerminalTheme(colors);
	}

	return undefined;
}
