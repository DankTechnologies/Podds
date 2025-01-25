import { db } from '$lib/db/FluxcastDb';
import { type Settings, type OptionalId } from '$lib/types/db';

export class SettingsService {
	static async getSettings(): Promise<Settings | null> {
		return (await db.settings.get(1)) || null;
	}

	static async saveSettings(settings: OptionalId<Settings>, isUpdate: boolean): Promise<void> {
		if (isUpdate) {
			await db.settings.update(1, { ...settings });
		} else {
			await db.settings.add({ ...settings });
		}
	}
}
