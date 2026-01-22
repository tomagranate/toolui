/**
 * Format a duration from a start timestamp to now as a human-readable string.
 * @param startTime Unix timestamp in milliseconds when the process started
 * @returns Formatted string like "5s", "3m", "2h 15m", "1d 3h"
 */
export function formatUptime(startTime: number): string {
	const seconds = Math.floor((Date.now() - startTime) / 1000);

	if (seconds < 60) {
		return `${seconds}s`;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	if (hours < 24) {
		if (remainingMinutes === 0) {
			return `${hours}h`;
		}
		return `${hours}h ${remainingMinutes}m`;
	}

	const days = Math.floor(hours / 24);
	const remainingHours = hours % 24;

	if (remainingHours === 0) {
		return `${days}d`;
	}
	return `${days}d ${remainingHours}h`;
}
