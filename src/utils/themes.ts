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
