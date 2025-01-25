export function downloadAudio(
	url: string,
	onComplete?: () => void,
	onError?: (error: ErrorEvent) => void
): void {
	const audio = new Audio();
	audio.preload = 'auto';

	const cleanup = () => {
		audio.src = '';
		audio.onloadeddata = null;
		audio.onerror = null;
		audio.onload = null;
	};

	if (onComplete) {
		audio.addEventListener(
			'loadeddata',
			() => {
				onComplete();
				cleanup();
			},
			{ once: true }
		);
	}

	if (onError) {
		audio.addEventListener(
			'error',
			(e) => {
				onError(e);
				cleanup();
			},
			{ once: true }
		);
	}

	audio.src = url;
	audio.load();
}
