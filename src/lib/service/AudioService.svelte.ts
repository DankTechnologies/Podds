export class AudioService {
	private static audio = new Audio();

	static loadPaused(url: string, currentTime: number = 0) {
		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&cacheAudio=true`;

		this.audio.src = corsHelperUrl;
		this.audio.currentTime = currentTime;
	}

	static play(url: string, currentTime: number = 0) {
		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&cacheAudio=true`;

		this.audio.src = corsHelperUrl;
		this.audio.currentTime = currentTime;
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
