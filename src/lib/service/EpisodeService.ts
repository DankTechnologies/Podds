import { db } from '$lib/stores/db.svelte';

export class EpisodeService {
	static async setPlayingEpisode(episodeId: string): Promise<void> {
		await db.episodes.updateMany({ isPlaying: 1 }, { $set: { isPlaying: 0 } });
		await db.episodes.updateOne({ id: episodeId }, { $set: { isPlaying: 1 } });
	}

	static async clearPlayingEpisode(): Promise<void> {
		await db.episodes.updateMany({ isPlaying: 1 }, { $set: { isPlaying: 0 } });
	}

	static async updatePlaybackPosition(episodeId: string, pos: number): Promise<void> {
		await db.episodes.updateOne({ id: episodeId }, { $set: { playbackPosition: pos } });
	}

	static async markDownloaded(episodeId: string): Promise<void> {
		await db.episodes.updateOne({ id: episodeId }, { $set: { isDownloaded: 1 } });
	}

	static async clearDownloaded(episodeId: string): Promise<void> {
		await db.episodes.updateOne({ id: episodeId }, { $set: { isDownloaded: 0 } });
	}
}
