/**
 * Status indicator icons for terminal UI.
 * Using characters from the Geometric Shapes Unicode block for consistent
 * terminal width rendering. Avoid characters like ⚠ (U+26A0) which have
 * ambiguous width and cause rendering artifacts.
 */
export const StatusIcons = {
	/** Running process indicator */
	RUNNING: "●",
	/** Stopped process indicator */
	STOPPED: "○",
	/** Error indicator */
	ERROR: "✗",
	/** Warning/shutting down indicator (U+25B3 WHITE UP-POINTING TRIANGLE) */
	WARNING: "△",
} as const;

/**
 * Icon width in terminal cells (icon + trailing space)
 */
export const STATUS_ICON_WIDTH = 2;
