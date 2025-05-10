import PodcastIndexClient from '$lib/api/podcast-index';
import { db, getFeeds, getSettings } from '$lib/stores/db.svelte';
import type { Episode, Feed } from '$lib/types/db';
import type { EpisodeFinderRequest, EpisodeFinderResponse } from '$lib/types/episodeFinder';
import type { PIApiFeed } from '$lib/types/podcast-index';
import { resizeBase64Image } from '$lib/utils/resizeImage';
import { decodeHtmlEntities, encodeHtmlEntities } from '$lib/utils/feedParser';
import { Log } from './LogService';
import { SettingsService } from './SettingsService.svelte';
import type { ImportProgress } from '$lib/types/ImportProgress';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;
const CHECK_INTERVAL_MS = 60 * 1000;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
const FEED_TIMEOUT_MS = 10000; // Added for the new importFeeds method

export class FeedService {
	private api: PodcastIndexClient | null = null;
	private initialized = false;
	isUpdating = $state(false);

	constructor(apiKey?: string, apiSecret?: string) {
		if (apiKey && apiSecret) {
			this.api = new PodcastIndexClient(apiKey, apiSecret);
			this.initialized = true;
		}
	}

	async updateEmptyFeed(feed: Feed): Promise<boolean> {
		const settings = getSettings();

		try {
			const finderRequest: EpisodeFinderRequest = {
				feeds: [feed],
				since: undefined,
				corsHelper: settings!.corsHelper,
				corsHelper2: settings!.corsHelper2
			};

			const finderResponse = await this.runEpisodeFinder(finderRequest);

			if (finderResponse.episodes.length > 0) {
				db.episodes.insertMany(finderResponse.episodes);
				finderResponse.errors.forEach((x) => Log.debug(x));
				return true;
			}

			Log.error(`Failed to add episodes for ${feed.title}`);
			finderResponse.errors.forEach((x) => Log.error(x));
			return false;
		} catch (e) {
			Log.error(`Error updating feed ${feed.title}: ${e instanceof Error ? e.message : String(e)}`);
			return false;
		}
	}

	async updateAllFeeds() {
		const settings = getSettings();
		const feeds = getFeeds();

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
			Log.debug(`Last feed sync was ${minutes}m${seconds}s ago, skipping update`);
			return;
		}

		// 'since' filters on datePublished rather than dateCrawled
		// so we need to subtract a day to ensure we get all episodes
		const since = timestampLastSync - ONE_DAY_IN_SECONDS;

		Log.info('Starting update of all feeds');

