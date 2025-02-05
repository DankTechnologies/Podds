import type { Feed, FeedWithIcon } from '$lib/types/miniflux';
import { Log } from '$lib/service/LogService';
import { EpisodeService } from './EpisodeService';
import { PodcastService } from './PodcastService';
import { SessionInfo, SettingsService } from './SettingsService.svelte';
import MinifluxClient from '$lib/api/miniflux';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export class SyncService {
	status = $state<string>('');
	private api: MinifluxClient | null = null;
	private categoryIds: number[] = [];
	private initialized = false;

	private async initialize() {
		if (this.initialized) return;

		const settings = await SettingsService.getSettings();
		if (!settings || !settings.host || !settings.apiKey) {
			throw new Error('Miniflux settings not found');
		}

		this.api = new MinifluxClient(settings.host, settings.apiKey);
		this.categoryIds = settings.categories.split(',').map(Number);
		this.initialized = true;
	}

	constructor() {}

	async syncNewPodcasts(): Promise<void> {
		await this.initialize();

		const settings = await SettingsService.getSettings();
		if (!settings) return;

		await SettingsService.updateSettings({ isSyncing: true });

		try {
			const syncCutoffTimestamp = settings.lastSyncAt
				? Math.floor(settings.lastSyncAt.getTime() / 1000)
				: Math.floor((Date.now() - 4 * 60 * 60 * 1000) / 1000); // Default to 4 hours ago

			const feeds = await this.getAllFeeds();
			const currentPodcasts = await PodcastService.getPodcasts();

			const toDelete = currentPodcasts.filter((x) => !feeds.map((y) => y.id).includes(x.id));
			const toAdd = feeds.filter((x) => !currentPodcasts.map((y) => y.id).includes(x.id));

			if (toDelete.length > 0) {
				this.status = 'Removing deleted podcasts...';

				const podcastIds = toDelete.map((x) => x.id);
				await PodcastService.deletePodcasts(podcastIds);
			}

			if (toAdd.length > 0) {
				this.status = 'Adding new podcasts...';

				for (const feed of toAdd) {
					const icon = await this.api!.fetchFeedIcon(feed.id);
					const resizedIcon = await this.resizeBase64Image(icon, ICON_MAX_WIDTH, ICON_MAX_HEIGHT);

					await PodcastService.putPodcast({
						id: feed.id,
						title: feed.title,
						_titleSort: this.createSortableTitle(feed.title),
						icon: resizedIcon
					});
				}
			}

			await this.syncRecentEntries(syncCutoffTimestamp);

			await SettingsService.updateSettings({
				lastSyncAt: new Date(),
				isSyncing: false
			});
		} catch (error) {
			await SettingsService.updateSettings({ isSyncing: false });
			throw error;
		}
	}

	async syncPodcasts(): Promise<void> {
		await this.initialize();

		const settings = await SettingsService.getSettings();
		if (!settings) return;

		await SettingsService.updateSettings({ isSyncing: true });

		try {
			this.status = 'Syncing podcasts...';

			const feeds = await this.syncFeeds();
			for (const feed of feeds) {
				this.status = `Syncing ${feed.title}...`;
				await this.syncFeedEntries(feed, {
					limit: 1000,
					order: 'id',
					direction: 'asc'
				});
			}

			await PodcastService.fetchPodcastIconsById(true);
			await SettingsService.updateSettings({
				lastSyncAt: new Date(),
				isSyncing: false
			});

			SessionInfo.isFirstVisit = false;
			this.status = 'Sync complete';
		} catch (error) {
			await SettingsService.updateSettings({ isSyncing: false });
			throw error;
		}
	}

	private async syncFeeds(): Promise<FeedWithIcon[]> {
		const feedsWithIcons = await this.getAllFeedsWithIcons();

		const podcasts = feedsWithIcons.map((feed) => ({
			id: feed.id,
			title: feed.title,
			_titleSort: this.createSortableTitle(feed.title),
			newEpisodes: 0,
			icon: feed.icon
		}));
		await PodcastService.putPodcasts(podcasts);

		return feedsWithIcons;
	}

	private async syncFeedEntries(
		feed: Feed,
		filter: {
			limit?: number;
			order?: string;
			direction?: 'asc' | 'desc';
			after?: number;
		}
	): Promise<void> {
		const entryResult = await this.api!.fetchEntriesForFeed(feed.id, filter);
		await EpisodeService.putEpisodes(entryResult.entries);
	}

	private async syncRecentEntries(after: number): Promise<void> {
		const filter = {
			limit: 1000,
			order: 'id',
			direction: 'asc',
			after: after
		};

		const results = await Promise.all(
			this.categoryIds.map((categoryId) => this.api!.fetchEntriesForCategory(categoryId, filter))
		);

		const entries = results.map((result) => result.entries).flat();
		await EpisodeService.putEpisodes(entries);
	}

	private async getAllFeeds(): Promise<Feed[]> {
		const feeds = await Promise.all(
			this.categoryIds.map((categoryId) => this.api!.fetchFeedsForCategory(categoryId))
		);
		return feeds.flat();
	}

	private async getAllFeedsWithIcons(): Promise<FeedWithIcon[]> {
		const feeds = await this.getAllFeeds();
		const feedsWithIcons = await Promise.all(
			feeds.map(async (feed) => {
				const icon = await this.api!.fetchFeedIcon(feed.id);
				const resizedIcon = await this.resizeBase64Image(icon, ICON_MAX_WIDTH, ICON_MAX_HEIGHT);

				return {
					...feed,
					icon: resizedIcon
				};
			})
		);

		return feedsWithIcons;
	}

	private async resizeBase64Image(
		dataUrl: string,
		maxWidth: number,
		maxHeight: number
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const img = new Image();

			img.onload = function () {
				let { width, height } = img;
				if (width > maxWidth || height > maxHeight) {
					const aspectRatio = width / height;
					if (width > height) {
						width = maxWidth;
						height = Math.round(width / aspectRatio);
					} else {
						height = maxHeight;
						width = Math.round(height * aspectRatio);
					}
				}

				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d')!;

				// Fill with white background
				ctx.fillStyle = '#FFFFFF';
				ctx.fillRect(0, 0, width, height);

				// Draw image on top
				ctx.drawImage(img, 0, 0, width, height);

				resolve(canvas.toDataURL('image/png'));
			};

			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = `data:${dataUrl}`;
		});
	}

	private createSortableTitle(title: string): string {
		return title
			.replace(/^(the|a|an)\s+/i, '')
			.toLowerCase()
			.trim();
	}

	startPeriodicSync() {
		const checkAndSync = async () => {
			try {
				const settings = await SettingsService.getSettings();

				if (!settings?.lastSyncAt) {
					return;
				}

				const hoursSinceLastSync = settings.lastSyncAt
					? (Date.now() - settings.lastSyncAt.getTime()) / (1000 * 60 * 60)
					: Infinity;

				if (hoursSinceLastSync >= settings.syncIntervalHours) {
					this.syncNewPodcasts().catch((error) => Log.error(`Sync failed: ${error}`));
				}
			} catch (error) {
				Log.error(`Error checking sync status: ${error}`);
			}
		};

		checkAndSync();

		setInterval(checkAndSync, CHECK_INTERVAL_MS);
	}
}
