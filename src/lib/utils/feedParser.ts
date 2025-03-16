import { XMLParser } from 'fast-xml-parser';
import type { Episode } from '$lib/types/db';

export async function parseFeedUrl(
	feedId: string,
	url: string,
	since?: number
): Promise<Episode[]> {
	const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}`;
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
			const durationSeconds = parseInt(durationStr, 10) || 0;

			return {
				id: Date.now().toString() + Math.floor(Math.random() * 10000).toString(),
				feedId,
				title: item.title?.trim() || '',
				publishedAt,
				content: item.description?.trim() || item['itunes:summary']?.trim() || '',
				url: enclosure?.['@_url'] || '',
				durationMin: Math.floor(durationSeconds / 60)
			};
		});
}
