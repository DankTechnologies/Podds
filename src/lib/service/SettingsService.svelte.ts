import { db, getSettings } from '$lib/stores/db.svelte';
import type { Settings } from '$lib/types/db';
import { Log } from './LogService';

export const SessionInfo = $state({
	hasUpdate: false
});

export class SettingsService {
	static saveSettings(settings: Settings): void {
		let currentSettings = getSettings();

		if (!currentSettings) {
			db.settings.insert(settings);
			Log.info('Added initial settings');
		} else {
			db.settings.updateOne({ id: '1' }, { $set: { ...settings } });
			Log.info('Updated settings');
		}
	}

	static markPwaInstalled(): void {
		db.settings.updateOne({ id: '1' }, { $set: { isPwaInstalled: true } });
	}

	static updateLastSyncAt(): void {
		db.settings.updateOne({ id: '1' }, { $set: { lastSyncAt: new Date() } });
	}

	static updatePlaybackSpeed(playbackSpeed: number): void {
		db.settings.updateOne({ id: '1' }, { $set: { playbackSpeed } });
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
