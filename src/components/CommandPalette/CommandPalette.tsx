import { TextAttributes } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import type { Theme } from "../../lib/theme";
import { TextInput } from "../TextInput";
import { type Command, commandPalette } from "./command-palette-store";

/** Static keyboard shortcuts for the shortcuts modal */
const KEYBOARD_SHORTCUTS = [
	{ key: "Ctrl+P", description: "Open command palette" },
	{ key: "?", description: "Show keyboard shortcuts" },
	{ key: "j/k", description: "Switch tabs (vertical layout)" },
	{ key: "h/l", description: "Switch tabs (horizontal layout)" },
	{ key: "1-9", description: "Jump to tab by number" },
	{ key: "/", description: "Search logs" },
	{ key: "w", description: "Toggle line wrapping" },
	{ key: "Esc", description: "Cancel/clear" },
	{ key: "q", description: "Quit" },
	{ key: "Ctrl+C", description: "Force quit" },
];

interface CommandPaletteProps {
	theme: Theme;
	isOpen: boolean;
	onClose: () => void;
	/** When true, shows keyboard shortcuts instead of commands */
	showShortcuts?: boolean;
}

export function CommandPalette({
	theme,
	isOpen,
	onClose,
	showShortcuts = false,
}: CommandPaletteProps) {
	const { colors } = theme;
	const { width: terminalWidth, height: terminalHeight } =
		useTerminalDimensions();

	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	// Track commands to trigger re-renders when they change
	const [_commands, setCommands] = useState<Command[]>([]);

	// Calculate modal dimensions
	const modalWidth = Math.min(60, terminalWidth - 4);
	const maxListHeight = Math.min(12, terminalHeight - 8);

	// Subscribe to command changes
	useEffect(() => {
		setCommands(commandPalette.getCommands());
		const unsubscribe = commandPalette.subscribe((newCommands) => {
			setCommands(newCommands);
		});
		return unsubscribe;
	}, []);

	// Reset state when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setQuery("");
			setSelectedIndex(0);
		}
	}, [isOpen]);

	// Filter commands based on query
	const filteredCommands = commandPalette.filterCommands(query);

	// Items to display (commands or shortcuts)
	const displayItems = showShortcuts
		? KEYBOARD_SHORTCUTS.map((s, i) => ({
				id: `shortcut-${i}`,
				label: s.description,
				shortcut: s.key,
			}))
		: filteredCommands;

	// Ensure selected index is within bounds
	useEffect(() => {
		if (selectedIndex >= displayItems.length) {
			setSelectedIndex(Math.max(0, displayItems.length - 1));
		}
	}, [displayItems.length, selectedIndex]);

	const executeSelected = useCallback(() => {
		if (showShortcuts) {
			// Shortcuts mode - just close
			onClose();
			return;
		}

		const selected = filteredCommands[selectedIndex];
		if (selected) {
			onClose();
			// Execute after closing to avoid UI conflicts
			setTimeout(() => {
				commandPalette.execute(selected.id);
			}, 0);
		}
	}, [showShortcuts, filteredCommands, selectedIndex, onClose]);

	// Handle query change
	const handleQueryChange = useCallback((newQuery: string) => {
		setQuery(newQuery);
		setSelectedIndex(0);
	}, []);

	// Handle keyboard input when open
	useKeyboard((key) => {
		if (!isOpen) return;

		if (key.name === "escape") {
			onClose();
			return;
		}

		// Enter key for shortcuts mode (command mode uses TextInput's onSubmit)
		if (key.name === "return" && showShortcuts) {
			executeSelected();
			return;
		}

		if (key.name === "up" || (key.ctrl && key.name === "p")) {
			setSelectedIndex((prev) =>
				prev > 0 ? prev - 1 : displayItems.length - 1,
			);
			return;
		}

		if (key.name === "down" || (key.ctrl && key.name === "n")) {
			setSelectedIndex((prev) =>
				prev < displayItems.length - 1 ? prev + 1 : 0,
			);
			return;
		}

		// TextInput handles text editing in command mode
	});

	if (!isOpen) {
		return null;
	}

	const title = showShortcuts ? "Keyboard Shortcuts" : "Command Palette";

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
				backgroundColor={colors.background}
				border
				borderStyle="rounded"
			>
				{/* Header */}
				<box
					height={1}
					paddingLeft={1}
					paddingRight={1}
					backgroundColor={colors.activeTabBackground}
				>
					<text attributes={TextAttributes.BOLD} fg={colors.activeTabText}>
						{title}
					</text>
				</box>

				{/* Search input (only in command mode) */}
				{!showShortcuts && (
					<box height={1} paddingLeft={1} paddingRight={1}>
						<TextInput
							value={query}
							onValueChange={handleQueryChange}
							onEmpty={onClose}
							onSubmit={executeSelected}
							focused={isOpen && !showShortcuts}
							theme={theme}
							prefix="> "
						/>
					</box>
				)}

				{/* Command/shortcut list */}
				<scrollbox
					height={Math.min(displayItems.length, maxListHeight)}
					backgroundColor={colors.background}
				>
					{displayItems.length === 0 ? (
						<box paddingLeft={1} paddingRight={1}>
							<text fg={colors.lineNumberText}>No matching commands</text>
						</box>
					) : (
						displayItems.map((item, index) => {
							const isSelected = index === selectedIndex;
							return (
								<box
									key={item.id}
									height={1}
									paddingLeft={1}
									paddingRight={1}
									backgroundColor={
										isSelected
											? colors.selectedLineBackground
											: colors.background
									}
								>
									<text fg={isSelected ? colors.text : colors.inactiveTabText}>
										{item.label}
										{item.shortcut && (
											<span fg={colors.lineNumberText}> ({item.shortcut})</span>
										)}
									</text>
								</box>
							);
						})
					)}
				</scrollbox>

				{/* Footer hint */}
				<box
					height={1}
					paddingLeft={1}
					paddingRight={1}
					backgroundColor={colors.background}
				>
					<text fg={colors.lineNumberText}>
						{showShortcuts
							? "Esc: close"
							: "↑↓: navigate | Enter: select | Esc: close"}
					</text>
				</box>
			</box>
		</box>
	);
}
