import { db } from '$lib/db/FluxcastDb';
import { type Settings } from '$lib/types/db';

export class SettingsService {
	static async getSettings(): Promise<Settings | null> {
		return (await db.settings.get(1)) || null;
	}

	static async saveSettings(settings: Settings, isUpdate: boolean): Promise<void> {
		if (isUpdate) {
			await db.settings.put({ ...settings, id: 1 });
		} else {
			await db.settings.add({
				...settings,
				lastSyncAt: new Date(),
				syncIntervalHours: 24,
				isSyncing: false
			});
		}
	}
}
