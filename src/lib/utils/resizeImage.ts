import { Log } from "$lib/service/LogService";

export function resizeBase64Image(
	url: string,
	maxWidth: number,
	maxHeight: number,
	corsHelperUrl: string,
	corsHelperBackupUrl: string | undefined
): Promise<string> {
	function loadImage(imageUrl: string): Promise<string> {
		return new Promise((resolve) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';

			img.onload = function () {
				let { width, height } = img;
				if (width > maxWidth || height > maxHeight) {
					const aspectRatio = width / height;
					if (width > height) {
						width = maxWidth;
						height = Math.round(width / aspectRatio);
					} else {
						height = maxHeight;
						width = Math.round(height * aspectRatio);
					}
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d')!;

				// Fill with white background
				ctx.fillStyle = '#FFFFFF';
				ctx.fillRect(0, 0, width, height);

				// Draw image on top
				ctx.drawImage(img, 0, 0, width, height);

				resolve(canvas.toDataURL('image/png'));
			};

			img.onerror = () => {
				Log.debug(`Failed to load image: ${imageUrl}`);
				resolve('');
			};
			img.src = imageUrl;
		});
	}

	const primaryUrl = `${corsHelperUrl}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
	return loadImage(primaryUrl).then(result => {
		if (result) return result;
		if (corsHelperBackupUrl) {
			const backupUrl = `${corsHelperBackupUrl}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
			return loadImage(backupUrl);
		}
		return '';
	});
}
