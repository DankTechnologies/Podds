import type { Episode } from '$lib/types/db';
import { Log } from '$lib/service/LogService';
import { EpisodeService } from './EpisodeService';
import { db } from '$lib/stores/db.svelte';

class PlayService {
	private static readonly UPDATE_INTERVAL_MS = 1000;
	private currentEpisode = $state<Episode | undefined>(undefined);
	private currentTimeValue = $state<number>(0);
	private currentDurationValue = $state<number>(0);
	private isPausedValue = $state<boolean>(true);
	private audio: HTMLAudioElement;
	private updateInterval: number | undefined;

	constructor() {
		this.audio = new Audio();
		this.setupAudioListeners();

		this.currentEpisode = db.episodes.findOne({ isPlaying: 1 });

		if (this.currentEpisode) {
			this.audio.src = this.currentEpisode.url;
		}
	}

	private setupAudioListeners() {
		this.audio.onplay = () => {
			if (!this.currentEpisode) return;

			if (this.updateInterval) {
				window.clearInterval(this.updateInterval);
			}
			this.updateInterval = window.setInterval(async () => {
				await EpisodeService.updatePlaybackPosition(
					this.currentEpisode!.id,
					this.audio.currentTime
				);
			}, PlayService.UPDATE_INTERVAL_MS);
		};

		this.audio.onpause = () => {
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

		this.audio.addEventListener('timeupdate', () => {
			this.currentTimeValue = this.audio.currentTime;
		});

		this.audio.addEventListener('loadedmetadata', () => {
			if (!this.currentEpisode) return;

			if (this.currentEpisode.playbackPosition && this.currentEpisode.playbackPosition > 0) {
				this.audio.currentTime = this.currentEpisode.playbackPosition;
				this.currentTimeValue = this.currentEpisode.playbackPosition;
			}

			if (this.audio.duration) {
				this.currentDurationValue = this.audio.duration;
			}
		});

		this.audio.addEventListener('play', () => {
			this.isPausedValue = false;
		});

		this.audio.addEventListener('pause', () => {
			this.isPausedValue = true;
		});
	}

	public async play(episode: Episode, onComplete?: () => void, onError?: (error: Error) => void) {
		if (!this.audio) return;

		Log.info(`Playing episode: ${episode.title}`);

		// Set up event listeners before changing the source
		if (onComplete) {
			this.audio.addEventListener(
				'ended',
				async () => {
					this.audio.currentTime = 0;
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

		// Wait for audio to be loaded before setting the position
		this.audio.addEventListener(
			'loadedmetadata',
			() => {
				if (episode.playbackPosition && episode.playbackPosition > 0) {
					Log.debug(`Starting at ${episode.playbackPosition} seconds for ${episode.title}`);
					this.audio.currentTime = episode.playbackPosition;
				}
			},
			{ once: true }
		);

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
		return this.currentTimeValue;
	}
	public get totalDuration() {
		return this.currentDurationValue;
	}

	public get isPaused() {
		return this.isPausedValue;
	}

	public getIcon(iconId: string) {
		return db.icons.findOne({ id: iconId });
	}
}

export const playService = new PlayService();
