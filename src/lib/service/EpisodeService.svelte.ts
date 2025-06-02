import { db, getSettings } from '$lib/stores/db.svelte';
import type { ActiveEpisode, Chapter, Episode } from '$lib/types/db';
import { Log } from '$lib/service/LogService';
import { fetchChapters } from '$lib/utils/feedParser';
import { SettingsService } from './SettingsService.svelte';

export class EpisodeService {
	static setPlayingEpisode(episode: Episode | ActiveEpisode): void {
		this.clearPlayingEpisodes();

		// set episode as playing, add if needed
		if (this.findActiveEpisode(episode.id)) {
			db.activeEpisodes.updateOne({ id: episode.id }, { $set: { isPlaying: 1, lastUpdatedAt: new Date(), isCompleted: 0, wasAddedNext: 0 } });
		} else {
			this.addActiveEpisode(episode as Episode, true, false).catch((error) => {
				Log.error(`Error adding episode ${episode.title}: ${error}`);
			});
		}
	}

	static async addActiveEpisode(episode: Episode, isPlaying: boolean, isDownloaded: boolean): Promise<void> {
		const feed = db.feeds.findOne({ id: episode.feedId });

		const settings = getSettings();

		let chapters: Chapter[] | undefined = undefined;
		if (episode.chaptersUrl) {
			Log.debug(`Fetching chapters for episode ${episode.title}`);
			try {
				chapters = await fetchChapters(episode.chaptersUrl, settings!.corsHelper, settings!.corsHelper2);
			} catch (error) {
				Log.error(`Error fetching chapters for episode ${episode.title}: ${error}`);
			}
		}

		db.activeEpisodes.insert({
			id: episode.id,
			feedId: episode.feedId,
			playbackPosition: 0,
			lastUpdatedAt: new Date(),
			publishedAt: episode.publishedAt,
			durationMin: episode.durationMin,
			minutesLeft: episode.durationMin,
			isCompleted: 0,
			wasAddedNext: 0,
			isDownloaded: isDownloaded ? 1 : 0,
			isPlaying: isPlaying ? 1 : 0,
			url: episode.url,
			title: episode.title.replace(/^\[.+?\]\s/, ''),
			content: episode.content,
			feedTitle: feed?.title ?? '',
			chapters
		});
	}

	static findActiveEpisode(episodeId: string): ActiveEpisode | undefined {
		return db.activeEpisodes.findOne({ id: episodeId });
	}

	static findPlayingEpisode(): ActiveEpisode | undefined {
		return db.activeEpisodes.findOne({ isPlaying: 1 });
	}

	static findUpNextEpisode(): ActiveEpisode | undefined {
		return db.activeEpisodes.findOne(
			{
				isPlaying: 0,
				isDownloaded: 1,
				$or: [
					{ playbackPosition: 0 },
					{ wasAddedNext: 1 }
				]
			},
			{
				sort: { sortOrder: 1 }
			}
		);
	}

