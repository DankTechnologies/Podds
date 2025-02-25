self.onmessage = (e: MessageEvent) => {
	const { url } = e.data;
	const xhr = new XMLHttpRequest();

	// Setup XHR progress tracking
	xhr.addEventListener('progress', (event) => {
		if (event.lengthComputable) {
			const percent = (event.loaded / event.total) * 100;
			self.postMessage({ type: 'progress', percent });
		}
	});

	xhr.addEventListener('load', () => {
		if (xhr.status === 200) {
			// Send success message with the blob data
			const blob = xhr.response;
			self.postMessage({ type: 'complete', blob });
		} else {
			self.postMessage({
				type: 'error',
				error: `HTTP ${xhr.status}`
			});
		}
	});

	xhr.addEventListener('error', (e) => {
		self.postMessage({
			type: 'error',
			error: 'Network error occurred'
		});
	});

	xhr.open('GET', url);
	xhr.responseType = 'blob';
	xhr.send();
};
