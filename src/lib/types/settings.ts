interface Settings {
	podcastIndexKey: string;
	podcastIndexSecret: string;
	lastSyncAt?: number;
	syncIntervalMinutes: number;
	isSyncing?: boolean;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
}
