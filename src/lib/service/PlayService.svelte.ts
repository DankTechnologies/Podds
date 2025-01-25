import type { Episode } from '$lib/types/db';

class PlayService {
	private currentEpisode = $state<Episode | null>(null);
	private audio = $state<HTMLAudioElement | null>(null);
	private time = $state(0);
	private duration = $state(0);
	private paused = $state(true);

	constructor() {
		this.audio = new Audio();
		this.setupAudioListeners();
	}

	private setupAudioListeners() {
		if (!this.audio) return;

		this.audio.ontimeupdate = () => (this.time = this.audio?.currentTime || 0);
		this.audio.ondurationchange = () => (this.duration = this.audio?.duration || 0);
		this.audio.onpause = () => (this.paused = true);
		this.audio.onplay = () => (this.paused = false);
	}

	public play(episode: Episode, onComplete?: () => void, onError?: (error: Error) => void) {
		if (!this.audio) return;

		this.audio.onended = () => {
			this.time = 0;
			onComplete?.();
		};

		this.audio.onerror = () => {
			const mediaError = this.audio?.error;
			const error = mediaError
				? new Error(`Media error: ${mediaError.message}`)
				: new Error('Unknown playback error');
			onError?.(error);
		};

		this.currentEpisode = episode;
		this.audio.src = episode.url;
		this.audio
			.play()
			.catch((error: unknown) =>
				onError?.(error instanceof Error ? error : new Error(String(error)))
			);
	}

	public togglePlayPause() {
		if (!this.audio) return;
		if (this.audio.paused) {
			this.audio.play();
		} else {
			this.audio.pause();
		}
	}

	public seek(seconds: number) {
		if (!this.audio) return;
		this.audio.currentTime = Math.max(
			0,
			Math.min(this.audio.duration, this.audio.currentTime + seconds)
		);
	}

	// Expose state
	public get episode() {
		return this.currentEpisode;
	}
	public get currentTime() {
		return this.time;
	}
	public get totalDuration() {
		return this.duration;
	}
	public get isPaused() {
		return this.paused;
	}
}

// Export singleton instance
export const playService = new PlayService();
