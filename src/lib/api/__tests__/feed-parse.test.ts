import { describe, it } from 'vitest';
import { parseFeedUrl } from '$lib/utils/feedParser';

describe('FeedService RSS parsing', () => {
	it('should parse Larry Meiller', async () => {
		const url = 'https://www.wpr.org/feeds/the-larry-meiller-show/rss.xml';

		const episodes = await parseFeedUrl('12345', url);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it.only('should parse Science Friday', async () => {
		const url = 'https://feeds.feedburner.com/science-friday/';

		const episodes = await parseFeedUrl('12345', url);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});
});
