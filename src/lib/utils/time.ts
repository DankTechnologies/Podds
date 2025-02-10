/**
 * Formats seconds into human readable duration (HH:MM:SS or MM:SS)
 * @param seconds - Number of seconds to format
 * @returns Formatted duration string
 */
export function formatPlaybackPosition(seconds: number): string {
	if (!isFinite(seconds) || seconds < 0) return '0:00';

	seconds = Math.floor(seconds);
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;

	return h > 0
		? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
		: `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats a date into a human readable string
 * @param input - Date object or timestamp to format
 * @returns Formatted date string showing relative or absolute date
 */
export function formatDate(input: Date | number | string): string {
	const date = input instanceof Date ? input : new Date(input);
	const now = new Date();

	const dateNoTime = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const nowNoTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	if (!date.getTime() || isNaN(date.getTime())) return '';

	const diffDays = Math.floor((nowNoTime.getTime() - dateNoTime.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) {
		return date.toLocaleDateString('en-US', { weekday: 'long' });
	}
	if (date.getFullYear() === now.getFullYear()) {
		return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
	}
	return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Formats minutes into human readable duration (1h 55m or 55m)
 * @param durationMin - Number of minutes to format
 * @returns Formatted duration string
 */
export function formatDuration(durationMin: number): string {
	const hours = Math.floor(durationMin / 60);
	const minutes = Math.floor(durationMin % 60);

	return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
