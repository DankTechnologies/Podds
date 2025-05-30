import { describe, it, beforeEach } from 'vitest';
import { PodcastIndexClient } from '../podcast-index';

describe('PodcastIndexClient', () => {
	let client: PodcastIndexClient;

	beforeEach(() => {
		client = new PodcastIndexClient(
			import.meta.env.VITE_PODCAST_INDEX_KEY,
			import.meta.env.VITE_PODCAST_INDEX_SECRET
		);
	});

	it('should get episodes by podcast', async () => {
		const result = await client.searchFeeds('Marketplace', { fulltext: true, max: 1 });

		const episodes = await client.episodesByFeedIds(result[0].id.toString(), {
			fulltext: true,
			max: 2
		});

		console.log(result);
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

	it.only('should get podcast by feed url', async () => {
		const feedUrls = [
			'https://feeds.feedburner.com/dotnetrocks_AAC',
			'https://feeds.npr.org/344098539/podcast.xml',
			'https://feeds.transistor.fm/the-circuit',
			'https://feed.syntax.fm/rss',
			'https://feeds.buzzsprout.com/276133.rss'
		];

		for (const feedUrl of feedUrls) {
			const result = await client.podcastByFeedUrl(feedUrl);
			console.log(result);
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	});

	it('should get feed episodes', async () => {
		const result = await client.episodesByFeedIds(
			'1052374,1074603,1077200,1329334,165630,2138618,214340,223113,309699,318113,3240656,3745116,436511,480976,522613,522889,5320480,542376,548735,555339,561997,577105,5775917,5928182,637281,6574779,6596894,6660056,6752757,7164285,743229,853158,910728',
			{
				fulltext: true,
				max: 1000,
				since: 1741598381
			}
		);
		console.log(result);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should get episode by guid', async () => {
		const feedId = '5199634';
		const episodeGuid = '31adae5a-6193-11ef-9da0-c3f909ee5a87';
		const result = await client.episodeByGuid(feedId, episodeGuid);
		console.log(result);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	it('should get trending podcasts', async () => {
		const result = await client.trending({ max: 2, lang: 'en' });
		console.log(result);
		await new Promise((resolve) => setTimeout(resolve, 100));
	});
});
