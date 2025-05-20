import { db, getSettings } from '$lib/stores/db.svelte';
import type { LogEntry } from '$lib/types/db';

export class Log {
	private static levels = {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3
	} as const;

	private static async write(level: LogEntry['level'], message: string) {
		let settings = getSettings();
		if (settings.logLevel && Log.levels[level] < Log.levels[settings.logLevel]) {
			return;
		}

		const entry: LogEntry = {
			id: crypto.randomUUID(),
			timestamp: Date.now(),
			level,
			message
		};

		console[level](message);
		db.logs.insert(entry);
	}

	static debug(message: string) {
		return this.write('debug', message);
	}

	static info(message: string) {
		return this.write('info', message);
	}

	static warn(message: string) {
		return this.write('warn', message);
	}

	static error(message: string) {
		return this.write('error', message);
	}

	static initServiceWorkerLogging() {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.addEventListener('message', (event) => {
				if (event.data?.type === 'LOG') {
					const { level, message } = event.data;
					this.write(level, `[SW] ${message}`);
				}
			});
		}
	}
}
