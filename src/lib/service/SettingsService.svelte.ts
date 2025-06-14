import { db } from '$lib/stores/db.svelte';
import type { Settings } from '$lib/types/db';
import { isPwa } from '$lib/utils/osCheck';
import { getShareData } from '$lib/utils/share';
import { Log } from './LogService';

export const SessionInfo = $state({
	hasUpdate: false
});

export const DefaultSettings: Settings = {
	id: '1',
	corsHelper: import.meta.env.VITE_CORS_HELPER_URL || '',
	corsHelper2: import.meta.env.VITE_CORS_HELPER_BACKUP_URL || '',
	isCustomCorsHelpers: false,
	syncIntervalMinutes: 15,
	searchTermSyncIntervalHours: 24,
	lastSyncAt: new Date(),
	isAdvanced: false,
	logLevel: 'info',
	playbackSpeed: 1.0,
	isPwaInstalled: isPwa,
	skipForwardButtonSeconds: 30,
	skipBackwardButtonSeconds: 10,
	completedEpisodeRetentionDays: 7,
	inProgressEpisodeRetentionDays: 14,
	goBackOnResumeSeconds: 10,
	hugged: false,
	ratchet: 2,
	playlistView: 'upNext'
};

export class SettingsService {
	static initializeSettings(): void {
		let isFirstVisit = false;
		let needsSave = false;

		let settings = db.settings.findOne({ id: '1' });

		if (settings === undefined) {
			isFirstVisit = true;
			settings = { ...DefaultSettings };
		}

		// update public CORS proxies if they've changed
		if (!settings.isCustomCorsHelpers && (settings.corsHelper !== DefaultSettings.corsHelper || settings.corsHelper2 !== DefaultSettings.corsHelper2)) {
			settings.corsHelper = DefaultSettings.corsHelper;
			settings.corsHelper2 = DefaultSettings.corsHelper2;
			needsSave = true;
		}

		// update custom CORS proxies when present in share links, i.e. someone with custom CORS proxies shared with you
		const shareData = getShareData();
		if (shareData?.corsHelper) {
			settings.corsHelper = shareData.corsHelper;
			settings.corsHelper2 = shareData.corsHelper2;
			settings.isCustomCorsHelpers = true;
			needsSave = true;
		}

		if (isFirstVisit) {
			db.settings.insert(settings);
			Log.info('Added initial settings');
		} else if (needsSave) {
			SettingsService.saveSettings(settings);
		}
	}

	static saveSettings(settings: Settings): void {
		db.settings.updateOne({ id: '1' }, { $set: { ...settings } });
	}

	static markPwaInstalled(): void {
		db.settings.updateOne({ id: '1' }, { $set: { isPwaInstalled: true } });
	}

	static markHugged(): void {
		db.settings.updateOne({ id: '1' }, { $set: { hugged: true } });
	}

	static updateLastSyncAt(): void {
		db.settings.updateOne({ id: '1' }, { $set: { lastSyncAt: new Date() } });
	}

	static updateLastRetentionCheckAt(): void {
		db.settings.updateOne({ id: '1' }, { $set: { lastRetentionCheckAt: new Date() } });
	}

	static updateLastSearchCheckAt(): void {
		db.settings.updateOne({ id: '1' }, { $set: { lastSearchCheckAt: new Date() } });
	}

	static updatePlaybackSpeed(playbackSpeed: number): void {
		db.settings.updateOne({ id: '1' }, { $set: { playbackSpeed } });
	}

	static updateRatchet(ratchet: number): void {
		db.settings.updateOne({ id: '1' }, { $set: { ratchet } });
	}

	static updatePlaylistView(playlistView: 'listenedTo' | 'upNext'): void {
		db.settings.updateOne({ id: '1' }, { $set: { playlistView } });
	}

	static async clearAllLocalState(): Promise<void> {
		// Clear only mp3-cache
		if ('caches' in window) {
			await caches.delete('mp3-cache');
		}

		// Clear IndexedDB
		try {
			const databases = await window.indexedDB.databases();
			await Promise.all(
				databases.map(
					({ name }) =>
						new Promise((resolve, reject) => {
							if (!name) return resolve(undefined);
							const request = window.indexedDB.deleteDatabase(name);
							request.onsuccess = () => resolve(undefined);
							request.onerror = () => reject(request.error);
						})
				)
			);
		} catch (error) {
			console.error('Failed to clear IndexedDB:', error);
		}
	}
}
