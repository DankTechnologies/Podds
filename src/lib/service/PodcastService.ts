import { db } from '$lib/db/FluxcastDb';
import type { Episode, Podcast } from '$lib/types/db';
import Dexie from 'dexie';
import { SvelteMap } from 'svelte/reactivity';

export class PodcastService {
	private static podcastIconsCache: SvelteMap<number, string> | null = null;

	static async getPodcast(podcastId: number): Promise<Podcast | null> {
		return (await db.podcasts.get(podcastId)) || null;
	}

	static async getEpisodeCountByPodcast(podcastId: number): Promise<number> {
		return db.episodes.where('podcastId').equals(podcastId).count();
	}

	static async getPodcasts(): Promise<Podcast[]> {
		return await db.podcasts.orderBy('_titleSort').toArray();
	}

	static async getEpisodesByPodcast(
		podcastId: number,
		start: number = 0,
		limit: number = 100
	): Promise<Episode[]> {
		return await db.episodes
			.where('[podcastId+id]') // can't use orderBy and where
			.between([podcastId, Dexie.minKey], [podcastId, Dexie.maxKey])
			.reverse()
			.offset(start)
			.limit(limit)
			.toArray();
	}

	static async fetchPodcastIconsById(force?: boolean): Promise<SvelteMap<number, string>> {
		// handle edge case where map was empty on first visit after the initial setup
		if (
			PodcastService.podcastIconsCache &&
			PodcastService.podcastIconsCache.keys.length > 0 &&
			!force
		) {
			return PodcastService.podcastIconsCache;
		}

		const podcasts = await db.podcasts.toArray();
		PodcastService.podcastIconsCache = new SvelteMap(podcasts.map((p) => [p.id, p.icon]));
		return PodcastService.podcastIconsCache;
	}

	static clearIconsCache(): void {
		PodcastService.podcastIconsCache = null;
	}

	static async getPodcastWithDetails(
		podcastId: number,
		start: number = 0,
		limit: number = 100
	): Promise<{
		episodes: Episode[];
		podcast: Podcast;
		episodeCount: number;
	}> {
		return db.transaction('r', [db.podcasts, db.episodes], async () => {
			const podcast = await db.podcasts.get(podcastId);
			const episodes = await db.episodes
				.where('[podcastId+id]') // can't use orderBy and where
				.between([podcastId, Dexie.minKey], [podcastId, Dexie.maxKey])
				.reverse()
				.offset(start)
				.limit(limit)
				.toArray();
			const episodeCount = await db.episodes.where('podcastId').equals(podcastId).count();

			if (!podcast) throw new Error('Podcast not found');

			return {
				episodes,
				podcast,
				episodeCount
			};
		});
	}
}
