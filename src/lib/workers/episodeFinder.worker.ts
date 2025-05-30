import type { Episode, Feed } from '$lib/types/db';
import type { EpisodeFinderRequest, EpisodeFinderResponse } from '$lib/types/episodeFinder';
import { parseFeedUrl } from '$lib/utils/feedParser';

const FEED_TIMEOUT_MS = 5000;
const BATCH_SIZE = 15;

// Add error handling for the worker itself
self.onerror = (error) => {
	self.postMessage({
		episodes: [],
		feeds: [],
		errors: [`Worker fatal error: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`]
	});
};

self.onmessage = async (e: MessageEvent<EpisodeFinderRequest>) => {
	try {
		const { feeds, since, corsHelper, corsHelper2 } = e.data;

		// Process feeds in batches
		const results: Array<{
			episodes: Episode[];
			feed: Feed;
			errors: string[];
		}> = [];

		for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
			const batch = feeds.slice(i, i + BATCH_SIZE);
			const batchResults = await Promise.all(
				batch.map(feed => fetchFeedWithTimeout(feed, corsHelper, corsHelper2, since))
			);
			results.push(...batchResults);
		}

		const response: EpisodeFinderResponse = {
			episodes: results.flatMap(r => r.episodes),
			feeds: results.map(r => r.feed),
			errors: results.flatMap(r => r.errors)
		};

		self.postMessage(response);
	} catch (error) {
		console.error('Worker message handler error:', error);
		self.postMessage({
			episodes: [],
			feeds: [],
			errors: [`Worker error: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`]
		});
	}
};

// Add unhandled rejection handler
self.onunhandledrejection = (event) => {
	console.error('Unhandled promise rejection:', event.reason);
	self.postMessage({
		episodes: [],
		feeds: [],
		errors: [`Unhandled promise rejection: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}`]
	} as EpisodeFinderResponse);
};

async function fetchFeedWithTimeout(feed: Feed, corsHelper: string, corsHelper2: string | undefined, since?: number): Promise<{
	episodes: Episode[];
	feed: Feed;
	errors: string[];
}> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

	try {
		// Check if we should skip this feed based on TTL
		if (feed.lastCheckedAt && feed.ttlMinutes) {
			const minutesSinceLastCheck = (new Date().getTime() - feed.lastCheckedAt.getTime()) / 60000; // Convert to minutes
			if (minutesSinceLastCheck < feed.ttlMinutes) {
				clearTimeout(timeoutId);
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

		const result = await parseFeedUrl(feed.id, feed.url, corsHelper, corsHelper2, since, headers, controller.signal);

		if (result.status === 200) {
			updatedFeed.lastSyncedAt = new Date();

			if (result.lastModified) {
				updatedFeed.lastModified = new Date(result.lastModified);
			}
			// Update TTL if provided in feed
			if (result.ttlMinutes) {
				updatedFeed.ttlMinutes = result.ttlMinutes;
			}

			if (result.description) {
				updatedFeed.description = result.description;
			}

			if (result.link) {
				updatedFeed.link = result.link;
			}

			if (result.author) {
				updatedFeed.author = result.author;
			}

			if (result.ownerName) {
				updatedFeed.ownerName = result.ownerName;
			}
		}

		clearTimeout(timeoutId);
		return {
			episodes: result.episodes,
			feed: updatedFeed,
			errors: []
		};
	} catch (error) {
		clearTimeout(timeoutId);
		return {
			episodes: [],
			feed: feed, // Return original feed without updating lastCheckedAt
			errors: [
				`Failed to fetch episodes for feed ${feed.title} (${feed.url}): ${error instanceof Error ? `${error.message} - ${error.stack}` : 'Unknown error'}`
			]
		};
	}
}