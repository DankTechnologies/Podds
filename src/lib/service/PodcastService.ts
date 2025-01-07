import { db } from '$lib/db/FluxcastDb';
import type { Episode, Podcast } from '$lib/types/db';
import Dexie from 'dexie';

export type EpisodeExt = Episode & {
	icon?: string;
};

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
	): Promise<EpisodeExt[]> {
		return await db.episodes
			.where('[podcastId+id]') // can't use orderBy and where
			.between([podcastId, Dexie.minKey], [podcastId, Dexie.maxKey])
			.reverse()
			.offset(start)
			.limit(limit)
			.toArray();
	}

	static async getRecentEpisodes(start: number = 0, limit: number = 50): Promise<EpisodeExt[]> {
		const episodes = await db.episodes
			.orderBy('publishedAt')
			.reverse()
			.offset(start)
			.limit(limit)
			.toArray();

		const podcastIds = [...new Set(episodes.map((ep) => ep.podcastId))];

		const podcasts = await db.podcasts.where('id').anyOf(podcastIds).toArray();

		const podcastMap = new Map(podcasts.map((p) => [p.id, p]));

		return episodes.map(
			(episode): EpisodeExt => ({
				...episode,
				icon: podcastMap.get(episode.podcastId)?.icon
			})
		);
	}
}
