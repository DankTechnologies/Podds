import PodcastIndexClient from '$lib/api/podcast-index';
import { db, getFeeds, getSettings } from '$lib/stores/db.svelte';
import type { Episode } from '$lib/types/db';
import type { PIApiFeed } from '$lib/types/podcast-index';
import { resizeBase64Image } from '$lib/utils/resizeImage';
import { Log } from './LogService';
import { SettingsService } from './SettingsService.svelte';
import { parseFeedUrl } from '$lib/utils/feedParser';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;
const CHECK_INTERVAL_MS = 60 * 1000;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

export class FeedService {
	private api: PodcastIndexClient | null = null;
	private initialized = false;

	constructor(apiKey?: string, apiSecret?: string) {
		if (apiKey && apiSecret) {
			this.api = new PodcastIndexClient(apiKey, apiSecret);
			this.initialized = true;
		}
	}

	private async initialize() {
		if (this.initialized) return;

		let settings = getSettings();
		if (!settings?.podcastIndexKey || !settings?.podcastIndexSecret) {
			throw new Error('Podcast Index credentials not found');
		}

		this.api = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
		this.initialized = true;
	}

	async updateAllFeeds() {
		try {
			let settings = getSettings();
			let feeds = getFeeds();
			const feedIds = feeds.map((feed) => feed.id);

			if (!settings) {
				Log.warn('Settings not found, skipping update');
				return;
			}

			if (feeds.length === 0) {
				Log.warn('No feeds found, skipping update');
				return;
			}

			const timestampNow = Math.floor(Date.now() / 1000);

			const timestampLastSync = settings.lastSyncAt
				? Math.floor(new Date(settings.lastSyncAt).getTime() / 1000)
				: timestampNow - ONE_DAY_IN_SECONDS;

			const lastSyncAtSeconds = timestampNow - timestampLastSync;
			if (lastSyncAtSeconds < settings.syncIntervalMinutes * 60) {
				const minutes = Math.floor(lastSyncAtSeconds / 60);
				const seconds = lastSyncAtSeconds % 60;
				Log.debug(`Last sync was ${minutes}m${seconds}s ago, skipping update`);
				return;
			}

			// 'since' filters on datePublished rather than dateCrawled
			// so we need to subtract a day to ensure we get all episodes
			const since = timestampLastSync - ONE_DAY_IN_SECONDS;

			Log.info('Starting update of all feeds');

			await this.updateFeedEpisodes(feedIds.join(','), since);

			for (const feed of feeds) {
				Log.info(`Updating feed ${feed.title} directly`);
				await this.updateFeedEpisodesDirect(feed, since);
			}

			SettingsService.updateLastSyncAt();

			Log.info('Finished update of all feeds');
		} catch (error) {
			const errorMessage =
				error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
			Log.error(`Error updating all feeds: ${errorMessage}`);
		}
	}

	async updateFeedEpisodes(feedIds: string, since?: number): Promise<void> {
		await this.initialize();

		Log.debug(`Updating episodes for feed ${feedIds}`);

		const episodes = (
			await this.api!.episodesByFeedIds(feedIds, { max: 1000, since }).then((res) => res.items)
		).map(
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

		Log.info(`${episodes.length} episodes found since ${since}`);

		if (episodes.length === 0) {
			return;
		}

		if (since) {
			db.episodes.batch(() => {
				episodes.forEach((x) => {
					const match = db.episodes.findOne({ id: x.id });

					if (!match) {
						Log.info(`Adding ${x.title}`);
						db.episodes.insert(x);
					}
				});
			});
		} else {
			db.episodes.insertMany(episodes);
		}
	}

	private async updateFeedEpisodesDirect(feed: { id: string; url: string }, since?: number) {
		try {
			const parsedEpisodes = await parseFeedUrl(feed.id, feed.url, since);
			const dbEpisodes = db.episodes.find({ feedId: feed.id }).fetch();

			Log.info(`${parsedEpisodes.length} episodes found since ${since} (direct)`);

			parsedEpisodes.forEach((episode) => {
				const match = dbEpisodes.find((x) => x.title === episode.title);
				if (!match) {
					Log.info(`Adding ${episode.title} (direct)`);
					db.episodes.insert(episode);
				}
			});
		} catch (error) {
			Log.error(`Error processing feed ${feed.id}: ${error}`);
		}
	}

	// delete feed

	addFeed(feed: PIApiFeed, iconData: string) {
		db.feeds.insert({
			id: feed.id.toString(),
			url: feed.url,
			title: feed.title,
			iconData: iconData,
			lastUpdatedAt: new Date()
		});

		this.updateFeedEpisodes(feed.id.toString());
	}

	exportFeeds(): string {
		const feeds = db.feeds.find({}).fetch();
		return feeds.map((feed) => feed.id).join(',');
	}

	async importFeeds(feedIds: string): Promise<void> {
		await this.initialize();

		const ids = feedIds.split(',').map((id) => id.trim());

		for (const id of ids) {
			try {
				const response = await this.api!.podcastById(Number(id));

				const imageUrl = response.feed.image || response.feed.artwork;

				const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(imageUrl)}`;
				const iconData = await resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT);

				this.addFeed(response.feed, iconData);
				Log.info(`Imported feed: ${response.feed.title}`);
			} catch (error) {
				Log.error(`Error importing feed ${id}: ${error}`);
			}
		}
	}

	startPeriodicUpdates() {
		Log.debug('Starting registering periodic updates');
		const sync = async () => {
			await this.updateAllFeeds();
		};

		// Delay first sync by 1 second
		setTimeout(sync, 1000);

		setInterval(sync, CHECK_INTERVAL_MS);
	}
}
