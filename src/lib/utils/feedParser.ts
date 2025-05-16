import { XMLParser } from 'fast-xml-parser';
import type { Chapter, Episode } from '$lib/types/db';

interface ParseFeedResult {
	episodes: Episode[];
	status: number;
	lastModified?: string;
	ttlMinutes?: number;
	description?: string;
	link?: string;
	ownerName?: string;
	author?: string;
}

interface ParseXmlResult {
	episodes: Episode[];
	ttlMinutes?: number;
}

export async function parseFeedUrl(
	feedId: string,
	url: string,
	corsHelper: string,
	corsHelper2: string | undefined,
	since?: number,
	headers?: Record<string, string>
): Promise<ParseFeedResult> {
	async function fetchFeed(fetchUrl: string): Promise<ParseFeedResult> {
		const response = await fetch(fetchUrl, { headers });

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

		if (!contentType?.includes('xml') && !contentType?.includes('html')) {
			throw new Error(`Invalid feed format: ${contentType}`);
		}

		const xmlString = await response.text();
		const { episodes, ttlMinutes } = await parseEpisodesFromXml(feedId, xmlString, since);

		let description: string | undefined = undefined;
		let link: string | undefined = undefined;
		let ownerName: string | undefined = undefined;
		let author: string | undefined = undefined;

		try {
			const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
			const result = parser.parse(xmlString);
			description = result?.rss?.channel?.description?.toString() || undefined;
			link = result?.rss?.channel?.link?.toString() || undefined;
			author = result?.rss?.channel?.['itunes:author']?.toString() || undefined;
			ownerName = result?.rss?.channel?.['itunes:owner']?.['itunes:name']?.toString() || undefined;
		} catch { }

		return {
			episodes,
			status: response.status,
			lastModified: response.headers.get('last-modified') || undefined,
			ttlMinutes,
			description,
			link,
			ownerName,
			author
		};
	}

	try {
		const primaryUrl = `${corsHelper}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
		return await fetchFeed(primaryUrl);
	} catch (error) {
		if (corsHelper2) {
			try {
				const backupUrl = `${corsHelper2}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
				return await fetchFeed(backupUrl);
			} catch (error) {
				throw error;
			}
		}
		throw error;
	}
}

async function parseEpisodesFromXml(feedId: string, xmlString: string, since?: number): Promise<ParseXmlResult> {
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

	const episodes: Episode[] = await Promise.all(itemsArray
		.filter((item) => {
			const publishedAt = new Date(item.pubDate);
			return !since || publishedAt.getTime() / 1000 >= since;
		})
		.map(async (item) => {
			const publishedAt = new Date(decodeHtmlEntities(item.pubDate || new Date()));
			const enclosure = Array.isArray(item.enclosure)
				? item.enclosure.find(
					(e: { '@_type': string; '@_url': string }) =>
						e['@_type'] === 'audio/mpeg' || e['@_url']?.toLowerCase().endsWith('.mp3')
				)
				: item.enclosure;

			const chaptersUrl = item['podcast:chapters']?.['@_url'];
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
				durationMin: Math.floor(durationSeconds / 60),
				chaptersUrl
			};
		}));

	return { episodes, ttlMinutes };
}

export function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
		.replace(/&#x([0-9A-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function encodeHtmlEntities(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
		.replace(/[^\x20-\x7E]/g, char => {
			const code = char.charCodeAt(0);
			return code < 256 ? `&#${code};` : `&#x${code.toString(16).toUpperCase()};`;
		});
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

export async function fetchChapters(url: string, corsHelper: string, corsHelper2: string | undefined): Promise<Chapter[]> {

	async function fetchChaptersFromUrl(fetchUrl: string): Promise<Chapter[]> {
		const response = await fetch(fetchUrl);
		if (!response.ok) return [];

		const data = await response.json();
		return data.chapters.map((chapter: Chapter) => ({
			title: chapter.title,
			startTime: chapter.startTime,
			endTime: chapter.endTime
		}));
	}

	try {
		const primaryUrl = `${corsHelper}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
		return await fetchChaptersFromUrl(primaryUrl);
	} catch (error) {
		if (corsHelper2) {
			try {
				const backupUrl = `${corsHelper2}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
				return await fetchChaptersFromUrl(backupUrl);
			} catch (error) {
				return [];
			}
		}
		return [];
	}
}
