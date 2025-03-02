import { db } from '$lib/stores/db.svelte';

export class EpisodeService {
	static setPlayingEpisode(episodeId: string): void {
		db.episodes.batch(() => {
			db.episodes.updateMany({ isPlaying: 1 }, { $set: { isPlaying: 0 } });
			db.episodes.updateOne({ id: episodeId }, { $set: { isPlaying: 1 } });
		});
	}

	static clearPlayingEpisode(episodeId: string): void {
		db.episodes.updateOne({ id: episodeId }, { $set: { isPlaying: 0 } });
	}

	static updatePlaybackPosition(episodeId: string, pos: number): void {
		db.episodes.updateOne({ id: episodeId }, { $set: { playbackPosition: pos } });
	}

	static markDownloaded(episodeId: string): void {
		db.episodes.updateOne({ id: episodeId }, { $set: { isDownloaded: 1 } });
	}

	static clearDownloaded(episodeId: string): void {
		db.episodes.updateOne({ id: episodeId }, { $set: { isDownloaded: 0 } });
	}
}
