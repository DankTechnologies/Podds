import { db, getSettings } from '$lib/stores/db.svelte';
import type { Settings } from '$lib/types/db';

export const SessionInfo = $state({
	hasUpdate: false
});

export class SettingsService {
	private static SETTINGS_KEY = 'fluxcast_settings';

	static saveSettings(settings: Settings): void {
		let currentSettings = getSettings();

		if (!currentSettings) {
			db.settings.insert(settings);
		} else {
			db.settings.updateOne({ id: '1' }, { $set: { settings } });
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
		localStorage.removeItem(this.SETTINGS_KEY);

		// Clear Service Worker Caches
		if ('caches' in window) {
			const cacheKeys = await caches.keys();
			await Promise.all(cacheKeys.map((key) => caches.delete(key)));
		}

		// Clear OPFS
		try {
			const root = await navigator.storage.getDirectory();
			// @ts-ignore
			for await (const handle of root.values()) {
				await root.removeEntry(handle.name, { recursive: true });
			}
		} catch (error) {
			console.error('Failed to clear OPFS:', error);
		}
	}
}
