import { TextAttributes } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import { STATUS_ICON_WIDTH, StatusIcons } from "../constants";
import type { ToolState } from "../types";
import type { Theme } from "../utils/themes";

interface TabBarProps {
	tools: ToolState[];
	activeIndex: number;
	onSelect: (index: number) => void;
	vertical?: boolean;
	theme: Theme;
	width?: number; // Terminal width for horizontal tab calculations
	showTabNumbers?: boolean; // Show 1-9 shortcuts on first 9 tabs
	navigationKey?: number; // Increment this when keyboard/shortcut navigation happens to trigger auto-scroll
}

// Constants for tab width calculations
const INDICATOR_WIDTH = 3; // "◀ " or " ▶"
const TAB_PADDING = 4; // paddingLeft=2 + paddingRight=2
const TAB_NUMBER_WIDTH = 2; // "N:" prefix for tabs 1-9
const MAX_TAB_NAME_LENGTH = 15; // Truncate longer names
const BORDER_WIDTH = 2; // Left and right border

/**
 * Truncate a tab name if it exceeds the maximum length
 */
function truncateName(
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
function getTabWidth(
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
function canFitAllTabs(
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
function calculateVisibleTabs(
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
function calculateTabExtraPadding(
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

export function TabBar({
	tools,
	activeIndex,
	onSelect,
	vertical = false,
	theme,
	width = 80,
	showTabNumbers = false,
	navigationKey = 0,
}: TabBarProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [scrollOffset, setScrollOffset] = useState(0); // First visible tab index
	const { colors } = theme;

	// Track whether the next activeIndex change should trigger auto-scroll
	// Set to true when navigation happens (keyboard or click), false after manual scroll
	const pendingNavigationRef = useRef(true);
	const lastActiveIndexRef = useRef(activeIndex);
	const lastNavigationKeyRef = useRef(navigationKey);

	// When navigationKey changes, it signals that keyboard/shortcut navigation happened
	// This should trigger auto-scroll for the next activeIndex change
	useEffect(() => {
		if (navigationKey !== lastNavigationKeyRef.current) {
			pendingNavigationRef.current = true;
			lastNavigationKeyRef.current = navigationKey;
		}
	}, [navigationKey]);

	// Check if we need scrolling (not all tabs fit)
	const needsScrolling = !canFitAllTabs(tools, width, showTabNumbers);

	// Calculate if we have tabs before/after the visible range
	const hasMoreLeft = scrollOffset > 0;

	// Calculate visible tabs
	const { visibleIndices, lastVisibleIndex } = calculateVisibleTabs(
		tools,
		width,
		scrollOffset,
		needsScrolling,
		showTabNumbers,
	);

	const hasMoreRight = lastVisibleIndex < tools.length - 1;

	// Calculate extra padding to distribute among tabs to fill available space
	// Aims for equal-width tabs: shorter tabs get more padding
	const tabExtraPadding = calculateTabExtraPadding(
		tools,
		visibleIndices,
		width,
		needsScrolling,
		showTabNumbers,
	);

	// Auto-scroll to keep active tab visible (only when navigation triggered it)
	useEffect(() => {
		if (vertical || activeIndex < 0 || activeIndex >= tools.length) {
			return;
		}

		// Check if activeIndex actually changed
		const activeIndexChanged = activeIndex !== lastActiveIndexRef.current;
		lastActiveIndexRef.current = activeIndex;

		// Only auto-scroll if navigation triggered this change (not manual scrolling)
		if (!activeIndexChanged || !pendingNavigationRef.current) {
			return;
		}

		// Reset the flag after processing
		pendingNavigationRef.current = false;

		// If active tab is before the visible range, scroll left
		if (activeIndex < scrollOffset) {
			setScrollOffset(activeIndex);
		}
		// If active tab is after the visible range, scroll right
		else if (activeIndex > lastVisibleIndex) {
			// Find the minimum scroll offset that makes activeIndex visible
			// Start from activeIndex and work backwards to find how many tabs fit
			let newOffset = activeIndex;
			let totalWidth = BORDER_WIDTH;
			if (newOffset > 0) {
				totalWidth += INDICATOR_WIDTH; // Left indicator will be shown
			}

			for (let i = activeIndex; i >= 0; i--) {
				const tool = tools[i];
				if (!tool) continue;
				const tabWidth = getTabWidth(tool.config.name, i, showTabNumbers);
				const hasMoreAfter = activeIndex < tools.length - 1;
				const neededWidth = hasMoreAfter
					? totalWidth + tabWidth + INDICATOR_WIDTH
					: totalWidth + tabWidth;

				if (neededWidth <= width) {
					totalWidth += tabWidth;
					newOffset = i;
				} else {
					break;
				}
			}

			setScrollOffset(newOffset);
		}
	}, [
		activeIndex,
		scrollOffset,
		lastVisibleIndex,
		tools,
		vertical,
		width,
		showTabNumbers,
	]);

	// Scroll handlers - mark as manual scroll
	// Single step scroll (for wheel)
	const scrollLeftOne = () => {
		pendingNavigationRef.current = false;
		setScrollOffset((prev) => Math.max(0, prev - 1));
	};

	const scrollRightOne = () => {
		pendingNavigationRef.current = false;
		setScrollOffset((prev) => Math.min(tools.length - 1, prev + 1));
	};

	// Page scroll (for arrow buttons) - scroll by the number of visible tabs
	const pageLeft = () => {
		pendingNavigationRef.current = false;
		const pageSize = Math.max(1, visibleIndices.length);
		setScrollOffset((prev) => Math.max(0, prev - pageSize));
	};

	const pageRight = () => {
		pendingNavigationRef.current = false;
		const pageSize = Math.max(1, visibleIndices.length);
		setScrollOffset((prev) => Math.min(tools.length - 1, prev + pageSize));
	};

	// Handle scroll events for scrolling (manual scroll) - single step
	const handleScroll = (direction: "up" | "down" | "left" | "right") => {
		pendingNavigationRef.current = false;
		// Treat down/right as scroll right, up/left as scroll left
		if (direction === "down" || direction === "right") {
			scrollRightOne();
		} else {
			scrollLeftOne();
		}
	};

	const getTabBackgroundColor = (index: number) => {
		if (index === activeIndex) {
			return colors.activeTabBackground;
		}
		if (index === hoveredIndex) {
			return colors.activeTabBackground; // Use same as active for hover
		}
		return colors.background;
	};

	const getStatusIcon = (status: ToolState["status"]) => {
		switch (status) {
			case "running":
				return `${StatusIcons.RUNNING} `;
			case "shuttingDown":
				return `${StatusIcons.WARNING} `;
			case "error":
				return `${StatusIcons.ERROR} `;
			default:
				return `${StatusIcons.STOPPED} `;
		}
	};

	const getTabTextColor = (tool: ToolState, index: number) => {
		if (index === activeIndex) {
			return colors.activeTabText;
		}
		switch (tool.status) {
			case "error":
				return colors.statusError;
			case "shuttingDown":
				return colors.statusShuttingDown;
			case "running":
				return colors.statusRunning;
			default:
				return colors.inactiveTabText;
		}
	};

	if (vertical) {
		return (
			<scrollbox
				width={20}
				height="100%"
				flexDirection="column"
				border
				borderStyle="rounded"
				padding={1}
				backgroundColor={colors.background}
			>
				{tools.map((tool, index) => (
					<box
						key={`${tool.config.name}-${index}`}
						paddingLeft={1}
						paddingRight={1}
						paddingTop={0}
						paddingBottom={0}
						backgroundColor={getTabBackgroundColor(index)}
						{...({
							onMouseDown: () => onSelect(index),
							onMouseEnter: () => setHoveredIndex(index),
							onMouseLeave: () => setHoveredIndex(null),
						} as Record<string, unknown>)}
					>
						<text
							attributes={index === activeIndex ? TextAttributes.BOLD : 0}
							fg={getTabTextColor(tool, index)}
						>
							{getStatusIcon(tool.status)}
							{tool.config.name}
						</text>
					</box>
				))}
			</scrollbox>
		);
	}

	// Horizontal tab bar with custom scrolling
	return (
		<box
			height={3}
			width="100%"
			flexDirection="row"
			border
			borderStyle="rounded"
			padding={0}
			backgroundColor={colors.background}
			onMouseScroll={(event) => {
				if (event.scroll) {
					handleScroll(event.scroll.direction);
				}
			}}
		>
			{/* Left scroll indicator (or placeholder when at start but scrolling is needed) */}
			{needsScrolling && (
				<box
					width={INDICATOR_WIDTH}
					height={1}
					paddingLeft={1}
					paddingRight={1}
					backgroundColor={colors.background}
					{...({
						onMouseDown: hasMoreLeft ? pageLeft : undefined,
						onMouseEnter: hasMoreLeft ? () => setHoveredIndex(-1) : undefined,
						onMouseLeave: hasMoreLeft ? () => setHoveredIndex(null) : undefined,
					} as Record<string, unknown>)}
				>
					<text
						fg={
							hasMoreLeft
								? hoveredIndex === -1
									? colors.activeTabText
									: colors.inactiveTabText
								: colors.background
						}
					>
						{hasMoreLeft ? "◀" : " "}
					</text>
				</box>
			)}

			{/* Visible tabs */}
			{visibleIndices.map((index, i) => {
				const tool = tools[index];
				if (!tool) return null;
				const extraPadding = tabExtraPadding[i] ?? 0;
				// Split extra padding for center alignment
				const extraLeft = Math.floor(extraPadding / 2);
				const extraRight = extraPadding - extraLeft;
				return (
					<box
						key={`${tool.config.name}-${index}`}
						paddingLeft={2 + extraLeft}
						paddingRight={2 + extraRight}
						paddingTop={0}
						paddingBottom={0}
						backgroundColor={getTabBackgroundColor(index)}
						{...({
							onMouseDown: () => {
								pendingNavigationRef.current = true;
								onSelect(index);
							},
							onMouseEnter: () => setHoveredIndex(index),
							onMouseLeave: () => setHoveredIndex(null),
						} as Record<string, unknown>)}
					>
						<text
							attributes={index === activeIndex ? TextAttributes.BOLD : 0}
							fg={getTabTextColor(tool, index)}
						>
							{showTabNumbers && index < 9 ? `${index + 1}:` : ""}
							{getStatusIcon(tool.status)}
							{truncateName(tool.config.name)}
						</text>
					</box>
				);
			})}

			{/* Right scroll indicator (or placeholder when at end but scrolling is needed) */}
			{needsScrolling && (
				<box
					width={INDICATOR_WIDTH}
					height={1}
					paddingLeft={1}
					paddingRight={1}
					backgroundColor={colors.background}
					{...({
						onMouseDown: hasMoreRight ? pageRight : undefined,
						onMouseEnter: hasMoreRight ? () => setHoveredIndex(-2) : undefined,
						onMouseLeave: hasMoreRight
							? () => setHoveredIndex(null)
							: undefined,
					} as Record<string, unknown>)}
				>
					<text
						fg={
							hasMoreRight
								? hoveredIndex === -2
									? colors.activeTabText
									: colors.inactiveTabText
								: colors.background
						}
					>
						{hasMoreRight ? "▶" : " "}
					</text>
				</box>
			)}
		</box>
	);
}
