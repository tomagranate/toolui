import { useKeyboard } from "@opentui/react";
import type { Theme } from "../../lib/theme";

interface TextInputProps {
	/** Current input value */
	value: string;
	/** Called when value changes */
	onValueChange: (value: string) => void;
	/** Called when backspace is pressed on empty input */
	onEmpty?: () => void;
	/** Called when Enter is pressed */
	onSubmit?: () => void;
	/** Whether the input is focused and receiving keyboard events */
	focused: boolean;
	/** Theme for styling */
	theme: Theme;
	/** Prefix text shown before input (e.g., "/" or ">") */
	prefix?: string;
	/** Whether to make prefix bold */
	prefixBold?: boolean;
	/** Custom prefix color (defaults to theme.colors.text) */
	prefixColor?: string;
	/** Flex grow for layout */
	flexGrow?: number;
}

/**
 * Reusable text input component with common keyboard extensions:
 * - Ctrl+Backspace: Clear entire input
 * - Backspace on empty: Calls onEmpty callback
 * - Enter: Calls onSubmit callback
 * - Escape handling should be done by parent component
 */
export function TextInput({
	value,
	onValueChange,
	onEmpty,
	onSubmit,
	focused,
	theme,
	prefix,
	prefixBold = false,
	prefixColor,
	flexGrow = 1,
}: TextInputProps) {
	const { colors } = theme;

	// Handle keyboard extensions
	useKeyboard((key) => {
		if (!focused) return;

		// Ctrl+Backspace: clear entire input
		if (key.ctrl && key.name === "backspace") {
			key.preventDefault();
			key.stopPropagation();
			onValueChange("");
			return;
		}

		// Backspace on empty: call onEmpty
		if (key.name === "backspace" && value.length === 0 && onEmpty) {
			key.preventDefault();
			key.stopPropagation();
			onEmpty();
			return;
		}
	});

	return (
		<box flexDirection="row" flexGrow={flexGrow}>
			{prefix && (
				<text
					fg={prefixColor ?? colors.text}
					attributes={prefixBold ? 1 : 0} // TextAttributes.BOLD = 1
				>
					{prefix}
				</text>
			)}
			<input
				value={value}
				onInput={onValueChange}
				onSubmit={onSubmit}
				focused={focused}
				textColor={colors.text}
				backgroundColor={colors.background}
				focusedTextColor={colors.text}
				focusedBackgroundColor={colors.background}
				cursorColor={colors.text}
				flexGrow={1}
			/>
		</box>
	);
}
