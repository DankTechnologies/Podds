import { XMLParser } from 'fast-xml-parser';
import type { Episode } from '$lib/types/db';

export async function parseFeedUrl(
	feedId: string,
	url: string,
	since?: number
): Promise<Episode[]> {
	const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
	const response = await fetch(corsHelperUrl);

	if (response.status >= 400) {
		throw new Error(`Failed to fetch feed: HTTP ${response.status}`);
	}

	const contentType = response.headers.get('content-type');

	if (!contentType?.includes('xml')) {
		throw new Error(`Invalid feed format: ${contentType}`);
	}

	const xmlString = await response.text();
	return parseEpisodesFromXml(feedId, xmlString, since);
}

function parseEpisodesFromXml(feedId: string, xmlString: string, since?: number): Episode[] {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_'
	});
	const result = parser.parse(xmlString);
	const items = result.rss.channel.item;

	if (!items) return [];

	// Ensure items is always an array
	const itemsArray = Array.isArray(items) ? items : [items];

	return itemsArray
		.filter((item) => {
			const publishedAt = new Date(item.pubDate);
			return !since || publishedAt.getTime() / 1000 >= since;
		})
		.map((item) => {
			const publishedAt = new Date(item.pubDate || new Date());
			const enclosure = Array.isArray(item.enclosure)
				? item.enclosure.find(
						(e: { '@_type': string; '@_url': string }) =>
							e['@_type'] === 'audio/mpeg' || e['@_url']?.toLowerCase().endsWith('.mp3')
					)
				: item.enclosure;

			const durationStr = item['itunes:duration'] || '0';
			let durationSeconds = 0;

			if (isNaN(durationStr)) {
				// Handle HH:MM:SS or MM:SS format
				const parts = durationStr.split(':').map((part: string) => parseInt(part, 10));
				if (parts.length === 3) {
					// HH:MM:SS
					durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
				} else if (parts.length === 2) {
					// MM:SS
					durationSeconds = parts[0] * 60 + parts[1];
				}
			} else {
				// Handle numeric format
				durationSeconds = parseInt(durationStr, 10) || 0;
			}

			return {
				id: crypto.randomUUID(),
				feedId,
				title: decodeHtmlEntities((item.title?.toString() || '').trim()),
				publishedAt,
				content: item.description?.trim() || item['itunes:summary']?.trim() || '',
				url: enclosure?.['@_url'] || '',
				durationMin: Math.floor(durationSeconds / 60)
			};
		});
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
		.replace(/&#x([0-9A-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function parseTitle(title: string | undefined): string {
	if (!title) return '';
	const match = title.match(/^(.*?)(?:[-:])(.*)/);
	return match ? match[1].trim() : title.trim();
}

export function parseSubtitle(title: string | undefined): string {
	if (!title) return '';
	const match = title.match(/^(.*?)(?:[-:])(.*)/);
	return match ? match[2].trim() : '';
}
