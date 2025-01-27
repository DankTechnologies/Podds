import { goto } from '$app/navigation';
import MinifluxApi from '$lib/api/MinifluxApi';
import { db } from '$lib/db/FluxcastDb';
import { type Podcast, type Episode } from '$lib/types/db';
import type { Feed, FeedWithIcon } from '$lib/types/miniflux';
import { PodcastService } from './PodcastService';
import { SettingsService } from './SettingsService';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export class SyncService {
	status = $state<string>('');
	private api: MinifluxApi | null = null;
	private categoryIds: number[] = [];
	private initialized = false;

	private async initialize() {
		if (this.initialized) return;

		const settings = await SettingsService.getSettings();
		if (!settings || !settings.host || !settings.apiKey) {
			throw new Error('Miniflux settings not found');
		}

		this.api = new MinifluxApi(settings.host, settings.apiKey);
		this.categoryIds = settings.categories.split(',').map(Number);
		this.initialized = true;
	}

	constructor() {}

	async syncPodcasts(): Promise<void> {
		await this.doSync();
	}

	async syncNewPodcasts(): Promise<void> {
		const settings = await SettingsService.getSettings();
		if (!settings) return;

		const lastSyncAtUnixTimestamp = settings.lastSyncAt
			? settings.lastSyncAt.getTime() / 1000
			: undefined;

		await this.doSync({
			after: lastSyncAtUnixTimestamp
		});
	}

	private async doSync(options?: { after?: number }): Promise<void> {
		await this.initialize();

		const settings = await SettingsService.getSettings();
		if (!settings) return;

		await SettingsService.saveSettings({ ...settings, isSyncing: true });

		try {
			this.status = 'Syncing podcasts...';
			const feeds = await this.syncFeeds();

			for (const feed of feeds) {
				this.status = `Syncing ${feed.title}...`;
				await this.syncFeedEntries(feed, {
					limit: 1000,
					order: 'id',
					direction: 'asc',
					...options
				});
			}

			// cache invalidate icons by id map
			await PodcastService.fetchPodcastIconsById(true);

			await SettingsService.saveSettings({
				...settings,
				lastSyncAt: new Date(),
				isSyncing: false
			});

			this.status = 'Sync complete';
		} catch (error) {
			await SettingsService.saveSettings({ ...settings, isSyncing: false });
			throw error;
		}
	}

	private async syncFeeds(): Promise<FeedWithIcon[]> {
		const feedsWithIcons = await this.getAllFeedsWithIcons();

		const podcasts: Podcast[] = feedsWithIcons.map((feed) => ({
			id: feed.id,
			title: feed.title,
			_titleSort: this.createSortableTitle(feed.title),
			newEpisodes: 0,
			icon: feed.icon
		}));
		await db.podcasts.bulkPut(podcasts);

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

		const episodes: Episode[] = entryResult.entries
			.filter((entry) => entry.enclosures?.some((e) => e.mime_type === 'audio/mpeg'))
			.map((entry) => {
				const audioEnclosure = entry.enclosures.find((e) => e.mime_type === 'audio/mpeg')!;
				return {
					id: entry.id,
					podcastId: feed.id,
					podcastTitle: feed.title,
					title: entry.title,
					content: entry.content,
					publishedAt: new Date(entry.published_at),
					durationMin: entry.reading_time,
					url: audioEnclosure.url,
					mime_type: audioEnclosure.mime_type,
					size: audioEnclosure.size,
					isDownloaded: 0,
					isPlaying: 0
				};
			});
		await db.episodes.bulkPut(episodes);
	}

	private async getAllFeedsWithIcons(): Promise<FeedWithIcon[]> {
		const categoryFeeds = await Promise.all(
			this.categoryIds.map((categoryId) => this.api!.fetchFeedsForCategory(categoryId))
		);
		const feeds = categoryFeeds.flat();

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
			console.log('Starting periodic sync...');

			try {
				const settings = await SettingsService.getSettings();

				if (!settings?.lastSyncAt) {
					console.warn('Last sync at not set in settings');
					return;
				}

				const hoursSinceLastSync = settings.lastSyncAt
					? (Date.now() - settings.lastSyncAt.getTime()) / (1000 * 60 * 60)
					: Infinity;

				if (hoursSinceLastSync >= settings.syncIntervalHours) {
					this.syncNewPodcasts().catch((error) => console.error('Sync failed:', error));
				} else {
					console.log('Not enough time has passed since last sync');
				}
			} catch (error) {
				console.error('Error checking sync status:', error);
			}
		};

		checkAndSync();

		setInterval(checkAndSync, CHECK_INTERVAL_MS);
	}
}