	static clearPlayingEpisodes(): void {
		const playingEpisode = this.findPlayingEpisode();

		if (playingEpisode) {
			const isCompleted = playingEpisode.minutesLeft < 5 ? 1 : 0;

			db.activeEpisodes.updateOne(
				{ id: playingEpisode.id },
				{ $set: { isPlaying: 0, isCompleted } }
			);
		}
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
			this.addActiveEpisode(episode, false, true).catch((error) => {
				Log.error(`Error adding episode ${episode.title}: ${error}`);
			});
		}
	}

	static clearDownloaded(episode: Episode): void {
		db.activeEpisodes.updateOne({ id: episode.id }, { $set: { isDownloaded: 0 } });
	}

	static markCompleted(episodeId: string): void {
		db.activeEpisodes.updateOne({ id: episodeId }, { $set: { isCompleted: 1 } });
	}

	static markAddedNext(episodeId: string): void {
		db.activeEpisodes.updateOne({ id: episodeId }, { $set: { wasAddedNext: 1 } });
	}

	static clearAddedNext(episodeId: string): void {
		db.activeEpisodes.updateOne({ id: episodeId }, { $set: { wasAddedNext: 0 } });
	}

	static reorderEpisodes(episodeIds: string[]): void {
		db.activeEpisodes.batch(() => {
			for (let i = 0; i < episodeIds.length; i++) {
				db.activeEpisodes.updateOne({ id: episodeIds[i] }, { $set: { sortOrder: i } });
			}
		});
	}

	static async deleteCachedEpisodes(urls: string[]): Promise<void> {
		const worker = new Worker(new URL('../workers/episodeCleaner.worker.ts', import.meta.url), {
			type: 'module'
		});

		try {
			const response = await new Promise<{ deletedUrls: string[]; errors: string[] }>((resolve, reject) => {
				worker.onmessage = (event) => resolve(event.data);
				worker.onerror = (error) => reject(error);
				worker.postMessage({ urls });
			});

			if (response.errors.length > 0) {
				Log.error(response.errors.join('\n'));
			}
		} catch (error) {
			Log.error(`Error cleaning cached episodes: ${error instanceof Error ? `${error.message} - ${error.stack}` : `${error}`}`);
		} finally {
			worker.terminate();
		}
	}

	private static findEpisodesForRetention(): { completed: ActiveEpisode[]; inProgress: ActiveEpisode[] } {
		const settings = getSettings();

		const now = new Date();
		const completedRetentionDays = settings.completedEpisodeRetentionDays ?? 7;
		const inProgressRetentionDays = settings.inProgressEpisodeRetentionDays ?? 14;

		// Find completed episodes older than retention period
		const completedEpisodes = db.activeEpisodes.find({
			isCompleted: 1,
			isDownloaded: 1,
			lastUpdatedAt: { $lt: new Date(now.getTime() - completedRetentionDays * 24 * 60 * 60 * 1000) }
		}).fetch();

		// Find in-progress episodes older than retention period
		const inProgressEpisodes = db.activeEpisodes.find({
			playbackPosition: { $gt: 0 },
			isCompleted: 0,
			isDownloaded: 1,
			lastUpdatedAt: { $lt: new Date(now.getTime() - inProgressRetentionDays * 24 * 60 * 60 * 1000) }
		}).fetch();

		return { completed: completedEpisodes, inProgress: inProgressEpisodes };
	}

	private static async applyRetentionPolicy(): Promise<void> {
		const { completed, inProgress } = this.findEpisodesForRetention();

		for (const episode of completed) {
			Log.info(`Removing completed episode due to retention policy: ${episode.title}`);
			this.clearDownloaded(episode);
		}

		for (const episode of inProgress) {
			Log.info(`Removing in-progress episode due to retention policy: ${episode.title}`);
			this.clearDownloaded(episode);
		}

		const allUrls = [
			...completed.map(e => e.url),
			...inProgress.map(e => e.url)
		];

		await this.deleteCachedEpisodes(allUrls);
	}

	static startPeriodicUpdates() {
		Log.debug('Starting periodic retention policy updates');

		const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
		let isUpdating = false;

		const sync = async () => {
			if (isUpdating) {
				Log.debug('Skipping retention check due to active update');
				return;
			}

			const settings = getSettings();
			const lastCheckTime = settings.lastRetentionCheckAt ? new Date(settings.lastRetentionCheckAt).getTime() : 0;

			// If it hasn't been long enough since last check, skip
			if (Date.now() - lastCheckTime < CHECK_INTERVAL_MS) {
				Log.debug('Skipping retention check due to recent update');
				return;
			}

			isUpdating = true;
			window.requestIdleCallback(async () => {
				try {
					await EpisodeService.applyRetentionPolicy();
					SettingsService.updateLastRetentionCheckAt();
				} catch (error) {
					Log.error(`Error applying retention policy: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`);
				} finally {
					isUpdating = false;
				}
			}, { timeout: 10000 });
		};

		// Handle visibility changes
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				setTimeout(() => {
					Log.debug('App became visible, running retention policy check');
					sync();
				}, 20000);
			}
		});

		// Run first check after 60 seconds, not urgent
		setTimeout(sync, 60000);

		// Register periodic updates
		setInterval(sync, CHECK_INTERVAL_MS);
	}
}
