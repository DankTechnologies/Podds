import type { Episode, Feed } from '$lib/types/db';
import type { EpisodeFinderRequest, EpisodeFinderResponse } from '$lib/types/episodeFinder';
import { parseFeedUrl } from '$lib/utils/feedParser';

// Add error handling for the worker itself
self.onerror = (error) => {
	console.error('Worker error:', error);
};

const BATCH_SIZE = 5; // Process 5 feeds at a time
const FEED_TIMEOUT_MS = 15000; // 15 seconds per feed (slightly longer than parseFeedUrl's timeout)

async function fetchFeedWithTimeout(feed: Feed, since?: number): Promise<{
	episodes: Episode[];
	errors: string[];
}> {
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('Worker timeout')), FEED_TIMEOUT_MS)
	);

	try {
		const resultPromise = parseFeedUrl(feed.id, feed.url, since).then(
			(episodes) => ({ episodes, errors: [] as string[] })
		);

		const result = await Promise.race([resultPromise, timeoutPromise]);
		return result;
	} catch (error) {
		return {
			episodes: [],
			errors: [
				`Failed to fetch episodes for feed ${feed.title} (${feed.url}): ${error instanceof Error ? error.message : 'Unknown error'
				}`
			]
		};
	}
}

self.onmessage = async (e: MessageEvent<EpisodeFinderRequest>) => {
	try {
		const { feeds, since } = e.data;

		// Validate required inputs
		if (!feeds) {
			throw new Error('Missing required parameters: feeds');
		}

		const result = await fetchFeedEpisodes(feeds, since);

		const response: EpisodeFinderResponse = {
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
	let allEpisodes: Episode[] = [];
	let allErrors: string[] = [];

	// Process feeds in batches
	for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
		const batch = feeds.slice(i, i + BATCH_SIZE);

		const results = await Promise.all(
			batch.map((feed) => fetchFeedWithTimeout(feed, since))
		);

		// Accumulate results from this batch
		const batchResults = results.reduce(
			(acc, result) => ({
				episodes: [...acc.episodes, ...result.episodes],
				errors: [...acc.errors, ...result.errors]
			}),
			{ episodes: [], errors: [] }
		);

		allEpisodes = [...allEpisodes, ...batchResults.episodes];
		allErrors = [...allErrors, ...batchResults.errors];
	}

	return { episodes: allEpisodes, errors: allErrors };
}
