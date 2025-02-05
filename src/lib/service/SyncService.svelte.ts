import type { Feed, FeedWithIcon } from '$lib/types/miniflux';
import { Log } from '$lib/service/LogService';
import { SessionInfo, SettingsService } from './SettingsService.svelte';
import MinifluxClient from '$lib/api/miniflux';
import { db } from '$lib/stores/db.svelte';
import type { Episode } from '$lib/types/db';

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
			const syncCutoffTimestamp =
				settings.lastSyncAt || Math.floor(Date.now() / 1000) - 4 * 60 * 60;

			await this.syncFeeds({
				limit: 1000,
				order: 'id',
				direction: 'asc',
				after: syncCutoffTimestamp
			});

			await SettingsService.updateSettings({
				lastSyncAt: Math.floor(Date.now() / 1000),
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
			await this.syncFeeds();

			await SettingsService.updateSettings({
				lastSyncAt: Math.floor(Date.now() / 1000),
				isSyncing: false
			});

			SessionInfo.isFirstVisit = false;
			this.status = 'Sync complete';
		} catch (error) {
			await SettingsService.updateSettings({ isSyncing: false });
			throw error;
		}
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
			.filter((entry) =>
				entry.enclosures?.some((e) => e.mime_type === 'audio/mpeg' || e.mime_type === 'audio/x-m4a')
			)
			.map((entry) => {
				const audioEnclosure = entry.enclosures.find(
					(e) => e.mime_type === 'audio/mpeg' || e.mime_type === 'audio/x-m4a'
				)!;

				return {
					id: `miniflux_${entry.id}`,
					podcast: {
						id: `miniflux_${feed.id}`,
						title: feed.title,
						iconId: `miniflux_${feed.id}`
					},
					title: entry.title,
					content: entry.content,
					publishedAt: new Date(entry.published_at),
					url: audioEnclosure.url,
					mime_type: audioEnclosure.mime_type,
					size: audioEnclosure.size,
					durationMin: entry.reading_time,
					isDownloaded: 0,
					isPlaying: 0,
					playbackPosition: 0
				};
			});

		db.episodes.batch(() => {
			for (const episode of episodes) {
				db.episodes.insert(episode);
			}
		});
	}

	private async syncFeeds(filter?: {
		limit?: number;
		order?: string;
		direction?: 'asc' | 'desc';
		after?: number;
	}): Promise<void> {
		const feeds = await this.getAllFeeds();

		// Only fetch missing icons
		await Promise.all(
			feeds.map(async (feed) => {
				const iconId = `miniflux_${feed.id}`;

				const existingIcon = await db.icons.findOne({ id: iconId });

				if (!existingIcon) {
					const iconData = await this.api!.fetchFeedIcon(feed.id);

					const resizedIcon = await this.resizeBase64Image(
						iconData,
						ICON_MAX_WIDTH,
						ICON_MAX_HEIGHT
					);

					await db.icons.insert({
						id: iconId,
						data: resizedIcon,
						lastUpdatedAt: new Date()
					});
				}

				// Sync feed entries
				await this.syncFeedEntries(
					feed,
					filter || {
						limit: 1000,
						order: 'id',
						direction: 'asc'
					}
				);
			})
		);
	}

	private async getAllFeeds(): Promise<Feed[]> {
		const feeds = await Promise.all(
			this.categoryIds.map((categoryId) => this.api!.fetchFeedsForCategory(categoryId))
		);
		return feeds.flat();
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

	startPeriodicSync() {
		const checkAndSync = async () => {
			try {
				const settings = await SettingsService.getSettings();

				if (!settings?.lastSyncAt) {
					return;
				}

				const hoursSinceLastSync =
					(Math.floor(Date.now() / 1000) - settings.lastSyncAt) / (60 * 60);

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
