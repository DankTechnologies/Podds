import type MinifluxApi from '$lib/api/MinifluxApi';
import { db, type Episode, type Podcast } from '$lib/db/db';
import type { Feed } from '$lib/types/miniflux';

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
		const feeds = (
			await Promise.all(
				categoryIds.map(async (categoryId) => {
					const categoryFeeds = await this.api.fetchFeedsForCategory(categoryId);
					return Promise.all(
						categoryFeeds.map(async (feed) => ({
							...feed,
							icon: await this.api.fetchFeedIcon(feed.id)
						}))
					);
				})
			)
		).flat();

		const podcasts: Podcast[] = feeds.map((feed) => ({
			id: feed.id,
			title: feed.title,
			newEpisodes: 0,
			icon: feed.icon
		}));
		await db.podcasts.bulkPut(podcasts);

		return feeds;
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
}
