import { db, type Settings } from '$lib/db/db';

export class SettingsService {
	async getSettings(): Promise<Settings | null> {
		return (await db.settings.get(1)) || null;
	}

	async saveSettings(settings: Settings, isUpdate: boolean): Promise<void> {
		if (isUpdate) {
			await db.settings.put({ id: 1, ...settings });
		} else {
			await db.settings.add(settings);
		}
	}
}
