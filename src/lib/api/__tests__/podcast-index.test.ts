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

	it.only('should get episodes by podcast', async () => {
		const result = await client.searchFeeds('Fresh Air', { fulltext: true, max: 1 });

		const episodes = await client.episodesByFeedIds(result[0].id.toString(), {
			fulltext: true,
			max: 2
		});

		console.log(episodes);

		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should search podcasts', async () => {
		const result = await client.searchFeeds('Fresh Air', { fulltext: true, max: 1 });
		const result2 = await client.episodesByPerson('Maggie Appleton', {
			fulltext: true,
			max: 10
		});
		console.log(JSON.stringify(result, null, 2));
		// console.log(result2);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should get feed episodes', async () => {
		const result = await client.episodesByFeedIds(
			'6596894,637281,2138618,5320480,1074603,3240656,522889,1329334,542376,853158,3745116,1052374,5928182,743229,6752757,548735,223113,214340,309699,577105',
			{
				fulltext: true,
				max: 5
			}
		);
		console.log(result);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should get trending podcasts', async () => {
		const result = await client.trending({ max: 2, lang: 'en' });
		console.log(result);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});
});
