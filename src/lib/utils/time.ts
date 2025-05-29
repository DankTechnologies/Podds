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

export function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatEpisodeDate(input: Date | number | string): string {
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

export function formatEpisodeDuration(durationMin: number): string {
	const hours = Math.floor(durationMin / 60);
	const minutes = Math.floor(durationMin % 60);

	return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
