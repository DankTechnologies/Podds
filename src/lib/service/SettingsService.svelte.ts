import { db } from '$lib/db/FluxcastDb';
import { type OptionalId, type Settings } from '$lib/types/db';

export const SessionInfo = $state({
	isFirstVisit: true
});

export class SettingsService {
	static async getSettings(): Promise<Settings | null> {
		return (await db.settings.get(1)) || null;
	}

	static async saveSettings(settings: OptionalId<Settings>): Promise<void> {
		const oldSettings = await this.getSettings();
		if (oldSettings) {
			await db.settings.update(1, { ...settings });
		} else {
			await db.settings.add({ ...settings, id: 1 });
		}
	}

	static async updateSettings(partialSettings: Partial<Settings>): Promise<void> {
		const currentSettings = await this.getSettings();
		if (!currentSettings) throw new Error('Settings not found');

		await db.settings.update(1, { ...currentSettings, ...partialSettings });
	}

	static async clearAllLocalState(): Promise<void> {
		// Clear IndexedDB
		await db.delete();
		await db.open();

		// Clear Service Worker Caches
		if ('caches' in window) {
			const cacheKeys = await caches.keys();
			await Promise.all(cacheKeys.map((key) => caches.delete(key)));
		}

		// Reset session info
		SessionInfo.isFirstVisit = true;
	}
}
