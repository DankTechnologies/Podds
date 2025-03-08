export interface Feed {
	id: string;
	title: string;
	iconData: string;
	lastUpdatedAt?: Date;
}

export interface Episode {
	id: string;
	feedId: string;
	title: string;
	publishedAt: Date;
	content: string;
	url: string;
	durationMin: number;
}

export interface ActiveEpisode {
	id: string;
	feedId: string;
	// denormalized fields
	durationMin: number;
	feedTitle: string;
	title: string;
	content: string;
	url: string;
	// activity tracking
	playbackPosition: number;
	minutesLeft: number;
	lastUpdatedAt: Date;
	isCompleted: 0 | 1;
	isDownloaded: 0 | 1;
	isPlaying: 0 | 1;
	// queue management
	sortOrder?: number; // explicitly set when user reorders
}

export interface LogEntry {
	id: string;
	timestamp: number;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
}

export interface Settings {
	id: string;
	podcastIndexKey: string;
	podcastIndexSecret: string;
	lastSyncAt?: Date;
	syncIntervalMinutes: number;
	isSyncing?: boolean;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Helper type for creating new records without an ID
export type WithoutId<T> = Omit<T, 'id'>;

// Helper type for partial updates
export type UpdateFields<T> = Partial<Omit<T, 'id'>>;