		const finderRequest: EpisodeFinderRequest = {
			feeds,
			since,
			corsHelper: settings.corsHelper,
			corsHelper2: settings.corsHelper2
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

	async addFeed(feed: PIApiFeed, iconData: string): Promise<boolean> {
		Log.info(`Adding feed: ${feed.title}`);

		const settings = getSettings();

		try {
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

			const finderRequest: EpisodeFinderRequest = {
				feeds: [newFeed],
				since: undefined,
				corsHelper: settings!.corsHelper,
				corsHelper2: settings!.corsHelper2
			};

			const finderResponse = await this.runEpisodeFinder(finderRequest);

			const feedWithTimestamps = {
				...newFeed,
				lastCheckedAt: finderResponse.feeds[0].lastCheckedAt,
				lastSyncedAt: finderResponse.feeds[0].lastSyncedAt,
				lastModified: finderResponse.feeds[0].lastModified,
				ttlMinutes: finderResponse.feeds[0].ttlMinutes
			};

			db.feeds.insert(feedWithTimestamps);

			// feeds can be retried from feed page 
			if (finderResponse.episodes.length > 0) {
				db.episodes.insertMany(finderResponse.episodes);

				finderResponse.errors.forEach((x) => Log.debug(x));

				Log.info(`Finished adding ${feed.title}`);
				return true;
			}

			Log.error(`Failed to add episodes for ${feed.title}`);
			finderResponse.errors.forEach((x) => Log.error(x));
			return false;
		}
		catch (e) {
			Log.error(`Error adding feed ${feed.title}: ${e instanceof Error ? e.message : String(e)}`);
			return false;
		}
	}

	async addFeeds(feeds: { feed: PIApiFeed; iconData: string }[]): Promise<void> {
		if (feeds.length === 0) return;

		const settings = getSettings();

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
			since: undefined,
			corsHelper: settings!.corsHelper,
			corsHelper2: settings!.corsHelper2
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		finderResponse.errors.forEach((x) => Log.error(x));

		// avoids 'item with id already exists' error during large imports
		for (let i = 0; i < finderResponse.episodes.length; i += 1000) {
			Log.debug(`Inserting episodes - batch ${i}`);
			const batch = finderResponse.episodes.slice(i, i + 1000);
			db.episodes.insertMany(batch);
		}

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
		const opml = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<opml version="1.0">
  <head>
    <title>Podds (podds.io)</title>
  </head>
  <body>
    <outline text="feeds">
${feeds.map(feed => `      <outline type="rss" text="${encodeHtmlEntities(feed.title)}" xmlUrl="${encodeHtmlEntities(feed.url)}" />`).join('\n')}
    </outline>
  </body>
</opml>`;

		const blob = new Blob([opml], { type: 'application/xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const date = new Date().toISOString().split('T')[0];
		const filename = `podds-${date}-opml.txt`;		// safari no like .opml...
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		return filename;
	}

	async importFeeds(opmlContent: string, onProgress?: (progress: ImportProgress) => void): Promise<void> {
		try {
			this.isUpdating = true;
			await this.initialize();

			const existingFeeds = db.feeds.find({}).fetch();

			const parser = new DOMParser();
			const doc = parser.parseFromString(opmlContent, 'text/xml');
			// Get all outlines that are direct children of the parent outline
			const outlines = doc.querySelectorAll('outline[type="rss"]');

			if (outlines.length === 0) {
				onProgress?.({ current: '', success: 0, total: 0, failed: [], skipped: 0 });
				return;
			}

			const validFeeds: { feed: PIApiFeed; iconData: string }[] = [];
			let processedCount = 0;
			const totalFeeds = outlines.length;
			const processedUrls = new Set<string>(); // Track unique URLs
			const failedFeeds: string[] = [];
			let skippedCount = 0;

			Log.info(`Starting import of ${totalFeeds} feeds`);

			for (const outline of outlines) {
				let url: string | null = null;
				let title: string | null = null;

				try {
					processedCount++;
					url = outline.getAttribute('xmlUrl');
					title = outline.getAttribute('text');
					if (!url) continue;

					url = decodeHtmlEntities(url);

					// Skip if we've already processed this URL
					if (processedUrls.has(url)) {
						Log.warn(`${title} is a duplicate, skipping`);
						skippedCount++;
						continue;
					}
					processedUrls.add(url);

					if (existingFeeds.find(f => f.url === url || f.title?.toLowerCase() === title?.toLowerCase())) {
						Log.warn(`${title} already exists, skipping`);
						skippedCount++;
						continue;
					}

					onProgress?.({
						current: title || url,
						success: validFeeds.length,
						total: totalFeeds,
						failed: failedFeeds,
						skipped: skippedCount
					});

					Log.info(`Processing feed ${processedCount}/${totalFeeds}: ${url}`);

					const processFeed = async () => {
						const response = await this.api!.podcastByFeedUrl(url!);
						const iconData = await this.resizeImage(response.feed);
						return { feed: response.feed, iconData };
					};

					const timeoutPromise = new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Feed processing timeout')), FEED_TIMEOUT_MS)
					);

					const result = await Promise.race([processFeed(), timeoutPromise]);
					validFeeds.push(result as { feed: PIApiFeed; iconData: string });

					Log.info(`Successfully processed feed ${url}`);
				} catch (error) {
					Log.error(`Error processing feed ${title}: ${error instanceof Error ? error.message : String(error)}`);
					failedFeeds.push(title || 'Unknown');
					continue;
				}
			}

			if (validFeeds.length > 0) {
				Log.info(`Successfully processed ${validFeeds.length}/${totalFeeds} feeds`);
				await this.addFeeds(validFeeds);
				SettingsService.updateLastSyncAt();
			} else {
				Log.warn('No valid feeds were processed');
			}

			onProgress?.({
				current: '',
				success: validFeeds.length,
				total: totalFeeds,
				failed: failedFeeds,
				skipped: skippedCount
			});
		} catch (error) {
			Log.error(`Error importing feeds: ${error instanceof Error ? error.message : String(error)}`);
			onProgress?.({ current: '', success: 0, total: 0, failed: [], skipped: 0 });
		} finally {
			this.isUpdating = false;
		}
	}

	startPeriodicUpdates() {
		Log.debug('Starting registering periodic feed updates');
		let lastCheckTime = 0;

		const sync = async () => {
			if (this.isUpdating) {
				Log.warn('Skipping updates due to active update');
				return;
			}

			try {
				this.isUpdating = true;
				await this.updateAllFeeds();
				lastCheckTime = Date.now();
			} finally {
				this.isUpdating = false;
			}
		};

		// Handle visibility changes
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				// If it's been more than 1 minute since last check, run it now
				if (Date.now() - lastCheckTime > CHECK_INTERVAL_MS) {
					Log.debug('App became visible, running feed update');
					sync();
				}
			}
		});

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
		const settings = getSettings();
		const imageUrl = feed.image || feed.artwork;
		return await resizeBase64Image(imageUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT, settings!.corsHelper, settings!.corsHelper2, feed.title);
	}
}
