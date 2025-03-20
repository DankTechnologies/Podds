export class AudioService {
	private static audio = new Audio();

	private static setupMediaSession() {
		if (!('mediaSession' in navigator)) return;

		navigator.mediaSession.setActionHandler('play', () => this.audio.play());
		navigator.mediaSession.setActionHandler('pause', () => this.audio.pause());
		navigator.mediaSession.setActionHandler('seekbackward', () => {
			this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
		});
		navigator.mediaSession.setActionHandler('seekforward', () => {
			this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 30);
		});
		navigator.mediaSession.setActionHandler('stop', () => {
			this.audio.pause();
			this.audio.currentTime = 0;
		});
	}

	static updateMediaSessionMetadata(
		episodeTitle: string,
		feedTitle: string,
		artwork: string | undefined
	) {
		if (!('mediaSession' in navigator)) return;

		navigator.mediaSession.metadata = new MediaMetadata({
			title: episodeTitle,
			artist: feedTitle,
			album: feedTitle,
			artwork: artwork
				? [
						{
							src: `data:${artwork}`,
							sizes: '300x300',
							type: 'image/png'
						}
					]
				: undefined
		});
	}

	static updateMediaSessionPosition(duration: number, position: number) {
		if (!('mediaSession' in navigator) || duration <= 0) return;

		navigator.mediaSession.setPositionState({
			duration,
			position,
			playbackRate: 1.0
		});
	}

	static updateMediaSessionPlaybackState(isPaused: boolean) {
		if (!('mediaSession' in navigator)) return;

		navigator.mediaSession.playbackState = isPaused ? 'paused' : 'playing';
	}

	static clearMediaSession() {
		if (!('mediaSession' in navigator)) return;

		// Clear metadata and playback state
		navigator.mediaSession.metadata = null;
		navigator.mediaSession.playbackState = 'none';

		// Clear all action handlers
		navigator.mediaSession.setActionHandler('play', null);
		navigator.mediaSession.setActionHandler('pause', null);
		navigator.mediaSession.setActionHandler('seekbackward', null);
		navigator.mediaSession.setActionHandler('seekforward', null);
		navigator.mediaSession.setActionHandler('stop', null);
	}

	static async loadPaused(url: string, currentTime: number = 0) {
		if (this.audio.src) return;

		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&cacheAudio=true`;
		this.audio.src = corsHelperUrl;
		this.audio.currentTime = currentTime;
	}

	static async play(url: string, currentTime: number = 0) {
		this.audio.pause();
		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&cacheAudio=true`;
		this.audio.src = corsHelperUrl;

		if (this.audio.readyState < 1) {
			await new Promise((r) => this.audio.addEventListener('loadedmetadata', r, { once: true }));
		}
		this.audio.currentTime = currentTime;

		this.setupMediaSession();
		this.audio.play();
	}

	static addEventListener(event: string, callback: () => void) {
		this.audio.addEventListener(event, callback);
	}

	static removeEventListener(event: string, callback: () => void) {
		this.audio.removeEventListener(event, callback);
	}

	static togglePlayPause() {
		if (this.audio.paused) {
			this.audio.play();
		} else {
			this.audio.pause();
		}
	}

	static seek(time: number) {
		this.audio.currentTime = time;
	}

	static stop() {
		this.audio.src = '';
		this.audio.load();
		this.clearMediaSession();
	}

	static getDuration() {
		return this.audio.duration;
	}

	static getCurrentTime() {
		this.updateMediaSessionPosition(this.audio.duration, this.audio.currentTime);
		return this.audio.currentTime;
	}

	static getPaused() {
		this.updateMediaSessionPlaybackState(this.audio.paused);
		return this.audio.paused;
	}
}
