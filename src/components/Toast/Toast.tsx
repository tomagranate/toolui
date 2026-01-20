import { useCallback, useEffect, useState } from "react";
import type { Theme } from "../../lib/theme";
import { type ToastMessage, toast } from "./toast-store";

/** Default toast duration in milliseconds */
const DEFAULT_TOAST_DURATION = 2000;

interface ToastContainerProps {
	theme: Theme;
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

	// Get colors based on toast type
	const getColors = () => {
		switch (t.type) {
			case "success":
				return {
					bg: colors.statusRunning,
					fg: colors.background,
				};
			case "error":
				return {
					bg: colors.statusError,
					fg: "white",
				};
			default:
				return {
					bg: colors.activeTabBackground,
					fg: colors.activeTabText,
				};
		}
	};

	const { bg, fg } = getColors();

	return (
		<box
			height={1}
			paddingLeft={1}
			paddingRight={1}
			backgroundColor={bg}
			justifyContent="flex-end"
		>
			<text fg={fg}>{t.message}</text>
		</box>
	);
}

export function ToastContainer({ theme }: ToastContainerProps) {
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
			top={0}
			right={0}
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
