import { STATUS_ICON_WIDTH } from "../../constants";
import type { ToolState } from "../../types";

// Constants for tab width calculations
export const INDICATOR_WIDTH = 3; // "◀ " or " ▶"
export const TAB_PADDING = 4; // paddingLeft=2 + paddingRight=2
export const TAB_NUMBER_WIDTH = 2; // "N:" prefix for tabs 1-9
export const MAX_TAB_NAME_LENGTH = 15; // Truncate longer names
export const BORDER_WIDTH = 2; // Left and right border

/**
 * Truncate a tab name if it exceeds the maximum length
 */
export function truncateName(
	name: string,
	maxLength: number = MAX_TAB_NAME_LENGTH,
): string {
	if (name.length <= maxLength) {
		return name;
	}
	return `${name.slice(0, maxLength - 1)}…`;
}

/**
 * Calculate the display width of a single tab
 */
export function getTabWidth(
	name: string,
	index: number,
	showTabNumbers: boolean,
): number {
	const truncatedName = truncateName(name);
	const numberWidth = showTabNumbers && index < 9 ? TAB_NUMBER_WIDTH : 0;
	return numberWidth + STATUS_ICON_WIDTH + truncatedName.length + TAB_PADDING;
}

/**
 * Check if all tabs can fit without scrolling
 */
export function canFitAllTabs(
	tools: ToolState[],
	availableWidth: number,
	showTabNumbers: boolean,
): boolean {
	const usableWidth = availableWidth - BORDER_WIDTH;
	let totalWidth = 0;

	for (let i = 0; i < tools.length; i++) {
		const tool = tools[i];
		if (!tool) continue;
		totalWidth += getTabWidth(tool.config.name, i, showTabNumbers);
		if (totalWidth > usableWidth) return false;
	}

	return true;
}

/**
 * Calculate which tabs are visible given the available width and scroll offset
 */
export function calculateVisibleTabs(
	tools: ToolState[],
	availableWidth: number,
	scrollOffset: number,
	needsScrolling: boolean,
	showTabNumbers: boolean,
): {
	visibleIndices: number[];
	lastVisibleIndex: number;
} {
	// Account for indicators - reserve space for both when in scrolling mode
	let usableWidth = availableWidth - BORDER_WIDTH;
	if (needsScrolling) {
		// Always reserve space for both arrows when scrolling is needed
		usableWidth -= INDICATOR_WIDTH * 2;
	}

	const visibleIndices: number[] = [];
	let currentWidth = 0;
	let lastVisibleIndex = scrollOffset;

	for (let i = scrollOffset; i < tools.length; i++) {
		const tool = tools[i] as ToolState | undefined;
		if (!tool) continue;
		const tabWidth = getTabWidth(tool.config.name, i, showTabNumbers);

		if (currentWidth + tabWidth <= usableWidth) {
			visibleIndices.push(i);
			currentWidth += tabWidth;
			lastVisibleIndex = i;
		} else {
			break;
		}
	}

	return { visibleIndices, lastVisibleIndex };
}

/**
 * Calculate the extra padding for each tab to fill available space
 * Aims for equal-width tabs: shorter tabs get more padding to compensate
 * Returns an array of extra padding values (to be split between left and right)
 */
export function calculateTabExtraPadding(
	tools: ToolState[],
	visibleIndices: number[],
	availableWidth: number,
	needsScrolling: boolean,
	showTabNumbers: boolean,
): number[] {
	if (visibleIndices.length === 0) return [];

	// Calculate usable width for tabs - reserve space for both arrows when scrolling
	let usableWidth = availableWidth - BORDER_WIDTH;
	if (needsScrolling) {
		usableWidth -= INDICATOR_WIDTH * 2;
	}

	const tabCount = visibleIndices.length;

	// Get base width for each tab
	const baseWidths = visibleIndices.map((index) => {
		const tool = tools[index];
		return tool ? getTabWidth(tool.config.name, index, showTabNumbers) : 0;
	});

	// Iteratively assign widths to achieve equal-width tabs where possible
	// Tabs that need more than the equal share get their full width
	// Remaining space is redistributed to other tabs
	let remainingWidth = usableWidth;
	let remainingTabs = tabCount;
	const finalWidths = new Array<number>(tabCount).fill(0);
	const assigned = new Array<boolean>(tabCount).fill(false);

	while (remainingTabs > 0) {
		const targetWidth = Math.floor(remainingWidth / remainingTabs);
		let madeProgress = false;

		for (let i = 0; i < tabCount; i++) {
			if (assigned[i]) continue;

			const baseWidth = baseWidths[i] ?? 0;
			if (baseWidth >= targetWidth) {
				// This tab needs its full base width (longer name)
				finalWidths[i] = baseWidth;
				remainingWidth -= baseWidth;
				remainingTabs--;
				assigned[i] = true;
				madeProgress = true;
			}
		}

		if (!madeProgress) {
			// All remaining tabs fit within target width
			// Assign equal widths, distributing remainder
			let remainder = remainingWidth % remainingTabs;
			for (let i = 0; i < tabCount; i++) {
				if (!assigned[i]) {
					finalWidths[i] = targetWidth + (remainder > 0 ? 1 : 0);
					if (remainder > 0) remainder--;
					assigned[i] = true;
				}
			}
			break;
		}
	}

	// Calculate extra padding (final width - base width)
	return finalWidths.map((finalWidth, i) =>
		Math.max(0, finalWidth - (baseWidths[i] ?? 0)),
	);
}

/**
 * Calculate the minimum scrollOffset needed to show a target tab
 * Works backwards from the target, fitting as many tabs as possible
 * Used for scrolling to show a specific tab or calculating max offset for paging
 */
export function calculateMinOffsetForTab(
	tools: ToolState[],
	targetIndex: number,
	availableWidth: number,
	showTabNumbers: boolean,
): number {
	let offset = targetIndex;
	// Reserve space for borders and BOTH indicators (consistent with calculateVisibleTabs)
	let totalWidth = BORDER_WIDTH + INDICATOR_WIDTH * 2;

	for (let i = targetIndex; i >= 0; i--) {
		const tool = tools[i];
		if (!tool) continue;
		const tabWidth = getTabWidth(tool.config.name, i, showTabNumbers);

		if (totalWidth + tabWidth <= availableWidth) {
			totalWidth += tabWidth;
			offset = i;
		} else {
			break;
		}
	}
	return offset;
}
