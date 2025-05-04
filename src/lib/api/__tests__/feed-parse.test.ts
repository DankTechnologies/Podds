import { describe, it } from 'vitest';
import { parseFeedUrl } from '$lib/utils/feedParser';

describe('FeedService RSS parsing', () => {
	it('should parse Larry Meiller', async () => {
		const url = 'https://www.wpr.org/feeds/the-larry-meiller-show/rss.xml';

		const episodes = await parseFeedUrl('12345', url, import.meta.env.VITE_CORS_HELPER_URL, import.meta.env.VITE_CORS_HELPER_BACKUP_URL);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should parse Science Friday', async () => {
		const url = 'https://feeds.feedburner.com/science-friday/';

		const episodes = await parseFeedUrl('12345', url, import.meta.env.VITE_CORS_HELPER_URL, import.meta.env.VITE_CORS_HELPER_BACKUP_URL);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should parse Marketplace', async () => {
		const url = 'https://www.marketplace.org/feed/podcast/marketplace/';

		const episodes = await parseFeedUrl('12345', url, import.meta.env.VITE_CORS_HELPER_URL, import.meta.env.VITE_CORS_HELPER_BACKUP_URL);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it.only('should parse How About Tomorrow', async () => {
		const url = 'https://feeds.transistor.fm/tomorrow';

		const episodes = await parseFeedUrl('12345', url, import.meta.env.VITE_CORS_HELPER_URL, import.meta.env.VITE_CORS_HELPER_BACKUP_URL);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should parse Lapsed', async () => {
		const url = 'https://feeds.redcircle.com/01ece97c-8cee-40b0-935b-0186ec657940';

		const episodes = await parseFeedUrl('12345', url, import.meta.env.VITE_CORS_HELPER_URL, import.meta.env.VITE_CORS_HELPER_BACKUP_URL);

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});
});
