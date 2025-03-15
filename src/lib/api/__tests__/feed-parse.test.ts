import { describe, it, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseFeedUrl } from '$lib/utils/feedParser';

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.DOMParser = dom.window.DOMParser;

describe('FeedService RSS parsing', () => {
	it.only('should parse Larry Meiller', async () => {
		const url = 'https://www.wpr.org/feeds/the-larry-meiller-show/rss.xml';

		const episodes = await parseFeedUrl('12345', url);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});
});
