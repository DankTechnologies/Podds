import type { Episode, Feed } from '$lib/types/db';
import type { FinderRequest, FinderResponse } from '$lib/types/episodeFinder';
import { parseFeedUrl } from '$lib/utils/feedParser';

// Add error handling for the worker itself
self.onerror = (error) => {
	console.error('Worker error:', error);
};

self.onmessage = async (e: MessageEvent<FinderRequest>) => {
	try {
		const { feeds, since } = e.data;

		// Validate required inputs
		if (!feeds) {
			throw new Error('Missing required parameters: feeds');
		}

		const result = await fetchFeedEpisodes(feeds, since);

		const response: FinderResponse = {
			episodes: result.episodes,
			errors: result.errors
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

async function fetchFeedEpisodes(
	feeds: Feed[],
	since?: number
): Promise<{ episodes: Episode[]; errors: string[] }> {
	const results = await Promise.all(
		feeds.map(async (feed) => {
			try {
				const parsedEpisodes = await parseFeedUrl(feed.id, feed.url, since);
				return {
					episodes: parsedEpisodes,
					errors: [] as string[]
				};
			} catch (error) {
				return {
					episodes: [] as Episode[],
					errors: [
						`Failed to fetch episodes for feed ${feed.title} (${feed.url}): ${error instanceof Error ? error.message : 'Unknown error'
						}`
					]
				};
			}
		})
	);

	return results.reduce(
		(acc, result) => ({
			episodes: [...acc.episodes, ...result.episodes],
			errors: [...acc.errors, ...result.errors]
		}),
		{ episodes: [], errors: [] }
	);
}
