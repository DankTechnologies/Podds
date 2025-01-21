import { db } from '$lib/db/FluxcastDb';
import type { Episode, Podcast } from '$lib/types/db';
import Dexie from 'dexie';
import { SvelteMap } from 'svelte/reactivity';

export class PodcastService {
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

	static async fetchPodcastIconsById(): Promise<SvelteMap<number, string>> {
		const podcasts = await db.podcasts.toArray();
		return new SvelteMap(podcasts.map((p) => [p.id, p.icon]));
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
