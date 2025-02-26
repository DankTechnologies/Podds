export class AudioService {
	private static audio = new Audio();
	private static progressCallback: ((progress: number) => void) | undefined;
	private static completeCallback: (() => void) | undefined;
	private static errorCallback: ((error: Error) => void) | undefined;

	private static handleProgress = () => {
		if (this.audio.buffered.length) {
			const progress = (this.audio.buffered.end(0) / this.audio.duration) * 100;
			if (this.progressCallback) {
				this.progressCallback(progress);
			}
		}
	};

	private static handleError = (e: Event) => {
		if (this.errorCallback) {
			this.errorCallback(new Error('Error loading audio'));
		}
	};

	private static removeProgressListeners() {
		if (this.progressCallback) {
			this.audio.removeEventListener('progress', this.handleProgress);
		}
		if (this.completeCallback) {
			this.audio.removeEventListener('canplaythrough', this.completeCallback);
		}
		if (this.errorCallback) {
			this.audio.removeEventListener('error', this.handleError);
		}
	}

	static async loadPaused(url: string, currentTime: number = 0) {
		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&cacheAudio=true`;
		this.audio.src = corsHelperUrl;
		this.audio.currentTime = currentTime;
	}

	static async play(
		url: string,
		currentTime: number = 0,
		onProgress?: (progress: number) => void,
		onComplete?: () => void,
		onError?: (error: Error) => void
	) {
		try {
			const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&cacheAudio=true`;

			// Clean up previous listeners
			this.removeProgressListeners();

			// Set up new callbacks
			this.progressCallback = onProgress;
			this.completeCallback = onComplete;
			this.errorCallback = onError;

			// Add all listeners before setting the source
			if (onProgress) {
				this.audio.addEventListener('progress', this.handleProgress);
			}
			if (onComplete) {
				this.audio.addEventListener('canplaythrough', onComplete, { once: true });
			}
			if (onError) {
				this.audio.addEventListener('error', this.handleError);
			}

			// Set the proxied URL directly as the audio source
			this.audio.src = corsHelperUrl;
			this.audio.currentTime = currentTime;
			await this.audio.play();
		} catch (error) {
			if (this.errorCallback) {
				this.errorCallback(error instanceof Error ? error : new Error('Error loading audio'));
			}
		}
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
		this.audio.pause();
		this.audio.currentTime = 0;
	}

	static getDuration() {
		return this.audio.duration;
	}

	static getCurrentTime() {
		return this.audio.currentTime;
	}

	static getPaused() {
		return this.audio.paused;
	}
}
