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
}
