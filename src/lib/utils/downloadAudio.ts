import { getSettings } from "$lib/stores/db.svelte";

export function downloadAudio(
	url: string,
	onComplete?: () => void,
	onError?: (error: ErrorEvent) => void,
	onProgress?: (percent: number) => void
) {
	const settings = getSettings();
	const primaryUrl = `${settings!.corsHelper}?url=${encodeURIComponent(url)}&cacheAudio=true`;
	const backupUrl = settings!.corsHelper2
		? `${settings!.corsHelper2}?url=${encodeURIComponent(url)}&cacheAudio=true`
		: undefined;

	function download(downloadUrl: string, onSuccess: (blob: Blob) => void, onError: (err: any) => void) {
		const xhr = new XMLHttpRequest();

		xhr.addEventListener('progress', (event) => {
			if (event.lengthComputable) {
				const percent = (event.loaded / event.total) * 100;
				if (onProgress) onProgress(percent);
			}
		});

		xhr.addEventListener('load', () => {
			if (xhr.status === 200) {
				onSuccess(xhr.response);
			} else {
				onError(`HTTP ${xhr.status}`);
			}
		});

		xhr.addEventListener('error', () => {
			onError('Network error occurred');
		});

		xhr.open('GET', downloadUrl);
		xhr.responseType = 'blob';
		xhr.send();
	}

	download(
		primaryUrl,
		(blob) => {
			const audio = new Audio(URL.createObjectURL(blob));
			audio.addEventListener(
				'loadedmetadata',
				() => {
					if (onComplete) onComplete();
				},
				{ once: true }
			);
		},
		(err) => {
			if (backupUrl) {
				download(
					backupUrl,
					(blob) => {
						const audio = new Audio(URL.createObjectURL(blob));
						audio.addEventListener(
							'loadedmetadata',
							() => {
								if (onComplete) onComplete();
							},
							{ once: true }
						);
					},
					(finalErr) => {
						deleteCachedAudio(url).then(() => {
							if (onError) {
								onError(new ErrorEvent('error', { error: new Error(finalErr) }));
							}
						});
					}
				);
			} else {
				deleteCachedAudio(url).then(() => {
					if (onError) {
						onError(new ErrorEvent('error', { error: new Error(err) }));
					}
				});
			}
		}
	);
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
