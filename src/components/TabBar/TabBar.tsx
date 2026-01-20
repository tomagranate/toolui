import { TextAttributes } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import { StatusIcons } from "../../constants";
import type { Theme } from "../../lib/theme";
import type { ToolState } from "../../types";
import {
	calculateMinOffsetForTab,
	calculateTabExtraPadding,
	calculateVisibleTabs,
	canFitAllTabs,
	INDICATOR_WIDTH,
	truncateName,
} from "./tab-utils";

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
	// Navigation is signaled by navigationKey changing
	// biome-ignore lint/correctness/useExhaustiveDependencies: scrollOffset and lastVisibleIndex are read from current render but not in deps - we only trigger on navigation events
	useEffect(() => {
		if (vertical || activeIndex < 0 || activeIndex >= tools.length) {
			return;
		}

		// Check if this is a navigation event (navigationKey changed)
		const isNavigation = navigationKey !== lastNavigationKeyRef.current;
		lastNavigationKeyRef.current = navigationKey;

		// Check if activeIndex actually changed
		const activeIndexChanged = activeIndex !== lastActiveIndexRef.current;
		lastActiveIndexRef.current = activeIndex;

		// Only auto-scroll if navigation triggered this change (not manual scrolling)
		// We check isNavigation OR if we had a pending navigation from a previous render
		const shouldAutoScroll =
			activeIndexChanged && (isNavigation || pendingNavigationRef.current);

		if (isNavigation && !activeIndexChanged) {
			// Navigation key changed but active index hasn't yet - mark as pending
			pendingNavigationRef.current = true;
			return;
		}

		if (!shouldAutoScroll) {
			return;
		}

		// Reset the pending flag
		pendingNavigationRef.current = false;

		// Check if active tab is in the visible range [scrollOffset, lastVisibleIndex]
		const isActiveVisible =
			activeIndex >= scrollOffset && activeIndex <= lastVisibleIndex;

		if (!isActiveVisible) {
			// If active tab is before the visible range, scroll left to show it
			if (activeIndex < scrollOffset) {
				setScrollOffset(activeIndex);
			}
			// If active tab is after the visible range, scroll right
			else {
				const newOffset = calculateMinOffsetForTab(
					tools,
					activeIndex,
					width,
					showTabNumbers,
				);
				setScrollOffset(newOffset);
			}
		}
	}, [activeIndex, navigationKey, tools, vertical, width, showTabNumbers]);

	// Scroll handlers - mark as manual scroll
	// Single step scroll (for wheel)
	const scrollLeftOne = () => {
		pendingNavigationRef.current = false;
		setScrollOffset((prev) => Math.max(0, prev - 1));
	};

	const scrollRightOne = () => {
		pendingNavigationRef.current = false;
		// Calculate max offset that still shows a full page (last tab at rightmost)
		const maxOffset = calculateMinOffsetForTab(
			tools,
			tools.length - 1,
			width,
			showTabNumbers,
		);
		setScrollOffset((prev) => Math.min(maxOffset, prev + 1));
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
		// Calculate max offset that still shows a full page (last tab at rightmost)
		const maxOffset = calculateMinOffsetForTab(
			tools,
			tools.length - 1,
			width,
			showTabNumbers,
		);
		setScrollOffset((prev) => Math.min(maxOffset, prev + pageSize));
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
