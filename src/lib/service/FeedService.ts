import PodcastIndexClient from '$lib/api/podcast-index';
import { db, getFeeds, getSettings } from '$lib/stores/db.svelte';
import type { FinderRequest, FinderResponse } from '$lib/types/episodeFinder';
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

		const finderRequest: FinderRequest = {
			feeds,
			since
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		finderResponse.errors.forEach((x) => Log.error(x));

		Log.debug(`Found ${finderResponse.episodes.length} episodes during sync`);

		finderResponse.episodes.forEach((x) => {
			const match = db.episodes.findOne({ url: x.url });

			if (!match) {
				Log.info(`Adding ${x.title}`);
				db.episodes.insert(x);
			}
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

	async addFeed(feed: PIApiFeed, iconData: string) {
		Log.info(`Adding feed: ${feed.title}`);

		const newFeed = {
			id: feed.id.toString(),
			url: feed.url,
			title: feed.title,
			iconData: iconData,
			lastUpdatedAt: new Date()
		};

		db.feeds.insert(newFeed);

		const finderRequest: FinderRequest = {
			feeds: [newFeed],
			since: undefined
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		finderResponse.errors.forEach((x) => Log.error(x));

		db.episodes.insertMany(finderResponse.episodes);

		Log.info(`Finished adding ${feed.title}`);
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
		await this.initialize();

		const ids = feedIds.split(',').map((id) => id.trim());

		for (const id of ids) {
			try {
				const response = await this.api!.podcastById(Number(id));

				const iconData = await this.resizeImage(response.feed);

				await this.addFeed(response.feed, iconData);
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

	private async initialize() {
		if (this.initialized) return;

		let settings = getSettings();
		if (!settings?.podcastIndexKey || !settings?.podcastIndexSecret) {
			throw new Error('Podcast Index credentials not found');
		}

		this.api = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
		this.initialized = true;
	}

	private async runEpisodeFinder(request: FinderRequest): Promise<FinderResponse> {
		const worker = new Worker(new URL('../workers/episodeFinder.worker.ts', import.meta.url), {
			type: 'module'
		});

		try {
			const response = await new Promise<FinderResponse>((resolve, reject) => {
				worker.onmessage = (event) => resolve(event.data);
				worker.onerror = (error) => reject(error);
				worker.postMessage(request);
			});

			return response;
		} finally {
			worker.terminate();
		}
	}

	private async resizeImage(feed: PIApiFeed): Promise<string> {
		const imageUrl = feed.image || feed.artwork;
		const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(imageUrl)}`;
		return await resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT);
	}
}
