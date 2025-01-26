import type { Episode } from '$lib/types/db';
import { EpisodeService } from './EpisodeService';

class PlayService {
	private static readonly UPDATE_INTERVAL_MS = 1000;
	private currentEpisode = $state<Episode | null>(null);
	private audio: HTMLAudioElement;
	private time = $state<number>(0);
	private duration = $state<number>(0);
	private paused = $state<boolean>(true);
	private updateInterval: number | undefined;

	constructor() {
		this.audio = new Audio();
		this.setupAudioListeners();
	}

	private setupAudioListeners() {
		this.audio.onplay = () => {
			this.paused = false;

			if (!this.currentEpisode) return;

			if (this.updateInterval) {
				window.clearInterval(this.updateInterval);
			}
			this.updateInterval = window.setInterval(async () => {
				this.time = this.audio.currentTime || 0;
				console.log(
					`Updating playback position for ${this.currentEpisode!.title} to ${this.time} of ${this.duration}`
				);
				await EpisodeService.updatePlaybackPosition(this.currentEpisode!.id, this.time);
			}, PlayService.UPDATE_INTERVAL_MS);
		};

		this.audio.onpause = () => {
			this.paused = true;
			if (this.updateInterval) {
				window.clearInterval(this.updateInterval);
				this.updateInterval = undefined;
			}
		};

		this.audio.onended = () => {
			if (this.updateInterval) {
				window.clearInterval(this.updateInterval);
				this.updateInterval = undefined;
			}
		};

		this.audio.ondurationchange = () => (this.duration = this.audio.duration || 0);
	}

	public async play(episode: Episode, onComplete?: () => void, onError?: (error: Error) => void) {
		if (!this.audio) return;

		console.log(`Playing episode: ${episode.title}`);

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
			console.log(`Starting at ${episode.playbackPosition} seconds for ${episode.title}`);
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

	public async setCurrentTime(seconds: number) {
		if (!this.audio || !this.currentEpisode) return;
		this.audio.currentTime = seconds;
		await EpisodeService.updatePlaybackPosition(this.currentEpisode.id, seconds);
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
