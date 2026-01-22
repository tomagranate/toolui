import { useCallback, useEffect, useState } from "react";
import type { Theme } from "../../lib/theme";
import { type ToastMessage, toast } from "./toast-store";

/** Default toast duration in milliseconds */
const DEFAULT_TOAST_DURATION = 2000;

interface ToastContainerProps {
	theme: Theme;
	/** Top offset for positioning (accounts for tab bar, etc.) */
	topOffset?: number;
}

interface ToastItemProps {
	toast: ToastMessage;
	theme: Theme;
	onDismiss: (id: string) => void;
}

function ToastItem({ toast: t, theme, onDismiss }: ToastItemProps) {
	const { colors } = theme;

	// Auto-dismiss after duration
	useEffect(() => {
		const timeout = setTimeout(() => {
			onDismiss(t.id);
		}, t.duration ?? DEFAULT_TOAST_DURATION);

		return () => clearTimeout(timeout);
	}, [t.id, t.duration, onDismiss]);

	// Get border color based on toast type
	const getBorderColor = () => {
		switch (t.type) {
			case "success":
				return colors.success;
			case "error":
				return colors.error;
			default:
				return colors.accent;
		}
	};

	const borderColor = getBorderColor();

	const handleClick = useCallback(() => {
		onDismiss(t.id);
	}, [onDismiss, t.id]);

	return (
		<box
			flexDirection="row"
			backgroundColor={colors.surface2}
			{...({ onMouseDown: handleClick } as Record<string, unknown>)}
		>
			{/* Left accent stripe using partial block character */}
			<text fg={borderColor}>{"▎\n▎\n▎"}</text>
			{/* Toast content with padding */}
			<box padding={1}>
				<text fg={colors.text}>{t.message}</text>
			</box>
		</box>
	);
}

export function ToastContainer({ theme, topOffset = 1 }: ToastContainerProps) {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	// Subscribe to toast events
	useEffect(() => {
		const unsubscribe = toast.subscribe((newToast) => {
			setToasts((prev) => [...prev, newToast]);
		});
		return unsubscribe;
	}, []);

	const handleDismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	if (toasts.length === 0) {
		return null;
	}

	return (
		<box
			position="absolute"
			top={topOffset}
			right={2}
			flexDirection="column"
			gap={1}
			zIndex={1000}
		>
			{toasts.map((t) => (
				<ToastItem
					key={t.id}
					toast={t}
					theme={theme}
					onDismiss={handleDismiss}
				/>
			))}
		</box>
	);
}
