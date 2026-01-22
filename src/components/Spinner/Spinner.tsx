import { useEffect, useRef, useState } from "react";

/** Spinner frames for loading animation (braille pattern) */
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Default interval between spinner frame updates in ms */
const DEFAULT_INTERVAL = 80;

interface SpinnerProps {
	/** Color for the spinner character */
	color?: string;
	/** Text to show after the spinner */
	label?: string;
	/** Color for the label text (defaults to same as spinner) */
	labelColor?: string;
	/** Interval between frame updates in ms (default: 80) */
	interval?: number;
	/** Whether the spinner is active (default: true) */
	active?: boolean;
}

export function Spinner({
	color,
	label,
	labelColor,
	interval = DEFAULT_INTERVAL,
	active = true,
}: SpinnerProps) {
	const [frameIndex, setFrameIndex] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (active) {
			intervalRef.current = setInterval(() => {
				setFrameIndex((i) => (i + 1) % SPINNER_FRAMES.length);
			}, interval);
		} else {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [active, interval]);

	if (!active) {
		return null;
	}

	const frame = SPINNER_FRAMES[frameIndex] ?? SPINNER_FRAMES[0];
	const textColor = labelColor ?? color;

	if (label) {
		return (
			<text fg={color}>
				{frame}
				<span fg={textColor}> {label}</span>
			</text>
		);
	}

	return <text fg={color}>{frame}</text>;
}
