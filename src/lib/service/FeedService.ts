import PodcastIndexClient from '$lib/api/podcast-index';
import { db, getAllFeeds, getSettings } from '$lib/stores/db.svelte';
import type { Episode } from '$lib/types/db';
import type { PIApiFeed } from '$lib/types/podcast-index';
import { resizeBase64Image } from '$lib/utils/resizeImage';
import { Log } from './LogService';
import { SettingsService } from './SettingsService.svelte';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

export class FeedService {
	private api: PodcastIndexClient | null = null;
	private initialized = false;

	private async initialize() {
		if (this.initialized) return;

		let settings = getSettings();
		if (!settings || !settings.podcastIndexKey || !settings.podcastIndexSecret) {
			throw new Error('Podcast Index settings not found');
		}

		this.api = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
		this.initialized = true;
	}

	async updateAllFeeds() {
		try {
			let settings = getSettings();

			if (!settings) {
				Log.warn('Settings not found, skipping update');
				return;
			}

			let feedIds = getAllFeeds().map((feed) => feed.id);

			if (feedIds.length === 0) {
				Log.warn('No feeds found, skipping update');
				return;
			}

			const timestampNow = Math.floor(Date.now() / 1000);

			const timestampLastSync = settings.lastSyncAt
				? Math.floor(new Date(settings.lastSyncAt).getTime() / 1000)
				: timestampNow - ONE_DAY_IN_SECONDS;

			if (timestampNow - timestampLastSync < settings.syncIntervalMinutes * 60) {
				return;
			}

			Log.info('Starting update of all feeds');

			await this.updateFeedEpisodes(feedIds.join(','), timestampLastSync);

			SettingsService.updateLastSyncAt();

			Log.info('Finished update of all feeds');
		} catch (error) {
			Log.error(`Error updating all feeds: ${error}`);
		}
	}

	async updateFeedEpisodes(feedIds: string, since?: number): Promise<void> {
		await this.initialize();

		try {
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
					durationMin: Math.floor(episode.duration / 60),
					mime_type: episode.enclosureType,
					size: episode.enclosureLength,
					isDownloaded: 0,
					isPlaying: 0,
					playbackPosition: 0
				})
			);

			if (since) {
				episodes.forEach((x) => {
					const match = db.episodes.findOne({ id: x.id });

					if (match) {
						Log.debug(`Updating ${x.title}`);
						db.episodes.updateOne({ id: x.id }, { $set: { x } });
					} else {
						Log.debug(`Adding ${x.title}`);
						db.episodes.insert(x);
					}
				});
			} else {
				db.episodes.insertMany(episodes);
			}
		} catch (error) {
			Log.error(`Error updating feed: ${error}`);
		}
	}

	// delete feed

	addFeed(feed: PIApiFeed, iconData: string) {
		db.feeds.insert({
			id: feed.id.toString(),
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
		const sync = async () => {
			await this.updateAllFeeds();
		};

		// Delay first sync by 1 second
		setTimeout(sync, 1000);

		setInterval(sync, CHECK_INTERVAL_MS);
	}
}
