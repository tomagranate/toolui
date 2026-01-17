import { TextAttributes } from "@opentui/core";
import { useEffect, useState } from "react";
import type { ToolState } from "../types";
import type { Theme } from "../utils/themes";

interface TabBarProps {
	tools: ToolState[];
	activeIndex: number;
	onSelect: (index: number) => void;
	vertical?: boolean;
	theme: Theme;
	width?: number; // Terminal width for horizontal tab calculations
}

// Constants for tab width calculations
const INDICATOR_WIDTH = 3; // "◀ " or " ▶"
const TAB_PADDING = 4; // paddingLeft=2 + paddingRight=2
const STATUS_ICON_WIDTH = 2; // "● " or "○ "
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
function getTabWidth(name: string): number {
	const truncatedName = truncateName(name);
	return STATUS_ICON_WIDTH + truncatedName.length + TAB_PADDING;
}

/**
 * Calculate which tabs are visible given the available width and scroll offset
 */
function calculateVisibleTabs(
	tools: ToolState[],
	availableWidth: number,
	scrollOffset: number,
	hasMoreLeft: boolean,
): { visibleIndices: number[]; lastVisibleIndex: number } {
	// Account for indicators if they will be shown
	let usableWidth = availableWidth - BORDER_WIDTH;
	if (hasMoreLeft) {
		usableWidth -= INDICATOR_WIDTH;
	}
	// Reserve space for right indicator (we'll check if needed)
	const reservedForRight = INDICATOR_WIDTH;

	const visibleIndices: number[] = [];
	let currentWidth = 0;
	let lastVisibleIndex = scrollOffset;

	for (let i = scrollOffset; i < tools.length; i++) {
		const tool = tools[i] as ToolState | undefined;
		if (!tool) continue;
		const tabWidth = getTabWidth(tool.config.name);
		const hasMoreAfterThis = i < tools.length - 1;

		// Check if this tab fits (considering right indicator if there are more tabs)
		const widthNeeded = hasMoreAfterThis
			? currentWidth + tabWidth + reservedForRight
			: currentWidth + tabWidth;

		if (widthNeeded <= usableWidth) {
			visibleIndices.push(i);
			currentWidth += tabWidth;
			lastVisibleIndex = i;
		} else {
			break;
		}
	}

	return { visibleIndices, lastVisibleIndex };
}

export function TabBar({
	tools,
	activeIndex,
	onSelect,
	vertical = false,
	theme,
	width = 80,
}: TabBarProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [scrollOffset, setScrollOffset] = useState(0); // First visible tab index
	const { colors } = theme;

	// Calculate if we have tabs before the visible range
	const hasMoreLeft = scrollOffset > 0;

	// Calculate visible tabs
	const { visibleIndices, lastVisibleIndex } = calculateVisibleTabs(
		tools,
		width,
		scrollOffset,
		hasMoreLeft,
	);

	const hasMoreRight = lastVisibleIndex < tools.length - 1;

	// Auto-scroll to keep active tab visible
	useEffect(() => {
		if (vertical || activeIndex < 0 || activeIndex >= tools.length) {
			return;
		}

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
				const tabWidth = getTabWidth(tool.config.name);
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
	}, [activeIndex, scrollOffset, lastVisibleIndex, tools, vertical, width]);

	// Scroll handlers
	const scrollLeft = () => {
		setScrollOffset((prev) => Math.max(0, prev - 1));
	};

	const scrollRight = () => {
		setScrollOffset((prev) => Math.min(tools.length - 1, prev + 1));
	};

	// Handle wheel events for scrolling
	const handleWheel = (deltaX: number, deltaY: number) => {
		// Use horizontal scroll, or vertical scroll if no horizontal
		const delta = deltaX !== 0 ? deltaX : deltaY;
		if (delta > 0) {
			scrollRight();
		} else if (delta < 0) {
			scrollLeft();
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
				return "● ";
			case "shuttingDown":
				return "⚠ ";
			case "error":
				return "✗ ";
			default:
				return "○ ";
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
				borderStyle="single"
				padding={1}
				backgroundColor={colors.background}
				focused
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
			borderStyle="single"
			padding={0}
			backgroundColor={colors.background}
			{...({
				onWheel: (event: { deltaX: number; deltaY: number }) => {
					handleWheel(event.deltaX, event.deltaY);
				},
			} as Record<string, unknown>)}
		>
			{/* Left scroll indicator */}
			{hasMoreLeft && (
				<box
					width={INDICATOR_WIDTH}
					height={1}
					paddingLeft={0}
					paddingRight={1}
					backgroundColor={colors.background}
					{...({
						onMouseDown: scrollLeft,
						onMouseEnter: () => setHoveredIndex(-1),
						onMouseLeave: () => setHoveredIndex(null),
					} as Record<string, unknown>)}
				>
					<text
						fg={
							hoveredIndex === -1
								? colors.activeTabText
								: colors.inactiveTabText
						}
					>
						◀
					</text>
				</box>
			)}

			{/* Visible tabs */}
			{visibleIndices.map((index) => {
				const tool = tools[index];
				if (!tool) return null;
				return (
					<box
						key={`${tool.config.name}-${index}`}
						paddingLeft={2}
						paddingRight={2}
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
							{truncateName(tool.config.name)}
						</text>
					</box>
				);
			})}

			{/* Right scroll indicator */}
			{hasMoreRight && (
				<box
					width={INDICATOR_WIDTH}
					height={1}
					paddingLeft={1}
					paddingRight={0}
					backgroundColor={colors.background}
					{...({
						onMouseDown: scrollRight,
						onMouseEnter: () => setHoveredIndex(-2),
						onMouseLeave: () => setHoveredIndex(null),
					} as Record<string, unknown>)}
				>
					<text
						fg={
							hoveredIndex === -2
								? colors.activeTabText
								: colors.inactiveTabText
						}
					>
						▶
					</text>
				</box>
			)}
		</box>
	);
}
