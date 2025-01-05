import { db } from '$lib/db/FluxcastDb';
import type { Episode, Podcast } from '$lib/types/db';

export type EpisodeExt = Episode & {
	icon?: string;
};

export class PodcastService {
	static async getPodcast(podcastId: number): Promise<Podcast | null> {
		return (await db.podcasts.get(podcastId)) || null;
	}

	static async getEpisodesByPodcast(
		podcastId: number,
		limit: number = 1000
	): Promise<EpisodeExt[]> {
		return await db.episodes
			.where('podcastId')
			.equals(podcastId)
			.limit(limit)
			.reverse()
			.sortBy('publishedAt');
	}

	static async getRecentEpisodes(limit: number = 500): Promise<EpisodeExt[]> {
		const episodes = await db.episodes.limit(limit).reverse().sortBy('publishedAt');

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
