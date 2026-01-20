import { EventEmitter } from "node:events";

/** Default toast duration in milliseconds */
const DEFAULT_TOAST_DURATION = 2500;

export interface ToastMessage {
	id: string;
	message: string;
	type: "success" | "error" | "info";
	duration?: number; // ms, default 2500
}

type ToastListener = (toast: ToastMessage) => void;

class ToastStore extends EventEmitter {
	private counter = 0;

	/**
	 * Show a toast notification
	 */
	show(
		message: string,
		type: ToastMessage["type"] = "info",
		duration = DEFAULT_TOAST_DURATION,
	): string {
		const id = `toast-${++this.counter}`;
		const toast: ToastMessage = { id, message, type, duration };
		this.emit("toast", toast);
		return id;
	}

	/**
	 * Show a success toast
	 */
	success(message: string, duration?: number): string {
		return this.show(message, "success", duration);
	}

	/**
	 * Show an error toast
	 */
	error(message: string, duration?: number): string {
		return this.show(message, "error", duration);
	}

	/**
	 * Show an info toast
	 */
	info(message: string, duration?: number): string {
		return this.show(message, "info", duration);
	}

	/**
	 * Subscribe to toast events
	 */
	subscribe(listener: ToastListener): () => void {
		this.on("toast", listener);
		return () => this.off("toast", listener);
	}
}

// Global singleton instance
export const toast = new ToastStore();
