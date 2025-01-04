import type MinifluxApi from '$lib/api/MinifluxApi';
import { db, type Episode, type Podcast } from '$lib/db/db';
import type { Feed } from '$lib/types/miniflux';

const maxWidth = 300;
const maxHeight = 300;

export class SyncService {
	status = $state<string>('');

	constructor(private api: MinifluxApi) {}

	async syncPodcasts(categoryIds: number[]): Promise<void> {
		this.status = 'Syncing podcasts...';
		const feeds = await this.syncFeeds(categoryIds);

		for (const feed of feeds) {
			this.status = `Syncing ${feed.title}...`;
			await this.syncFeedEntries(feed);
		}
	}

	private async syncFeeds(categoryIds: number[]): Promise<Feed[]> {
		const categoryFeeds = await Promise.all(
			categoryIds.map((categoryId) => this.api.fetchFeedsForCategory(categoryId))
		);
		const feeds = categoryFeeds.flat();

		const feedsWithIcons = await Promise.all(
			feeds.map(async (feed) => {
				const icon = await this.api.fetchFeedIcon(feed.id);
				const resizedIcon = await this.resizeBase64Image(icon, maxWidth, maxHeight);

				return {
					...feed,
					icon: resizedIcon
				};
			})
		);

		const podcasts: Podcast[] = feedsWithIcons.map((feed) => ({
			id: feed.id,
			title: feed.title,
			newEpisodes: 0,
			icon: feed.icon
		}));
		await db.podcasts.bulkPut(podcasts);

		return feedsWithIcons;
	}

	private async syncFeedEntries(feed: Feed): Promise<void> {
		const entryResult = await this.api.fetchEntriesForFeed(feed.id, { limit: 1000 });
		const episodes: Episode[] = entryResult.entries.map((entry) => ({
			id: entry.id,
			podcastId: feed.id,
			podcastTitle: feed.title,
			title: entry.title,
			content: entry.content,
			publishedAt: new Date(entry.published_at),
			isDownloaded: false
		}));
		await db.episodes.bulkPut(episodes);
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
				const ctx = canvas.getContext('2d');
				ctx!.drawImage(img, 0, 0, width, height);

				resolve(canvas.toDataURL('image/png'));
			};

			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = `data:${dataUrl}`;
		});
	}
}
