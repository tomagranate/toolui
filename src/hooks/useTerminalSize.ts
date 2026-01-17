import type { CliRenderer } from "@opentui/core";
import { useOnResize } from "@opentui/react";
import { useState } from "react";

/**
 * Hook to track terminal size (width and height).
 * Automatically updates when the terminal is resized.
 *
 * @param renderer - The CLI renderer instance to get initial dimensions from
 * @returns An object with `width` and `height` properties
 */
export function useTerminalSize(renderer: CliRenderer) {
	const [width, setWidth] = useState(renderer.terminalWidth);
	const [height, setHeight] = useState(renderer.terminalHeight);

	useOnResize((newWidth, newHeight) => {
		setWidth(newWidth);
		setHeight(newHeight);
	});

	return { width, height };
}
