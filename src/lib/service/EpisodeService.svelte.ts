import { db, getFeeds } from '$lib/stores/db.svelte';
import type { ActiveEpisode, Episode } from '$lib/types/db';

let feeds = $derived(getFeeds());
export class EpisodeService {
	static setPlayingEpisode(episode: Episode): void {
		this.clearPlayingEpisodes();

		// set episode as playing, add if needed
		if (this.findActiveEpisode(episode.id)) {
			db.activeEpisodes.updateOne({ id: episode.id }, { $set: { isPlaying: 1 } });
		} else {
			this.addActiveEpisode(episode, true, false);
		}
	}

	static setPlayingActiveEpisode(episode: ActiveEpisode): void {
		this.clearPlayingEpisodes();

		db.activeEpisodes.updateOne({ id: episode.id }, { $set: { isPlaying: 1 } });
	}

	static addActiveEpisode(episode: Episode, isPlaying: boolean, isDownloaded: boolean): void {
		const feed = feeds.find((x) => x.id === episode.feedId);

		db.activeEpisodes.insert({
			id: episode.id,
			feedId: episode.feedId,
			playbackPosition: 0,
			lastUpdatedAt: new Date(),
			durationMin: episode.durationMin,
			minutesLeft: episode.durationMin,
			isCompleted: 0,
			isDownloaded: isDownloaded ? 1 : 0,
			isPlaying: isPlaying ? 1 : 0,
			url: episode.url,
			title: episode.title,
			content: episode.content,
			feedTitle: feed?.title ?? ''
		});
	}

	static findActiveEpisode(episodeId: string): ActiveEpisode | undefined {
		return db.activeEpisodes.findOne({ id: episodeId });
	}

	static clearPlayingEpisodes(): void {
		db.activeEpisodes.updateMany({ isPlaying: 1 }, { $set: { isPlaying: 0 } });
	}

	static updatePlaybackPosition(episodeId: string, position: number, remainingTime: number): void {
		const minutesLeft = Math.ceil(remainingTime / 60);

		db.activeEpisodes.updateOne(
			{ id: episodeId },
			{
				$set: { playbackPosition: position, lastUpdatedAt: new Date(), minutesLeft, isCompleted: 0 }
			}
		);
	}

	static markDownloaded(episode: Episode): void {
		if (this.findActiveEpisode(episode.id)) {
			db.activeEpisodes.updateOne({ id: episode.id }, { $set: { isDownloaded: 1 } });
		} else {
			this.addActiveEpisode(episode, false, true);
		}
	}

	static clearDownloaded(episodeId: string): void {
		db.activeEpisodes.updateOne({ id: episodeId }, { $set: { isDownloaded: 0 } });
	}

	static markCompleted(episodeId: string): void {
		db.activeEpisodes.updateOne({ id: episodeId }, { $set: { isCompleted: 1 } });
	}

	static reorderEpisodes(episodeIds: string[]): void {
		db.activeEpisodes.batch(() => {
			for (let i = 0; i < episodeIds.length; i++) {
				db.activeEpisodes.updateOne({ id: episodeIds[i] }, { $set: { sortOrder: i } });
			}
		});
	}
}
