import { getSettings } from "$lib/stores/db.svelte";

export function downloadAudio(
	url: string,
	onComplete?: () => void,
	onError?: (error: ErrorEvent) => void,
	onProgress?: (percent: number) => void
): () => void {
	const worker = new Worker(new URL('../workers/audioDownloader.worker.ts', import.meta.url), {
		type: 'module'
	});

	const settings = getSettings();

	worker.onmessage = (e) => {
		const { type, percent, blob, error } = e.data;

		switch (type) {
			case 'progress':
				if (onProgress) onProgress(percent);
				break;
			case 'complete':
				const audio = new Audio(URL.createObjectURL(blob));
				audio.addEventListener(
					'loadedmetadata',
					() => {
						if (onComplete) onComplete();
					},
					{ once: true }
				);
				break;
			case 'error':
				// Clear cache before calling error handler
				deleteCachedAudio(url).then(() => {
					if (onError) {
						onError(new ErrorEvent('error', { error: new Error(error) }));
					}
				});
				break;
		}
	};

	const primaryUrl = `${settings!.corsHelperUrl}?url=${encodeURIComponent(url)}&cacheAudio=true`;

	const backupUrl = settings!.corsHelperBackupUrl
		? `${settings!.corsHelperBackupUrl}?url=${encodeURIComponent(url)}&cacheAudio=true`
		: undefined;

	worker.postMessage({ url: primaryUrl, backupUrl });

	// Return cleanup function
	return () => {
		worker.terminate();
	};
}

async function deleteCachedAudio(url: string) {
	if ('caches' in window) {
		try {
			const cache = await caches.open('mp3-cache');
			await cache.delete(url);
		} catch (error) {
			console.error(`Failed to clear cache for URL ${url}:`, error);
		}
	}
}
