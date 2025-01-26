import type { Episode } from '$lib/types/db';
import { EpisodeService } from './EpisodeService';

class PlayService {
	private currentEpisode = $state<Episode | null>(null);
	private audio: HTMLAudioElement;
	private time = $state<number>(0);
	private duration = $state<number>(0);
	private paused = $state<boolean>(true);

	constructor() {
		this.audio = new Audio();
		this.setupAudioListeners();
	}

	private setupAudioListeners() {
		this.audio.ontimeupdate = async () => {
			this.time = this.audio.currentTime || 0;
			// Update playback position in DB every few seconds
			if (this.currentEpisode && this.time % 5 < 1) {
				await EpisodeService.updatePlaybackPosition(this.currentEpisode.id, this.time);
			}
		};
		this.audio.ondurationchange = () => (this.duration = this.audio.duration || 0);
		this.audio.onpause = () => (this.paused = true);
		this.audio.onplay = () => (this.paused = false);
	}

	public async play(episode: Episode, onComplete?: () => void, onError?: (error: Error) => void) {
		if (!this.audio) return;

		if (onComplete) {
			this.audio.addEventListener(
				'ended',
				async () => {
					this.time = 0;
					await EpisodeService.updatePlaybackPosition(episode.id, 0);
					await EpisodeService.clearPlayingEpisode();
				},
				{ once: true }
			);

			this.audio.addEventListener(
				'loadeddata',
				() => {
					onComplete();
				},
				{ once: true }
			);
		}

		if (onError) {
			this.audio.addEventListener(
				'error',
				() => {
					const error = this.audio?.error
						? new Error(`Media error: ${this.audio.error.message}`)
						: new Error('Unknown playback error');
					onError(error);
				},
				{ once: true }
			);
		}

		this.currentEpisode = episode;
		await EpisodeService.setPlayingEpisode(episode.id);

		if (episode.playbackPosition && episode.playbackPosition > 0) {
			this.audio.currentTime = episode.playbackPosition;
		}

		this.audio.src = episode.url;
		this.audio.play().catch((error: unknown) => {
			const normalizedError = error instanceof Error ? error : new Error(String(error));
			onError?.(normalizedError);
		});
	}

	public togglePlayPause() {
		if (!this.audio) return;
		if (this.audio.paused) {
			this.audio.play();
		} else {
			this.audio.pause();
		}
	}

	public async seek(seconds: number) {
		if (!this.audio || !this.currentEpisode) return;
		const newTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + seconds));
		this.audio.currentTime = newTime;
		await EpisodeService.updatePlaybackPosition(this.currentEpisode.id, newTime);
	}

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

export const playService = new PlayService();
