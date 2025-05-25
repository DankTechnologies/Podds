import { db, getFeeds, getSettings } from '$lib/stores/db.svelte';
import type { Episode, Feed } from '$lib/types/db';
import type { EpisodeFinderRequest, EpisodeFinderResponse } from '$lib/types/episodeFinder';
import { decodeHtmlEntities, encodeHtmlEntities } from '$lib/utils/feedParser';
import { Log } from './LogService';
import { SettingsService } from './SettingsService.svelte';
import type { ImportProgress } from '$lib/types/ImportProgress';
import { isOnline } from '$lib/utils/networkState.svelte';
import { findPodcastByTitleAndUrl } from '$lib/api/itunes';

const CHECK_INTERVAL_MS = 60 * 1000;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

export const EpisodeUpdate = $state({
	isUpdating: false,
	hasNewEpisodes: false
});


export class FeedService {
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
			Log.error(`Error updating feed ${feed.title}: ${e instanceof Error ? `${e.message} - ${e.stack}` : String(e)}`);
			return false;
		}
	}

	async updateAllFeeds() {
		const settings = getSettings();
		const feeds = getFeeds().filter((x) => x.isSubscribed);

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

		Log.debug('Start updating subscribed feeds...');

		const finderRequest: EpisodeFinderRequest = {
			feeds,
			since,
			corsHelper: settings.corsHelper,
			corsHelper2: settings.corsHelper2
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		Log.debug(`Found ${finderResponse.episodes.length} episodes during sync`);

		finderResponse.episodes.forEach((x) => {
			try {
				const match = db.episodes.findOne({ id: x.id });

				if (!match) {
					Log.info(`Adding ${x.title}`);
					db.episodes.insert(x);

					if (window.location.pathname !== '/new-episodes') {
						EpisodeUpdate.hasNewEpisodes = true;
					}
				}
			} catch (error) {
				Log.error(`Error adding episode ${x.title}: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`);
			}
		});

		db.feeds.batch(() => {
			finderResponse.feeds.forEach((x) => {
				db.feeds.updateOne({ id: x.id }, {
					$set: {
						lastCheckedAt: x.lastCheckedAt,
						lastSyncedAt: x.lastSyncedAt,
						lastModified: x.lastModified,
						ttlMinutes: x.ttlMinutes,
						description: x.description,
						link: x.link,
						author: x.author,
						ownerName: x.ownerName
					}
				});
			});
		});

		const errorPercentage = (finderResponse.errors.length / feeds.length) * 100;
		if (errorPercentage > 50) {
			Log.warn(`${errorPercentage}% of feed updates failed`);

		} else {
			SettingsService.updateLastSyncAt();

			if (finderResponse.errors.length > 0) {
				db.logs.batch(() => {
					finderResponse.errors.forEach((x) => Log.error(x));
				});
			}
		}

		Log.debug('Finished updating subscribed feeds');
	}


	addFeedAndEpisodes(feed: Feed, episodes: Episode[]): boolean {
		try {
			Log.info(`Adding feed and episodes: ${feed.title}`);

			db.feeds.insert(feed);
			db.episodes.insertMany(episodes);

			Log.info(`Finished adding feed and episodes: ${feed.title}`);
			return true;
		} catch (e) {
			Log.error(`Error adding feed and episodes ${feed.title}: ${e instanceof Error ? `${e.message} - ${e.stack}` : String(e)}`);
			return false;
		}
	}

	async addFeed(feed: Feed): Promise<boolean> {
		Log.info(`Adding feed: ${feed.title}`);

		const settings = getSettings();

		const feeds = [feed];

		try {
			const finderRequest: EpisodeFinderRequest = {
				feeds,
				since: undefined,
				corsHelper: settings!.corsHelper,
				corsHelper2: settings!.corsHelper2
			};

			const finderResponse = await this.runEpisodeFinder(finderRequest);

			const feedWithTimestamps: Feed = {
				...feed,
				lastCheckedAt: finderResponse.feeds[0].lastCheckedAt,
				lastSyncedAt: finderResponse.feeds[0].lastSyncedAt,
				lastModified: finderResponse.feeds[0].lastModified,
				ttlMinutes: finderResponse.feeds[0].ttlMinutes,
				description: finderResponse.feeds[0].description,
				link: finderResponse.feeds[0].link,
				author: finderResponse.feeds[0].author,
				ownerName: finderResponse.feeds[0].ownerName
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
			Log.error(`Error adding feed ${feed.title}: ${e instanceof Error ? `${e.message} - ${e.stack}` : String(e)}`);
			return false;
		}
	}

	async addFeeds(feeds: Feed[]): Promise<void> {
		if (feeds.length === 0) return;

		const settings = getSettings();

		Log.info(`Adding ${feeds.length} feeds`);

		db.feeds.insertMany(feeds);

		const finderRequest: EpisodeFinderRequest = {
			feeds,
			since: undefined,
			corsHelper: settings!.corsHelper,
			corsHelper2: settings!.corsHelper2
		};

		const finderResponse = await this.runEpisodeFinder(finderRequest);

		finderResponse.errors.forEach((x) => Log.error(x));

		db.feeds.batch(() => {
			finderResponse.feeds.forEach((x) => {
				db.feeds.updateOne({ id: x.id }, {
					$set: {
						lastCheckedAt: x.lastCheckedAt,
						lastSyncedAt: x.lastSyncedAt,
						lastModified: x.lastModified,
						ttlMinutes: x.ttlMinutes,
						description: x.description,
						link: x.link,
						author: x.author,
						ownerName: x.ownerName
					}
				});
			});
		});

		// avoids 'item with id already exists' error during large imports
		for (let i = 0; i < finderResponse.episodes.length; i += 1000) {
			Log.debug(`Inserting episodes - batch ${i}`);
			const batch = finderResponse.episodes.slice(i, i + 1000);
			db.episodes.insertMany(batch);
		}

		Log.info(`Finished adding ${feeds.length} feeds`);
	}

	clearSubscribed(feedId: string) {
		db.feeds.updateOne({ id: feedId }, { $set: { isSubscribed: 0 } });
		Log.info(`Unsubscribed from ${feedId}`);
	}

	markSubscribed(feedId: string) {
		db.feeds.updateOne({ id: feedId }, { $set: { isSubscribed: 1 } });
		Log.info(`Subscribed to ${feedId}`);
	}

	exportFeeds(): string {
		const feeds = db.feeds
			.find({}, { sort: { title: 1 } })
			.fetch();

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
			EpisodeUpdate.isUpdating = true;

			const existingFeeds = db.feeds.find({}).fetch();

			// Remove unicode hex entities as it trips up parseFromString
			opmlContent = opmlContent.replace(/&#x[0-9A-Fa-f]+;/g, '');
			const parser = new DOMParser();
			const doc = parser.parseFromString(opmlContent, 'text/xml');

			// Get all outlines that are direct children of the parent outline
			const outlines = doc.querySelectorAll('outline[type="rss"]');

			if (outlines.length === 0) {
				onProgress?.({ current: '', success: 0, total: 0, failed: [], skipped: 0 });
				return;
			}

			const validFeeds: Feed[] = [];
			let processedCount = 0;
			const totalFeeds = outlines.length;
			const processedUrls = new Set<string>(); // Track unique URLs
			const failedFeeds: string[] = [];
			let skippedCount = 0;

			Log.info(`Starting import of ${totalFeeds} feeds...`);

			// Sort outlines by title, ignoring leading articles (the, a, an)
			const sortedOutlines = Array.from(outlines).sort((a, b) => {
				const titleA = (a.getAttribute('text') || '').toLowerCase().replace(/^(the|a|an)\s+/i, '');
				const titleB = (b.getAttribute('text') || '').toLowerCase().replace(/^(the|a|an)\s+/i, '');
				return titleA.localeCompare(titleB);
			});

			for (const outline of sortedOutlines) {
				let url: string | null = null;
				let title: string | null = null;

				try {
					processedCount++;
					url = outline.getAttribute('xmlUrl');
					title = outline.getAttribute('text');
					if (!url || !title) continue;

					url = decodeHtmlEntities(url);
					title = decodeHtmlEntities(title);
					// Skip if we've already processed this URL
					if (processedUrls.has(url)) {
						Log.warn(`[${processedCount}/${totalFeeds}] ${title} is a duplicate, skipping`);
						skippedCount++;
						continue;
					}
					processedUrls.add(url);

					if (existingFeeds.find(f => f.url === url || f.title?.toLowerCase() === title?.toLowerCase())) {
						Log.warn(`[${processedCount}/${totalFeeds}] ${title} already exists, skipping`);
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

					Log.info(`[${processedCount}/${totalFeeds}] Processing ${title}`);

					const feed = await findPodcastByTitleAndUrl(title, url);
					if (!feed) {
						Log.error(`[${processedCount}/${totalFeeds}] Feed ${title} not found, skipping`);
						skippedCount++;
						continue;
					}

					validFeeds.push(feed);

					Log.info(`[${processedCount}/${totalFeeds}] Successfully processed ${title}`);
				} catch (error) {
					Log.error(`[${processedCount}/${totalFeeds}] Error processing feed ${title}: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`);
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
			Log.error(`Error importing feeds: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`);
			onProgress?.({ current: '', success: 0, total: 0, failed: [], skipped: 0 });
		} finally {
			EpisodeUpdate.isUpdating = false;
		}
	}

	startPeriodicUpdates() {
		Log.debug('Starting registering periodic feed updates');
		let lastCheckTime = 0;

		const sync = async () => {
			if (EpisodeUpdate.isUpdating) {
				Log.debug('Skipping feed updates due to active update');
				return;
			}

			if (!isOnline()) {
				Log.debug('Skipping feed updates due to no network connection');
				return;
			}

			try {
				EpisodeUpdate.isUpdating = true;
				await this.updateAllFeeds();
				lastCheckTime = Date.now();
			} finally {
				EpisodeUpdate.isUpdating = false;
			}
		};

		// Handle visibility changes
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				// If it's been more than 1 minute since last check, run it now
				if (Date.now() - lastCheckTime > CHECK_INTERVAL_MS) {
					setTimeout(() => {
						Log.debug('App became visible, running feed update');
						sync();
					}, 10000);
				}
			}
		});

		// Delay first sync
		setTimeout(sync, 8000);

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
}
