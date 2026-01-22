import {
	ghosttyConfigToTerminalColors,
	readGhosttyConfig,
} from "./ghostty-config";
import {
	queryTerminalColorsBatch,
	type TerminalColors,
} from "./terminal-colors";

/**
 * ANSI color palette with standard (0-7) and bright (8-15) colors.
 * Used for rendering ANSI escape codes in log output.
 */
export interface AnsiPalette {
	/** Standard colors: black, red, green, yellow, blue, magenta, cyan, white */
	standard: [string, string, string, string, string, string, string, string];
	/** Bright colors: bright black (gray), bright red, green, yellow, blue, magenta, cyan, white */
	bright: [string, string, string, string, string, string, string, string];
}

/**
 * Default ANSI palette with standard terminal colors.
 */
export const DEFAULT_ANSI_PALETTE: AnsiPalette = {
	standard: [
		"#000000", // 0: Black
		"#cc0000", // 1: Red
		"#00cc00", // 2: Green
		"#cccc00", // 3: Yellow
		"#0000cc", // 4: Blue
		"#cc00cc", // 5: Magenta
		"#00cccc", // 6: Cyan
		"#cccccc", // 7: White
	],
	bright: [
		"#666666", // 8: Bright Black (Gray)
		"#ff0000", // 9: Bright Red
		"#00ff00", // 10: Bright Green
		"#ffff00", // 11: Bright Yellow
		"#0000ff", // 12: Bright Blue
		"#ff00ff", // 13: Bright Magenta
		"#00ffff", // 14: Bright Cyan
		"#ffffff", // 15: Bright White
	],
};

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
	/** ANSI color palette for log output rendering */
	ansiPalette: AnsiPalette;
}

// Moss: Dark mode with deep greens and British racing green accent
const DEFAULT_THEME: Theme = {
	name: "Moss",
	colors: {
		surface0: "#0f1214", // Darker charcoal base
		surface1: "#1a1f22", // Slightly elevated
		surface2: "#262d31", // Overlay/modal
		text: "#c8d0d8", // Soft white with slight green tint
		textDim: "#8a9ba5", // Muted
		textMuted: "#4a5860", // Very muted
		accent: "#2d6b52", // Deep British racing green
		success: "#5cb885", // Vibrant but not harsh green
		warning: "#d4a645", // Warm gold
		error: "#c75f5f", // Muted red
		accentForeground: "#e0f0ea",
		warningForeground: "#0f1214",
		selectionBackground: "#2a3a35",
	},
	ansiPalette: DEFAULT_ANSI_PALETTE,
};

