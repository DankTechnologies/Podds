import { XMLParser } from 'fast-xml-parser';
import type { Episode } from '$lib/types/db';

interface ParseFeedResult {
	episodes: Episode[];
	status: number;
	lastModified?: string;
	ttlMinutes?: number;
}

interface ParseXmlResult {
	episodes: Episode[];
	ttlMinutes?: number;
}

export async function parseFeedUrl(
	feedId: string,
	url: string,
	since?: number,
	headers?: Record<string, string>
): Promise<ParseFeedResult> {
	const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
	const response = await fetch(corsHelperUrl, { headers });

	if (response.status === 304) {
		return {
			episodes: [],
			status: 304
		};
	}

	if (response.status >= 400) {
		throw new Error(`Failed to fetch feed: HTTP ${response.status}`);
	}

	const contentType = response.headers.get('content-type');

	if (!contentType?.includes('xml')) {
		throw new Error(`Invalid feed format: ${contentType}`);
	}

	const xmlString = await response.text();
	const { episodes, ttlMinutes } = parseEpisodesFromXml(feedId, xmlString, since);

	return {
		episodes,
		status: response.status,
		lastModified: response.headers.get('last-modified') || undefined,
		ttlMinutes
	};
}

function parseEpisodesFromXml(feedId: string, xmlString: string, since?: number): ParseXmlResult {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_'
	});
	const result = parser.parse(xmlString);
	const items = result.rss.channel.item;

	// Extract TTL if present
	const ttlMinutes = result.rss?.channel?.ttl ? parseInt(result.rss.channel.ttl, 10) : undefined;

	if (!items) return { episodes: [], ttlMinutes };

	// Ensure items is always an array
	const itemsArray = Array.isArray(items) ? items : [items];

	const episodes = itemsArray
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
				id: item.guid?.['#text'] || crypto.randomUUID(),
				feedId,
				title: decodeHtmlEntities((item.title?.toString() || '').trim()),
				publishedAt,
				content: item.description?.trim() || item['itunes:summary']?.trim() || '',
				url: enclosure?.['@_url'] || '',
				durationMin: Math.floor(durationSeconds / 60)
			};
		});

	return { episodes, ttlMinutes };
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

export function parseOwner(author: string | undefined, ownerName: string | undefined): string | undefined {
	const authorLength = author?.length || 0;
	const ownerNameLength = ownerName?.length || 0;

	return authorLength > ownerNameLength ? author : ownerName;
}
