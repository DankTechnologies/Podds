import { describe, it, beforeEach } from 'vitest';
import { PodcastIndexClient } from '../podcast-index';

describe('PodcastIndexClient', () => {
	let client: PodcastIndexClient;

	beforeEach(() => {
		client = new PodcastIndexClient(
			import.meta.env.VITE_PODCAST_INDEX_KEY,
			import.meta.env.VITE_PODCAST_INDEX_SECRET
		);
		// global.fetch = vi.fn();
	});

	it.only('should search podcasts', async () => {
		const result = await client.searchFeeds('localfirst.fm', { fulltext: true });
		const result2 = await client.episodesByPerson('Maggie Appleton', {
			fulltext: true,
			max: 10
		});
		console.log(JSON.stringify(result, null, 2));
		// console.log(result2);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should get feed episodes', async () => {
		const result = await client.episodesByFeedIds('165630,6812027', {
			fulltext: true,
			since: 1736761659
		});
		console.log(result);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should get trending podcasts', async () => {
		const result = await client.trending({ max: 2, lang: 'en' });
		console.log(result);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});
});
