interface Settings {
	host: string;
	apiKey: string;
	categories: string;
	lastSyncAt?: number;
	syncIntervalHours: number;
	isSyncing?: boolean;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
}
