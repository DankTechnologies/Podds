import type { Episode, Feed } from '$lib/types/db';
import type { EpisodeFinderRequest, EpisodeFinderResponse } from '$lib/types/episodeFinder';
import { parseFeedUrl } from '$lib/utils/feedParser';

const FEED_TIMEOUT_MS = 30000; // 30 seconds per feed

// Add error handling for the worker itself
self.onerror = (error) => {
	console.error('Worker error:', error);
};

self.onmessage = async (e: MessageEvent<EpisodeFinderRequest>) => {
	try {
		const { feeds, since } = e.data;

		let updatedFeeds: Feed[] = [];
		let newEpisodes: Episode[] = [];
		let errors: string[] = [];

		// Validate required inputs
		if (!feeds) {
			throw new Error('Missing required parameters: feeds');
		}

		for (const feed of feeds) {
			const result = await fetchFeedWithTimeout(feed, since);

			updatedFeeds.push(result.feed);
			newEpisodes = [...newEpisodes, ...result.episodes];
			errors = [...errors, ...result.errors];
		}

		const response: EpisodeFinderResponse = {
			episodes: newEpisodes,
			feeds: updatedFeeds,
			errors: errors
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

async function fetchFeedWithTimeout(feed: Feed, since?: number): Promise<{
	episodes: Episode[];
	feed: Feed;
	errors: string[];
}> {
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error(`Feed ${feed.title} fetch timed out after ${FEED_TIMEOUT_MS / 1000}s`)), FEED_TIMEOUT_MS)
	);

	try {
		// Check if we should skip this feed based on TTL
		if (feed.lastCheckedAt && feed.ttlMinutes) {
			const minutesSinceLastCheck = (new Date().getTime() - feed.lastCheckedAt.getTime()) / 60000; // Convert to minutes
			if (minutesSinceLastCheck < feed.ttlMinutes) {
				return {
					episodes: [],
					feed: feed,
					errors: []
				};
			}
		}

		const updatedFeed = { ...feed };
		updatedFeed.lastCheckedAt = new Date();

		// Prepare headers for conditional fetch
		const headers: Record<string, string> = {};

		if (feed.lastModified) {
			headers['If-Modified-Since'] = feed.lastModified.toUTCString();
		}

		const resultPromise = parseFeedUrl(feed.id, feed.url, since, headers).then(
			(result) => {

				if (result.status === 200) {
					updatedFeed.lastSyncedAt = new Date();

					if (result.lastModified) {
						updatedFeed.lastModified = new Date(result.lastModified);
					}
					// Update TTL if provided in feed
					if (result.ttlMinutes) {
						updatedFeed.ttlMinutes = result.ttlMinutes;
					}
				}

				return {
					episodes: result.episodes,
					feed: updatedFeed,
					errors: []
				};
			}
		);

		const result = await Promise.race([resultPromise, timeoutPromise]);
		return result;
	} catch (error) {
		return {
			episodes: [],
			feed: feed, // Return original feed without updating lastCheckedAt
			errors: [
				`Failed to fetch episodes for feed ${feed.title} (${feed.url}): ${error instanceof Error ? error.message : 'Unknown error'}`
			]
		};
	}
}