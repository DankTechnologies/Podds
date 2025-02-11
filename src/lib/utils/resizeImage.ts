export function resizeBase64Image(
	dataUrl: string,
	maxWidth: number,
	maxHeight: number
): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();

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

		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = `data:${dataUrl}`;
	});
}
