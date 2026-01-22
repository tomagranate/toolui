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
		// Surface hierarchy (darker to lighter in dark mode)
		surface0: string; // Base - LogViewer content area
		surface1: string; // Elevated - TabBar, HelpBar, gutter
		surface2: string; // Overlay - Modals, Toasts, Search bar

		// Text
		text: string; // Primary text color
		textDim: string; // Secondary readable text (shortcuts, hints)
		textMuted: string; // Tertiary text (line numbers, borders)

		// Semantic colors (used for text, icons, borders, AND backgrounds)
		accent: string; // Brand/primary - active tabs, cursor, highlights
		success: string; // Positive - running processes, success feedback
		warning: string; // Caution - shutting down, warnings, search matches
		error: string; // Negative - errors, failures

		// Foreground pairs (text ON semantic backgrounds)
		accentForeground: string; // Text ON accent background
		warningForeground: string; // Text ON warning background

		// Selection
		selectionBackground: string; // Selected/highlighted lines
	};
}

const DEFAULT_THEME: Theme = {
	name: "Default",
	colors: {
		surface0: "#000000",
		surface1: "#1a1a1a",
		surface2: "#2a2a2a",
		text: "#ffffff",
		textDim: "#aaaaaa",
		textMuted: "#666666",
		accent: "#333333",
		success: "#00ff00",
		warning: "#ffff00",
		error: "#ff0000",
		accentForeground: "#ffffff",
		warningForeground: "#000000",
		selectionBackground: "#333333",
	},
};

export const themes: Record<string, Theme> = {
	terminal: {
		name: "Terminal (auto)",
		// Placeholder colors - actual terminal theme is detected at runtime
		// and passed to ThemeProvider. This entry exists so it appears in the picker.
		colors: DEFAULT_THEME.colors,
	},
	default: DEFAULT_THEME,
	dracula: {
		name: "Dracula",
		colors: {
			surface0: "#282a36",
			surface1: "#44475a",
			surface2: "#6272a4",
			text: "#f8f8f2",
			textDim: "#bfbfca",
			textMuted: "#6272a4",
			accent: "#bd93f9",
			success: "#50fa7b",
			warning: "#f1fa8c",
			error: "#ff5555",
			accentForeground: "#282a36",
			warningForeground: "#282a36",
			selectionBackground: "#44475a",
		},
	},
	nord: {
		name: "Nord",
		colors: {
			surface0: "#2e3440",
			surface1: "#3b4252",
			surface2: "#434c5e",
			text: "#eceff4",
			textDim: "#d8dee9",
			textMuted: "#4c566a",
			accent: "#5e81ac",
			success: "#a3be8c",
			warning: "#ebcb8b",
			error: "#bf616a",
			accentForeground: "#eceff4",
			warningForeground: "#2e3440",
			selectionBackground: "#3b4252",
		},
	},
	onedark: {
		name: "One Dark",
		colors: {
			surface0: "#282c34",
			surface1: "#3e4451",
			surface2: "#4b5263",
			text: "#abb2bf",
			textDim: "#848b98",
			textMuted: "#5c6370",
			accent: "#61afef",
			success: "#98c379",
			warning: "#e5c07b",
			error: "#e06c75",
			accentForeground: "#282c34",
			warningForeground: "#282c34",
			selectionBackground: "#3e4451",
		},
	},
	solarized: {
		name: "Solarized Dark",
		colors: {
			surface0: "#002b36",
			surface1: "#073642",
			surface2: "#586e75",
			text: "#839496",
			textDim: "#93a1a1",
			textMuted: "#586e75",
			accent: "#268bd2",
			success: "#859900",
			warning: "#b58900",
			error: "#dc322f",
			accentForeground: "#fdf6e3",
			warningForeground: "#002b36",
			selectionBackground: "#073642",
		},
	},
	gruvbox: {
		name: "Gruvbox",
		colors: {
			surface0: "#282828",
			surface1: "#3c3836",
			surface2: "#504945",
			text: "#ebdbb2",
			textDim: "#bdae93",
			textMuted: "#928374",
			accent: "#fe8019",
			success: "#b8bb26",
			warning: "#fabd2f",
			error: "#fb4934",
			accentForeground: "#282828",
			warningForeground: "#282828",
			selectionBackground: "#3c3836",
		},
	},
	catppuccin: {
		name: "Catppuccin Mocha",
		colors: {
			surface0: "#1e1e2e",
			surface1: "#313244",
			surface2: "#45475a",
			text: "#cdd6f4",
			textDim: "#a6adc8",
			textMuted: "#6c7086",
			accent: "#cba6f7",
			success: "#a6e3a1",
			warning: "#f9e2af",
			error: "#f38ba8",
			accentForeground: "#1e1e2e",
			warningForeground: "#1e1e2e",
			selectionBackground: "#313244",
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

	// Use blue for accent - it's more consistent across themes
	// (magenta/slot 5 varies wildly: purple, orange, pink, etc.)
	const accent = paletteBlue;

	// Derive contrasting text colors
	const accentForeground = getContrastingTextColor(accent);
	const warningForeground = getContrastingTextColor(paletteYellow);

	// Create dimmed versions of foreground for secondary text
	const textDim = dimColor(foreground, 0.25); // 75% brightness
	const textMuted = dimColor(foreground, 0.5); // 50% brightness

	// Create a slightly lighter background for selection
	const selectionBackground = lightenColor(background, 0.15);

	// Derive surface colors (progressively lighter in dark mode)
	const surface0 = background;
	const surface1 = lightenColor(background, 0.08);
	const surface2 = lightenColor(background, 0.15);

	return {
		name: "Terminal",
		colors: {
			surface0,
			surface1,
			surface2,
			text: foreground,
			textDim,
			textMuted,
			accent,
			success: paletteGreen,
			warning: paletteYellow,
			error: paletteRed,
			accentForeground,
			warningForeground,
			selectionBackground,
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
