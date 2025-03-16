import PodcastIndexClient from '$lib/api/podcast-index';
import type { Episode, Feed } from '$lib/types/db';
import type { FinderRequest, FinderResponse } from '$lib/types/episodeFinder';
import { parseFeedUrl } from '$lib/utils/feedParser';

// Add error handling for the worker itself
self.onerror = (error) => {
	console.error('Worker error:', error);
};

self.onmessage = async (e: MessageEvent<FinderRequest>) => {
	try {
		const { apiKey, apiSecret, feeds, since } = e.data;

		// Validate required inputs
		if (!apiKey || !apiSecret || !feeds) {
			throw new Error('Missing required parameters: apiKey, apiSecret, or feeds');
		}

		const errors: string[] = [];
		const podcastIndexClient = new PodcastIndexClient(apiKey, apiSecret);

		const [podcastClientResult, directFeedResult] = await Promise.all([
			fetchPodcastClientEpisodes(podcastIndexClient, feeds, since),
			fetchDirectFeedEpisodes(feeds, since)
		]);

		errors.push(...podcastClientResult.errors, ...directFeedResult.errors);

		// episodes = podcast client episodes + missing direct episodes, using url to cross-check
		const episodes: Episode[] = [
			...podcastClientResult.episodes,
			...directFeedResult.episodes.filter(
				(x) => !podcastClientResult.episodes.some((y) => x.url === y.url)
			)
		];

		const response: FinderResponse = {
			episodes,
			errors
		};

		self.postMessage(response);
	} catch (error) {
		console.error('Worker message handler error:', error);
		self.postMessage({
			episodes: [],
			errors: [`Worker error: ${error instanceof Error ? error.message : 'Unknown error'}`]
		});
	}
};

async function fetchPodcastClientEpisodes(
	client: PodcastIndexClient,
	feeds: Feed[],
	since?: number
): Promise<{ episodes: Episode[]; errors: string[] }> {
	const errors: string[] = [];
	let episodes: Episode[] = [];

	try {
		const feedIdsStr = feeds.map((x) => x.id).join(',');
		const items = await client
			.episodesByFeedIds(feedIdsStr, { max: 1000, since })
			.then((res) => res.items);

		episodes = items.map(
			(episode): Episode => ({
				id: episode.id.toString(),
				feedId: episode.feedId.toString(),
				title: episode.title,
				publishedAt: new Date(episode.datePublished * 1000),
				content: episode.description,
				url: episode.enclosureUrl,
				durationMin: Math.floor(episode.duration / 60)
			})
		);
	} catch (error) {
		errors.push(
			`Failed to fetch episodes from Podcast Index: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	return { episodes, errors };
}

async function fetchDirectFeedEpisodes(
	feeds: Feed[],
	since?: number
): Promise<{ episodes: Episode[]; errors: string[] }> {
	const errors: string[] = [];
	let episodes: Episode[] = [];

	for (const feed of feeds) {
		try {
			const parsedEpisodes = await parseFeedUrl(feed.id, feed.url, since);
			episodes = [...episodes, ...parsedEpisodes];
		} catch (error) {
			errors.push(
				`Failed to fetch episodes for feed ${feed.title} (${feed.url}): ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}

	return { episodes, errors };
}
