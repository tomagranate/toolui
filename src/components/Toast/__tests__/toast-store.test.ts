import { beforeEach, describe, expect, mock, test } from "bun:test";
import { type ToastMessage, toast } from "../toast-store";

// Helper to safely get the first call argument
function getFirstCallArg(mockFn: ReturnType<typeof mock>): ToastMessage {
	const calls = mockFn.mock.calls;
	if (!calls[0]) throw new Error("No calls recorded");
	return calls[0][0] as ToastMessage;
}

describe("toast store", () => {
	beforeEach(() => {
		// Remove all listeners between tests
		toast.removeAllListeners();
	});

	test("show() emits a toast event with correct structure", () => {
		const listener = mock((_t: ToastMessage) => {});
		toast.subscribe(listener);

		toast.show("Test message", "info", 3000);

		expect(listener).toHaveBeenCalledTimes(1);
		const call = getFirstCallArg(listener);
		expect(call.message).toBe("Test message");
		expect(call.type).toBe("info");
		expect(call.duration).toBe(3000);
		expect(call.id).toMatch(/^toast-\d+$/);
	});

	test("show() returns unique toast IDs", () => {
		const id1 = toast.show("Message 1");
		const id2 = toast.show("Message 2");
		const id3 = toast.show("Message 3");

		expect(id1).not.toBe(id2);
		expect(id2).not.toBe(id3);
		expect(id1).not.toBe(id3);
	});

	test("show() uses default values when not provided", () => {
		const listener = mock((_t: ToastMessage) => {});
		toast.subscribe(listener);

		toast.show("Test");

		const call = getFirstCallArg(listener);
		expect(call.type).toBe("info");
		expect(call.duration).toBe(2500);
	});

	test("success() emits toast with type 'success'", () => {
		const listener = mock((_t: ToastMessage) => {});
		toast.subscribe(listener);

		toast.success("Success message");

		const call = getFirstCallArg(listener);
		expect(call.type).toBe("success");
		expect(call.message).toBe("Success message");
	});

	test("error() emits toast with type 'error'", () => {
		const listener = mock((_t: ToastMessage) => {});
		toast.subscribe(listener);

		toast.error("Error message");

		const call = getFirstCallArg(listener);
		expect(call.type).toBe("error");
		expect(call.message).toBe("Error message");
	});

	test("info() emits toast with type 'info'", () => {
		const listener = mock((_t: ToastMessage) => {});
		toast.subscribe(listener);

		toast.info("Info message");

		const call = getFirstCallArg(listener);
		expect(call.type).toBe("info");
		expect(call.message).toBe("Info message");
	});

	test("subscribe() returns unsubscribe function", () => {
		const listener = mock((_t: ToastMessage) => {});
		const unsubscribe = toast.subscribe(listener);

		toast.show("Before unsubscribe");
		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();

		toast.show("After unsubscribe");
		expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
	});

	test("multiple subscribers receive the same toast", () => {
		const listener1 = mock((_t: ToastMessage) => {});
		const listener2 = mock((_t: ToastMessage) => {});

		toast.subscribe(listener1);
		toast.subscribe(listener2);

		toast.show("Broadcast message");

		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(1);

		const call1 = getFirstCallArg(listener1);
		const call2 = getFirstCallArg(listener2);
		expect(call1.id).toBe(call2.id);
	});

	test("custom duration is passed through", () => {
		const listener = mock((_t: ToastMessage) => {});
		toast.subscribe(listener);

		toast.success("Quick toast", 500);

		const call = getFirstCallArg(listener);
		expect(call.duration).toBe(500);
	});
});
