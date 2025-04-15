import PodcastIndexClient from '$lib/api/podcast-index';
import { db, getFeeds, getSettings } from '$lib/stores/db.svelte';
import type { Episode, Feed } from '$lib/types/db';
import type { EpisodeFinderRequest, EpisodeFinderResponse } from '$lib/types/episodeFinder';
import type { PIApiFeed } from '$lib/types/podcast-index';
import { resizeBase64Image } from '$lib/utils/resizeImage';
import { Log } from './LogService';
import { SettingsService } from './SettingsService.svelte';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;
const CHECK_INTERVAL_MS = 60 * 1000;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

export class FeedService {
	private api: PodcastIndexClient | null = null;
	private initialized = false;
	private isUpdating = false;

	constructor(apiKey?: string, apiSecret?: string) {
		if (apiKey && apiSecret) {
			this.api = new PodcastIndexClient(apiKey, apiSecret);
			this.initialized = true;
		}
	}

	async updateAllFeeds() {
		let settings = getSettings();
		let feeds = getFeeds();

		if (!settings) {
			Log.warn('Settings not found, skipping update');
			return;
		}

		if (feeds.length === 0) {
			Log.warn('No feeds found, skipping update');
			return;
		}

		const timestampNow = Math.floor(Date.now() / 1000);

		const timestampLastSync = Math.floor(new Date(settings.lastSyncAt).getTime() / 1000);

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

		const finderRequest: EpisodeFinderRequest = {
			feeds,
			since
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		finderResponse.errors.forEach((x) => Log.error(x));

		Log.debug(`Found ${finderResponse.episodes.length} episodes during sync`);

		finderResponse.episodes.forEach((x) => {
			try {
				// episode id (guid) isn't supposed to change but it does in practice on some feeds
				// url is more reliable
				const match = db.episodes.findOne({ url: x.url });

				if (!match) {
					Log.info(`Adding ${x.title}`);
					db.episodes.insert(x);
				}
			} catch (error) {
				Log.error(`Error adding episode ${x.title}: ${error instanceof Error ? error.message : String(error)}`);
			}
		});

		db.feeds.batch(() => {
			finderResponse.feeds.forEach((x) => {
				db.feeds.updateOne({ id: x.id }, {
					$set: {
						lastCheckedAt: x.lastCheckedAt,
						lastSyncedAt: x.lastSyncedAt,
						lastModified: x.lastModified,
						ttlMinutes: x.ttlMinutes
					}
				});
			});
		});

		SettingsService.updateLastSyncAt();

		Log.info('Finished update of all feeds');
	}

	async addFeedById(feedId: string, iconData?: string) {
		await this.initialize();

		const feed = await this.api!.podcastById(Number(feedId));

		if (!iconData) {
			iconData = await this.resizeImage(feed.feed);
		}

		if (feed) {
			this.addFeed(feed.feed, iconData);
		}
	}

	addFeedAndEpisodes(feed: Feed, episodes: Episode[]) {
		Log.info(`Adding feed: ${feed.title}`);

		db.feeds.insert(feed);
		db.episodes.insertMany(episodes);

		Log.info(`Finished adding ${feed.title}`);
	}

	async addFeed(feed: PIApiFeed, iconData: string) {
		Log.info(`Adding feed: ${feed.title}`);

		const newFeed = {
			id: feed.id.toString(),
			url: feed.url,
			title: feed.title,
			description: feed.description,
			author: feed.author,
			ownerName: feed.ownerName,
			link: feed.link,
			iconData: iconData,
			lastUpdatedAt: new Date(),
			categories: Object.values(feed.categories || {})
		};

		db.feeds.insert(newFeed);

		const finderRequest: EpisodeFinderRequest = {
			feeds: [newFeed],
			since: undefined
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		finderResponse.errors.forEach((x) => Log.error(x));

		db.episodes.insertMany(finderResponse.episodes);

		db.feeds.batch(() => {
			finderResponse.feeds.forEach((x) => {
				db.feeds.updateOne({ id: x.id }, {
					$set: {
						lastCheckedAt: x.lastCheckedAt,
						lastSyncedAt: x.lastSyncedAt,
						lastModified: x.lastModified,
						ttlMinutes: x.ttlMinutes
					}
				});
			});
		});

		Log.info(`Finished adding ${feed.title}`);
	}

	async addFeeds(feeds: { feed: PIApiFeed; iconData: string }[]): Promise<void> {
		if (feeds.length === 0) return;

		Log.info(`Adding ${feeds.length} feeds`);

		const newFeeds = feeds.map(({ feed, iconData }): Feed => ({
			id: feed.id.toString(),
			url: feed.url,
			title: feed.title,
			description: feed.description,
			author: feed.author,
			ownerName: feed.ownerName,
			link: feed.link,
			iconData: iconData,
			categories: Object.values(feed.categories || {})
		}));

		db.feeds.insertMany(newFeeds);

		const finderRequest: EpisodeFinderRequest = {
			feeds: newFeeds,
			since: undefined
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		finderResponse.errors.forEach((x) => Log.error(x));

		db.episodes.insertMany(finderResponse.episodes);

		db.feeds.batch(() => {
			finderResponse.feeds.forEach((x) => {
				db.feeds.updateOne({ id: x.id }, {
					$set: {
						lastCheckedAt: x.lastCheckedAt,
						lastSyncedAt: x.lastSyncedAt,
						lastModified: x.lastModified,
						ttlMinutes: x.ttlMinutes
					}
				});
			});
		});

		Log.info(`Finished adding ${feeds.length} feeds`);
	}

	deleteFeed(feedId: string) {
		Log.info(`Starting deletion of feed ${feedId}`);
		db.episodes.removeMany({ feedId: feedId });
		db.activeEpisodes.removeMany({ feedId: feedId });
		db.feeds.removeOne({ id: feedId });
		Log.info(`Finished deletion of feed ${feedId}`);
	}

	exportFeeds(): string {
		const feeds = db.feeds.find({}).fetch();
		return feeds.map((feed) => feed.id).join(',');
	}

	async importFeeds(feedIds: string): Promise<void> {
		try {
			this.isUpdating = true;

			await this.initialize();

			const ids = feedIds.split(',').map((id) => id.trim());
			const FEED_TIMEOUT_MS = 10000; // 10 seconds per feed
			const validFeeds: { feed: PIApiFeed; iconData: string }[] = [];
			let processedCount = 0;

			Log.info(`Starting import of ${ids.length} feeds`);

			for (const id of ids) {
				try {
					processedCount++;
					Log.info(`Processing feed ${processedCount}/${ids.length}: ${id}`);

					const processFeed = async () => {
						const response = await this.api!.podcastById(Number(id));
						const iconData = await this.resizeImage(response.feed);
						return { feed: response.feed, iconData };
					};

					const timeoutPromise = new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Feed processing timeout')), FEED_TIMEOUT_MS)
					);

					const result = await Promise.race([processFeed(), timeoutPromise]);
					validFeeds.push(result as { feed: PIApiFeed; iconData: string });

					Log.info(`Successfully processed feed ${id}`);
				} catch (error) {
					Log.error(`Error processing feed ${id}: ${error instanceof Error ? error.message : String(error)}`);
					continue; // Continue with next feed even if this one failed
				}
			}

			if (validFeeds.length > 0) {
				Log.info(`Successfully processed ${validFeeds.length}/${ids.length} feeds`);
				await this.addFeeds(validFeeds);

				SettingsService.updateLastSyncAt();
			} else {
				Log.warn('No valid feeds were processed');
			}
		} finally {
			this.isUpdating = false;
		}
	}

	startPeriodicUpdates() {
		Log.debug('Starting registering periodic updates');
		const sync = async () => {
			if (this.isUpdating) {
				Log.warn('Skipping updates due to active update');
				return;
			}

			try {
				this.isUpdating = true;
				await this.updateAllFeeds();
			} finally {
				this.isUpdating = false;
			}
		};

		// Delay first sync by 1 second
		setTimeout(sync, 1000);

		setInterval(sync, CHECK_INTERVAL_MS);
	}

	async runEpisodeFinder(request: EpisodeFinderRequest): Promise<EpisodeFinderResponse> {
		const worker = new Worker(new URL('../workers/episodeFinder.worker.ts', import.meta.url), {
			type: 'module'
		});

		try {
			const response = await new Promise<EpisodeFinderResponse>((resolve, reject) => {
				worker.onmessage = (event) => resolve(event.data);
				worker.onerror = (error) => reject(error);
				worker.postMessage(request);
			});

			return response;
		} finally {
			worker.terminate();
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

	private async resizeImage(feed: PIApiFeed): Promise<string> {
		const imageUrl = feed.image || feed.artwork;
		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(imageUrl)}`;
		return await resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT);
	}
}
