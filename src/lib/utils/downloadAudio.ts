export function downloadAudio(
	url: string,
	onComplete?: () => void,
	onError?: (error: ErrorEvent) => void
): void {
	const audio = new Audio();
	audio.preload = 'auto';
	// guard against onError firing after onSuccess with some APIs
	let isDone = false;

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
				if (!isDone) {
					isDone = true;
					onComplete();
					cleanup();
				}
			},
			{ once: true }
		);
	}

	if (onError) {
		audio.addEventListener(
			'error',
			(e) => {
				if (!isDone) {
					isDone = true;
					onError(e);
					cleanup();
				}
			},
			{ once: true }
		);
	}

	audio.src = url;
	audio.load();
}