export const themes: Record<string, Theme> = {
	terminal: {
		name: "Terminal (auto)",
		// Placeholder colors - actual terminal theme is detected at runtime
		// and passed to ThemeProvider. This entry exists so it appears in the picker.
		colors: DEFAULT_THEME.colors,
		ansiPalette: DEFAULT_ANSI_PALETTE,
	},
	default: DEFAULT_THEME,

	// Mist: Cool light mode with blue tints
	mist: {
		name: "Mist",
		colors: {
			surface0: "#ffffff", // Pure white base
			surface1: "#e8edf2", // Light blue-gray
			surface2: "#d0d8e0", // Medium blue-gray for modals
			text: "#1a2530", // Dark blue-black text
			textDim: "#4a5a6a", // Medium blue-gray text
			textMuted: "#8a9aaa", // Muted blue-gray
			accent: "#4a7a9a", // Soft steel blue
			success: "#3a8a6a", // Teal green
			warning: "#a08030", // Muted gold
			error: "#a04545", // Muted red
			accentForeground: "#ffffff",
			warningForeground: "#1a2530",
			selectionBackground: "#c5d5e5",
		},
		// Softer palette for light mode
		ansiPalette: {
			standard: [
				"#1a2530", // 0: Black (dark text color)
				"#a04545", // 1: Red (matches error)
				"#3a8a6a", // 2: Green (matches success)
				"#a08030", // 3: Yellow (matches warning)
				"#4a7a9a", // 4: Blue (matches accent)
				"#8a5a8a", // 5: Magenta
				"#3a8a8a", // 6: Cyan
				"#e8edf2", // 7: White (light surface)
			],
			bright: [
				"#4a5a6a", // 8: Bright Black (dim text)
				"#c05050", // 9: Bright Red
				"#4aaa7a", // 10: Bright Green
				"#c0a040", // 11: Bright Yellow
				"#5a9aba", // 12: Bright Blue
				"#aa6aaa", // 13: Bright Magenta
				"#4aaaaa", // 14: Bright Cyan
				"#ffffff", // 15: Bright White
			],
		},
	},

	// Cappuccino: Coffee-inspired with rich browns
	cappuccino: {
		name: "Cappuccino",
		colors: {
			surface0: "#1a1410", // Dark roasted bean
			surface1: "#2c2018", // Espresso - browner
			surface2: "#382e26", // Coffee with cream
			text: "#f0e8e0", // Milk foam
			textDim: "#c0b0a0", // Steamed milk
			textMuted: "#705848", // Coffee grounds
			accent: "#c8b090", // Creamy latte
			success: "#70a068", // Mint leaf
			warning: "#c09050", // Caramel drizzle
			error: "#a05040", // Cinnamon
			accentForeground: "#1a1410",
			warningForeground: "#1a1410",
			selectionBackground: "#403028",
		},
		// Warm, earthy palette
		ansiPalette: {
			standard: [
				"#1a1410", // 0: Black (surface0)
				"#a05040", // 1: Red (cinnamon)
				"#70a068", // 2: Green (mint)
				"#c09050", // 3: Yellow (caramel)
				"#6080a0", // 4: Blue (muted steel)
				"#906080", // 5: Magenta (berry)
				"#609090", // 6: Cyan (teal)
				"#c0b0a0", // 7: White (steamed milk)
			],
			bright: [
				"#705848", // 8: Bright Black (coffee grounds)
				"#c06050", // 9: Bright Red
				"#90c080", // 10: Bright Green
				"#e0b060", // 11: Bright Yellow
				"#80a0c0", // 12: Bright Blue
				"#b080a0", // 13: Bright Magenta
				"#80b0b0", // 14: Bright Cyan
				"#f0e8e0", // 15: Bright White (milk foam)
			],
		},
	},

	// Synthwave: Cyberpunk aesthetic with softer neons
	synthwave: {
		name: "Synthwave",
		colors: {
			surface0: "#16141e", // Deep purple-black
			surface1: "#201c30", // Dark purple
			surface2: "#2c2842", // Muted purple
			text: "#d8c8e8", // Soft lavender
			textDim: "#9a8ab0", // Muted lavender
			textMuted: "#5a4a70", // Dark lavender
			accent: "#c8508a", // Softened pink
			success: "#50c8a8", // Muted cyan
			warning: "#d8b848", // Softer gold
			error: "#c85858", // Muted coral
			accentForeground: "#f8f0ff",
			warningForeground: "#16141e",
			selectionBackground: "#382e58",
		},
		// Neon-inspired palette
		ansiPalette: {
			standard: [
				"#16141e", // 0: Black (surface0)
				"#c85858", // 1: Red (coral)
				"#50c8a8", // 2: Green (cyan-green)
				"#d8b848", // 3: Yellow (gold)
				"#5878c8", // 4: Blue (electric)
				"#c8508a", // 5: Magenta (pink accent)
				"#50a8c8", // 6: Cyan
				"#9a8ab0", // 7: White (muted lavender)
			],
			bright: [
				"#5a4a70", // 8: Bright Black (dark lavender)
				"#ff7878", // 9: Bright Red (neon coral)
				"#70f0c8", // 10: Bright Green (neon cyan-green)
				"#f8d858", // 11: Bright Yellow (neon gold)
				"#78a8f8", // 12: Bright Blue (neon blue)
				"#f870b0", // 13: Bright Magenta (neon pink)
				"#70d8f8", // 14: Bright Cyan (neon cyan)
				"#d8c8e8", // 15: Bright White (soft lavender)
			],
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

	// Build ANSI palette from terminal colors, falling back to defaults
	const ansiPalette: AnsiPalette = {
		standard: [
			colors.palette[0] ?? DEFAULT_ANSI_PALETTE.standard[0],
			colors.palette[1] ?? DEFAULT_ANSI_PALETTE.standard[1],
			colors.palette[2] ?? DEFAULT_ANSI_PALETTE.standard[2],
			colors.palette[3] ?? DEFAULT_ANSI_PALETTE.standard[3],
			colors.palette[4] ?? DEFAULT_ANSI_PALETTE.standard[4],
			colors.palette[5] ?? DEFAULT_ANSI_PALETTE.standard[5],
			colors.palette[6] ?? DEFAULT_ANSI_PALETTE.standard[6],
			colors.palette[7] ?? DEFAULT_ANSI_PALETTE.standard[7],
		],
		bright: [
			colors.palette[8] ?? DEFAULT_ANSI_PALETTE.bright[0],
			colors.palette[9] ?? DEFAULT_ANSI_PALETTE.bright[1],
			colors.palette[10] ?? DEFAULT_ANSI_PALETTE.bright[2],
			colors.palette[11] ?? DEFAULT_ANSI_PALETTE.bright[3],
			colors.palette[12] ?? DEFAULT_ANSI_PALETTE.bright[4],
			colors.palette[13] ?? DEFAULT_ANSI_PALETTE.bright[5],
			colors.palette[14] ?? DEFAULT_ANSI_PALETTE.bright[6],
			colors.palette[15] ?? DEFAULT_ANSI_PALETTE.bright[7],
		],
	};

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
		ansiPalette,
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
