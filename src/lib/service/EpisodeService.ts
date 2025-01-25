import { db } from '$lib/db/FluxcastDb';
import type { Episode } from '$lib/types/db';

export class EpisodeService {
	static async getEpisodeById(id: number): Promise<Episode | undefined> {
		return await db.episodes.get(id);
	}

	static async getPlayingEpisode(): Promise<Episode | undefined> {
		return await db.episodes.where('isPlaying').equals(1).first();
	}

	static async getRecentEpisodes(start: number = 0, limit: number = 50): Promise<Episode[]> {
		return await db.episodes.orderBy('publishedAt').reverse().offset(start).limit(limit).toArray();
	}

	static async getUpNextEpisodes(): Promise<Episode[]> {
		return await db.episodes.where('sortOrder').above(0).toArray();
	}

	static async getDownloadedEpisodes(): Promise<Episode[]> {
		return await db.episodes.where('isDownloaded').equals(1).toArray();
	}

	// TODO - review, maybe use transaction
	static async setPlayingEpisode(episodeId: number): Promise<void> {
		const currentPlayingEpisode = await EpisodeService.getPlayingEpisode();

		if (currentPlayingEpisode) {
			await db.episodes.update(currentPlayingEpisode.id, { isPlaying: 0 });
		}

		await db.episodes.update(episodeId, { isPlaying: 1 });
	}

	static async clearPlayingEpisode(): Promise<void> {
		const currentPlayingEpisode = await EpisodeService.getPlayingEpisode();
		if (currentPlayingEpisode) {
			await db.episodes.update(currentPlayingEpisode.id, { isPlaying: 0 });
		}
	}

	static async clearDownloaded(episodeId: number): Promise<void> {
		await db.episodes.update(episodeId, { isDownloaded: 0 });
	}

	static async markDownloaded(episodeId: number): Promise<void> {
		await db.episodes.update(episodeId, { isDownloaded: 1 });
	}

	static async updatePlaybackPosition(episodeId: number, pos: number): Promise<void> {
		await db.episodes.update(episodeId, { playbackPosition: pos });
	}
}
