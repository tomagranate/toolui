import { TextAttributes } from "@opentui/core";
import { useEffect, useRef, useState } from "react";
import type { ToolState } from "../types";
import type { Theme } from "../utils/themes";

interface TabBarProps {
	tools: ToolState[];
	activeIndex: number;
	onSelect: (index: number) => void;
	vertical?: boolean;
	theme: Theme;
}

export function TabBar({
	tools,
	activeIndex,
	onSelect,
	vertical = false,
	theme,
}: TabBarProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const containerRef = useRef<unknown>(null);
	const tabRefs = useRef<unknown[]>([]);
	const { colors } = theme;

	// Auto-scroll to active tab when it changes (horizontal only)
	useEffect(() => {
		if (vertical || activeIndex < 0 || activeIndex >= tools.length) {
			return;
		}

		// Use setTimeout with a small delay to ensure layout has completed
		// Terminal UIs might need a bit more time to complete layout
		const timeoutId = setTimeout(() => {
			// Try multiple approaches to scroll the active tab into view
			const container = containerRef.current;
			const activeTab = tabRefs.current[activeIndex];

			if (!container || !activeTab) {
				return;
			}

			// Try to access scroll properties through various possible APIs
			// OpenTUI might expose these differently than DOM
			const containerEl = container as Record<string, unknown>;
			const tabEl = activeTab as Record<string, unknown>;

			// Get tab position and dimensions
			const tabOffsetLeft = (tabEl.offsetLeft as number) ?? 0;
			const tabWidth = (tabEl.offsetWidth as number) ?? 0;
			const clientWidth = (containerEl.clientWidth as number) ?? 100;

			// Method 1: Try DOM-like scrollLeft property (read-only check first)
			// Only proceed if scrollLeft exists and is a number property
			if (
				"scrollLeft" in containerEl &&
				typeof containerEl.scrollLeft === "number"
			) {
				try {
					const currentScrollLeft = containerEl.scrollLeft as number;
					const tabRight = tabOffsetLeft + tabWidth;
					const viewportRight = currentScrollLeft + clientWidth;

					// Only scroll if tab is outside viewport
					if (tabOffsetLeft < currentScrollLeft) {
						// Tab is to the left, scroll to show it at the start
						(containerEl as { scrollLeft: number }).scrollLeft = tabOffsetLeft;
						// Verify the value was actually set (not a read-only property)
						if ((containerEl.scrollLeft as number) === tabOffsetLeft) {
							return;
						}
					} else if (tabRight > viewportRight) {
						// Tab is to the right, scroll to show it
						const newScrollLeft = tabRight - clientWidth;
						(containerEl as { scrollLeft: number }).scrollLeft = newScrollLeft;
						// Verify the value was actually set
						if ((containerEl.scrollLeft as number) === newScrollLeft) {
							return;
						}
					} else {
						// Tab is already in view, no need to scroll
						return;
					}
				} catch {
					// Property might be read-only or not writable, skip this method
				}
			}

			// Method 2: Try scrollTo method
			if (typeof containerEl.scrollTo === "function") {
				const scrollTo = containerEl.scrollTo as (options: {
					left?: number;
					behavior?: string;
				}) => void;
				scrollTo({ left: tabOffsetLeft, behavior: "auto" });
				return;
			}

			// Method 3: Try accessing internal OpenTUI scroll state
			// Only try scroll-related properties, NOT position properties like 'x', 'left', 'top'
			// Avoid properties that might control container position rather than scroll
			const possibleScrollProps = ["_scrollLeft", "scrollX", "scrollOffset"];
			const positionProps = new Set([
				"x",
				"y",
				"left",
				"top",
				"right",
				"bottom",
			]);

			for (const prop of possibleScrollProps) {
				// Skip if this looks like a position property
				if (positionProps.has(prop)) {
					continue;
				}

				// Check if property exists and is a number (readable)
				if (
					prop in containerEl &&
					typeof containerEl[prop] === "number" &&
					// Make sure it's not a getter-only property by checking if we can read it
					!Number.isNaN(containerEl[prop] as number)
				) {
					// Try to read current value to verify it's a scroll property
					// If reading it changes or if it's clearly a position, skip it
					const currentScroll = containerEl[prop] as number;

					// Only proceed if the value seems reasonable for scroll (non-negative, typically)
					// Position properties might be negative or very large
					if (currentScroll < 0 || currentScroll > 100000) {
						continue;
					}

					const tabRight = tabOffsetLeft + tabWidth;
					const viewportRight = currentScroll + clientWidth;

					// Only scroll if tab is outside viewport
					if (tabOffsetLeft < currentScroll) {
						(containerEl[prop] as number) = tabOffsetLeft;
					} else if (tabRight > viewportRight) {
						(containerEl[prop] as number) = tabRight - clientWidth;
					}
					return;
				}
			}

			// If we reach here, OpenTUI doesn't support programmatic scrolling
			// This is fine - the user can manually scroll if needed
		}, 10); // Small delay to ensure layout is complete

		return () => {
			clearTimeout(timeoutId);
		};
	}, [activeIndex, tools.length, vertical]);

	// Initialize tab refs array
	useEffect(() => {
		tabRefs.current = new Array(tools.length);
	}, [tools.length]);

	const getTabBackgroundColor = (index: number) => {
		if (index === activeIndex) {
			return colors.activeTabBackground;
		}
		if (index === hoveredIndex) {
			return colors.activeTabBackground; // Use same as active for hover
		}
		return colors.background;
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
							fg={
								index === activeIndex
									? colors.activeTabText
									: tool.status === "error"
										? colors.statusError
										: tool.status === "shuttingDown"
											? colors.statusShuttingDown
											: tool.status === "running"
												? colors.statusRunning
												: colors.inactiveTabText
							}
						>
							{tool.status === "running"
								? "● "
								: tool.status === "shuttingDown"
									? "⚠ "
									: tool.status === "error"
										? "✗ "
										: "○ "}
							{tool.config.name}
						</text>
					</box>
				))}
			</scrollbox>
		);
	}

	// Horizontal tab bar
	return (
		<scrollbox
			ref={(el) => {
				containerRef.current = el as unknown;
			}}
			height={3}
			width="100%"
			flexDirection="row"
			border
			borderStyle="single"
			padding={0}
			backgroundColor={colors.background}
			focused
		>
			{tools.map((tool, index) => (
				<box
					ref={(el) => {
						tabRefs.current[index] = el as unknown;
					}}
					key={`${tool.config.name}-${index}`}
					paddingLeft={2}
					paddingRight={2}
					paddingTop={0}
					paddingBottom={0}
					minWidth={15}
					backgroundColor={getTabBackgroundColor(index)}
					{...({
						onMouseDown: () => onSelect(index),
						onMouseEnter: () => setHoveredIndex(index),
						onMouseLeave: () => setHoveredIndex(null),
					} as Record<string, unknown>)}
				>
					<text
						attributes={index === activeIndex ? TextAttributes.BOLD : 0}
						fg={
							index === activeIndex
								? colors.activeTabText
								: tool.status === "error"
									? colors.statusError
									: tool.status === "shuttingDown"
										? colors.statusShuttingDown
										: tool.status === "running"
											? colors.statusRunning
											: colors.inactiveTabText
						}
					>
						{tool.status === "running"
							? "● "
							: tool.status === "shuttingDown"
								? "⚠ "
								: tool.status === "error"
									? "✗ "
									: "○ "}
						{tool.config.name}
					</text>
				</box>
			))}
		</scrollbox>
	);
}
