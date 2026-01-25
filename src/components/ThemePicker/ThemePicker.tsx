import { type ScrollBoxRenderable, TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { themes, useTheme } from "../../lib/theme";
import { toast } from "../Toast";

interface ThemePickerProps {
	/** Whether the picker is open */
	isOpen: boolean;
	/** Called when picker should close */
	onClose: () => void;
}

export function ThemePicker({ isOpen, onClose }: ThemePickerProps) {
	const {
		theme,
		themeKey,
		previewTheme,
		saveTheme,
		cancelPreview,
		configLockedTheme,
	} = useTheme();
	const { colors } = theme;
	const { width: terminalWidth, height: terminalHeight } =
		useTerminalDimensions();

	const [selectedIndex, setSelectedIndex] = useState(0);
	// Track previous isOpen to detect open transitions
	const wasOpenRef = useRef(false);
	const scrollboxRef = useRef<ScrollBoxRenderable>(null);

	// Get list of theme entries
	const themeEntries = Object.entries(themes);

	// Calculate modal dimensions
	const modalWidth = Math.min(40, terminalWidth - 4);
	const maxListHeight = Math.min(themeEntries.length + 1, terminalHeight - 6);

	// Scroll to keep selected item visible
	const scrollToSelected = useCallback((index: number) => {
		const scrollbox = scrollboxRef.current;
		if (!scrollbox) return;

		const viewportHeight = scrollbox.viewport.height;
		const scrollTop = scrollbox.scrollTop;

		if (index < scrollTop) {
			scrollbox.scrollTo(index);
		} else if (index >= scrollTop + viewportHeight) {
			scrollbox.scrollTo(index - viewportHeight + 1);
		}
	}, []);

	// Set selected index to current theme when picker opens and scroll to it
	useEffect(() => {
		if (isOpen && !wasOpenRef.current) {
			// Just opened - set selected index to current theme
			const currentIndex = themeEntries.findIndex(([key]) => key === themeKey);
			const newIndex = currentIndex >= 0 ? currentIndex : 0;
			setSelectedIndex(newIndex);
			// Scroll to make current theme visible (use setTimeout to let render complete)
			setTimeout(() => scrollToSelected(newIndex), 0);
		}
		wasOpenRef.current = isOpen;
	}, [isOpen, themeKey, themeEntries, scrollToSelected]);

	// Handle theme selection (preview on navigate, save on Enter)
	const handleNavigate = useCallback(
		(newIndex: number) => {
			const wrappedIndex =
				newIndex < 0
					? themeEntries.length - 1
					: newIndex >= themeEntries.length
						? 0
						: newIndex;

			setSelectedIndex(wrappedIndex);
			scrollToSelected(wrappedIndex);

			// Preview the theme immediately
			const [key] = themeEntries[wrappedIndex] ?? [];
			if (key) {
				previewTheme(key);
			}
		},
		[themeEntries, scrollToSelected, previewTheme],
	);

	const handleConfirm = useCallback(() => {
		const [key, themeValue] = themeEntries[selectedIndex] ?? [];
		if (key) {
			saveTheme(key);
			toast.info(`Switched to ${themeValue?.name ?? key} theme`);
		}
		onClose();
	}, [themeEntries, selectedIndex, saveTheme, onClose]);

	const handleCancel = useCallback(() => {
		cancelPreview();
		onClose();
	}, [cancelPreview, onClose]);

	// Handle keyboard input
	useKeyboard((key) => {
		if (!isOpen) return;

		if (key.name === "escape" || (key.ctrl && key.name === "c")) {
			key.preventDefault?.();
			key.stopPropagation?.();
			handleCancel();
			return;
		}

		if (key.name === "return") {
			handleConfirm();
			return;
		}

		if (key.name === "up" || key.name === "k") {
			handleNavigate(selectedIndex - 1);
			return;
		}

		if (key.name === "down" || key.name === "j") {
			handleNavigate(selectedIndex + 1);
			return;
		}
	});

	if (!isOpen) {
		return null;
	}

	return (
		<box
			position="absolute"
			top={0}
			left={0}
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="center"
			zIndex={2000}
		>
			{/* Modal container */}
			<box
				width={modalWidth}
				flexDirection="column"
				backgroundColor={colors.surface2}
			>
				{/* Header */}
				<box
					paddingLeft={1}
					paddingRight={1}
					backgroundColor={colors.accent}
					flexDirection="row"
					justifyContent="space-between"
				>
					<text attributes={TextAttributes.BOLD} fg={colors.accentForeground}>
						Switch Theme
					</text>
					<text
						fg={colors.accentForeground}
						attributes={TextAttributes.BOLD}
						{...({
							onMouseDown: handleCancel,
						} as Record<string, unknown>)}
					>
						x
					</text>
				</box>

				{/* Theme list */}
				<scrollbox
					ref={scrollboxRef}
					height={maxListHeight}
					backgroundColor={colors.surface2}
				>
					{themeEntries.map(([key, themeValue], index) => {
						const isSelected = index === selectedIndex;
						const isCurrentTheme = key === themeKey;
						const isConfigLocked = key === configLockedTheme;

						return (
							<box
								key={key}
								height={1}
								paddingLeft={1}
								paddingRight={1}
								backgroundColor={isSelected ? colors.surface1 : colors.surface2}
								{...({
									onMouseDown: () => {
										setSelectedIndex(index);
										previewTheme(key);
									},
									onMouseUp: () => {
										if (index === selectedIndex) {
											handleConfirm();
										}
									},
								} as Record<string, unknown>)}
							>
								<text fg={colors.text}>
									{isCurrentTheme ? "● " : "  "}
									{themeValue.name}
									{isConfigLocked && <span fg={colors.textDim}> (config)</span>}
								</text>
							</box>
						);
					})}
				</scrollbox>

				{/* Footer hint */}
				<box paddingLeft={1} paddingRight={1} backgroundColor={colors.surface1}>
					<text fg={colors.textDim}>Enter: save | Esc: cancel</text>
				</box>
			</box>
		</box>
	);
}
