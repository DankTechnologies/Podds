export const SessionInfo = $state({
	isFirstVisit: true,
	hasUpdate: false
});

export class SettingsService {
	private static SETTINGS_KEY = 'fluxcast_settings';

	static async getSettings(): Promise<Settings | null> {
		const settingsStr = localStorage.getItem(this.SETTINGS_KEY);
		return settingsStr ? JSON.parse(settingsStr) : null;
	}

	static async saveSettings(settings: Settings): Promise<void> {
		localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
	}

	static async updateSettings(partialSettings: Partial<Settings>): Promise<void> {
		const currentSettings = await this.getSettings();
		if (!currentSettings) throw new Error('Settings not found');

		const updatedSettings = { ...currentSettings, ...partialSettings };
		localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
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

		// Reset session info
		SessionInfo.isFirstVisit = true;
	}
}
