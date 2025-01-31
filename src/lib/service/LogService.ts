import { db } from '$lib/db/FluxcastDb';
import type { LogEntry, OptionalId } from '$lib/types/db';

export class Log {
	private static async write(level: LogEntry['level'], message: string) {
		const entry: OptionalId<LogEntry> = {
			timestamp: new Date(),
			level,
			message
		};

		console[level](message);
		await db.log.add(entry);
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
}
