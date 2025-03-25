import { db, getSettings } from '$lib/stores/db.svelte';
import type { Settings } from '$lib/types/db';

export const SessionInfo = $state({
	hasUpdate: false
});

export class SettingsService {
	static saveSettings(settings: Settings): void {
		let currentSettings = getSettings();

		if (!currentSettings) {
			db.settings.insert(settings);
		} else {
			db.settings.updateOne({ id: '1' }, { $set: { ...settings } });
		}
	}

	static updateLastSyncAt(): void {
		let currentSettings = getSettings();

		if (!currentSettings) {
			throw new Error('Settings not found');
		}
		db.settings.updateOne({ id: '1' }, { $set: { lastSyncAt: new Date() } });
	}

	static async clearAllLocalState(): Promise<void> {

		// Clear Service Worker Caches
		if ('caches' in window) {
			const cacheKeys = await caches.keys();
			await Promise.all(cacheKeys.map((key) => caches.delete(key)));
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
