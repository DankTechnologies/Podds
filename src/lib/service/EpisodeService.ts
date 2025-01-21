import { db } from '$lib/db/FluxcastDb';
import type { Episode, EpisodeExt } from '$lib/types/db';

export class EpisodeService {
	private static worker: Worker | null = null;

	private static initWorker() {
		if (!EpisodeService.worker) {
			EpisodeService.worker = new Worker(new URL('../workers/downloadWorker.ts', import.meta.url), {
				type: 'module'
			});
		}
		return EpisodeService.worker;
	}

	static async getActiveEpisode(): Promise<Episode | undefined> {
		return await db.episodes.where('status').anyOf(['playing', 'paused']).first();
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

	static async downloadEpisode(
		episode: Episode,
		onSuccess?: (episodeId: number) => void,
		onProgress?: (episodeId: number, progress: number) => void
	): Promise<void> {
		const worker = EpisodeService.initWorker();

		return new Promise((resolve, reject) => {
			worker.onmessage = async (e) => {
				switch (e.data.type) {
					case 'progress':
						onProgress?.(episode.id, e.data.progress);
						break;
					case 'success':
						await db.episodes.update(episode.id, { isDownloaded: true });
						onSuccess?.(episode.id);
						resolve();
						break;
					case 'error':
						reject(e.data.error);
						break;
				}
			};

			worker.postMessage({
				type: 'download',
				id: episode.id,
				url: episode.url
			});
		});
	}
}
