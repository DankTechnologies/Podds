interface Settings {
	id: number;
	host: string;
	apiKey: string;
	categories: string;
	lastSyncAt?: Date;
	syncIntervalHours: number;
	isSyncing?: boolean;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface Podcast {
	id: number;
	title: string;
	lastUpdatedAt?: Date;
	icon: string;
	_titleSort: string;
}

interface Episode {
	id: number;
	podcastId: number;
	podcastTitle: string;
	title: string;
	publishedAt: Date;
	lastPlayedAt?: Date;
	content: string;
	url: string;
	mime_type: string;
	size: number;
	durationMin: number;
	isDownloaded: 0 | 1;
	isPlaying: 0 | 1;
	playbackPosition?: number;
	sortOrder?: number;
}

interface LogEntry {
	id: number;
	timestamp: Date;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
}

type OptionalId<T extends { id: unknown }> = Omit<T, 'id'> & Partial<Pick<T, 'id'>>;

export type { Settings, Podcast, Episode, LogEntry, OptionalId };
