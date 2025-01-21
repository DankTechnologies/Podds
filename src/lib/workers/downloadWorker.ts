type DownloadMessage = {
	type: 'download';
	episodeId: Number;
	url: string;
};

type WorkerResponse = {
	type: 'success' | 'error' | 'progress';
	episodeId: Number;
	error?: string;
	progress?: number;
	total?: number;
	loaded?: number;
};

self.addEventListener('message', async (e: MessageEvent<DownloadMessage>) => {
	if (e.data.type === 'download') {
		try {
			const response = await fetch(e.data.url);
			const total = Number(response.headers.get('content-length')) || 0;
			const reader = response.body?.getReader();

			if (!reader) throw new Error('Unable to read response');

			let loaded = 0;
			const chunks: Uint8Array[] = [];
			let lastProgressUpdate = 0;
			const PROGRESS_THROTTLE = 250; // Update at most every 250ms

			// Read the stream
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				chunks.push(value);
				loaded += value.length;

				// Send progress message with throttling
				const now = Date.now();
				if (now - lastProgressUpdate >= PROGRESS_THROTTLE) {
					const progress = total ? Math.round((loaded / total) * 100) : 0;
					self.postMessage({
						type: 'progress',
						episodeId: e.data.episodeId,
						progress,
						total,
						loaded
					} as WorkerResponse);
					lastProgressUpdate = now;
				}
			}

			// Combine chunks into final blob
			const blob = new Blob(chunks, { type: 'audio/mpeg' });

			// Store in OPFS
			const root = await navigator.storage.getDirectory();
			const episodeFile = await root.getFileHandle(`episode-${e.data.episodeId}.mp3`, {
				create: true
			});
			const writable = await episodeFile.createWritable();
			await writable.write(blob);
			await writable.close();

			// Send success message back
			self.postMessage({
				type: 'success',
				episodeId: e.data.episodeId
			} as WorkerResponse);
		} catch (error: unknown) {
			self.postMessage({
				type: 'error',
				episodeId: e.data.episodeId,
				error: error instanceof Error ? error.message : 'Unknown error'
			} as WorkerResponse);
		}
	}
});
