import type { Episode } from '$lib/types/db';
import { Log } from '$lib/service/LogService';

export async function parseFeedUrl(
	feedId: string,
	url: string,
	since?: number
): Promise<Episode[]> {
	try {
		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}`;
		const response = await fetch(corsHelperUrl);
		const contentType = response.headers.get('content-type');

		if (!contentType?.includes('xml')) {
			throw new Error('Invalid feed format - expected XML');
		}

		const xmlString = await response.text();
		return parseEpisodesFromXml(feedId, xmlString, since);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		Log.error(`Error parsing feed URL ${url}: ${errorMessage}`);
		throw error;
	}
}

function parseEpisodesFromXml(feedId: string, xmlString: string, since?: number): Episode[] {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

	const episodes: Episode[] = [];
	const items = xmlDoc.getElementsByTagName('item');

	for (const item of Array.from(items)) {
		const title = item.getElementsByTagName('title')[0]?.textContent?.trim() || '';
		const publishedAtStr = item.getElementsByTagName('pubDate')[0]?.textContent?.trim() || '';
		const publishedAt = publishedAtStr ? new Date(publishedAtStr) : new Date();

		// Skip items published before the since timestamp
		if (since && publishedAt.getTime() / 1000 < since) {
			continue;
		}

		const content =
			item.getElementsByTagName('description')[0]?.textContent?.trim() ||
			item.getElementsByTagName('itunes:summary')[0]?.textContent?.trim() ||
			'';

		// Find audio enclosure
		const enclosures = item.getElementsByTagName('enclosure');
		let url = '';
		for (const enclosure of Array.from(enclosures)) {
			const enclosureUrl = enclosure.getAttribute('url') || '';
			const type = enclosure.getAttribute('type');
			if (type === 'audio/mpeg' || enclosureUrl.toLowerCase().endsWith('.mp3')) {
				url = enclosureUrl;
				break;
			}
		}

		// Parse duration from seconds format
		const durationStr = item.getElementsByTagName('itunes:duration')[0]?.textContent?.trim() || '0';
		const durationSeconds = parseInt(durationStr, 10) || 0;
		const durationMin = Math.floor(durationSeconds / 60);

		episodes.push({
			id: Date.now().toString() + Math.floor(Math.random() * 10000).toString(),
			feedId,
			title,
			publishedAt,
			content,
			url,
			durationMin
		});
	}

	return episodes;
}
