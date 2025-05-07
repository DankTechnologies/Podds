import { Log } from "$lib/service/LogService";
import { getHelperUrl } from "./corsHelper";

function createFallbackImageImage(title: string, maxWidth: number, maxHeight: number): string {
	const canvas = document.createElement('canvas');
	canvas.width = maxWidth;
	canvas.height = maxHeight;
	const ctx = canvas.getContext('2d')!;

	// White background
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Grey text
	const fontSize = 36;
	ctx.fillStyle = '#666666';
	ctx.font = `bold ${fontSize}px system-ui`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// Word wrap
	const words = title.split(' ');
	const lines: string[] = [];
	let currentLine = words[0];

	for (let i = 1; i < words.length; i++) {
		const testLine = currentLine + ' ' + words[i];
		const { width } = ctx.measureText(testLine);
		if (width < maxWidth - 40) { // 20px padding each side
			currentLine = testLine;
		} else {
			lines.push(currentLine);
			currentLine = words[i];
		}
	}
	lines.push(currentLine);

	// Vertically center lines
	const lineHeight = fontSize * 1.3;
	const totalHeight = lines.length * lineHeight;
	const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;

	lines.forEach((line, i) => {
		ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
	});

	return canvas.toDataURL('image/png');
}

export async function resizeBase64Image(
	url: string,
	maxWidth: number,
	maxHeight: number,
	corsHelper: string,
	corsHelper2: string | undefined,
	title: string
): Promise<string> {
	async function loadImage(imageUrl: string): Promise<string> {
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

	const primaryUrl = `${getHelperUrl(corsHelper)}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
	const result = await loadImage(primaryUrl);
	if (result) return result;
	if (corsHelper2) {
		const backupUrl = `${getHelperUrl(corsHelper2)}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
		const backupResult = await loadImage(backupUrl);
		if (backupResult) return backupResult;
	}
	return createFallbackImageImage(title, maxWidth, maxHeight);
}
