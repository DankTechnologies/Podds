import { db } from '$lib/stores/db.svelte';
import type { LogEntry } from '$lib/types/db';

export class Log {
	private static async write(level: LogEntry['level'], message: string) {
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
