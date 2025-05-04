self.onmessage = (e: MessageEvent) => {
	const { url, backupUrl } = e.data;

	function download(downloadUrl: string, onSuccess: (blob: Blob) => void, onError: (err: any) => void) {
		const xhr = new XMLHttpRequest();

		xhr.addEventListener('progress', (event) => {
			if (event.lengthComputable) {
				const percent = (event.loaded / event.total) * 100;
				self.postMessage({ type: 'progress', percent });
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
		url,
		(blob) => self.postMessage({ type: 'complete', blob }),
		(err) => {
			if (backupUrl) {
				download(
					backupUrl,
					(blob) => self.postMessage({ type: 'complete', blob }),
					(finalErr) => self.postMessage({ type: 'error', error: finalErr })
				);
			} else {
				self.postMessage({ type: 'error', error: err });
			}
		}
	);
};
