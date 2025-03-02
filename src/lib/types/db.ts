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
	feedTitle: string;
	title: string;
	content: string;
	url: string;
	feedIconData: string;
	// Playback tracking
	playbackPosition: number;
	lastUpdatedAt: Date;
	completed: 0 | 1;
	isDownloaded: 0 | 1;
	// Queue management
	isPlaying: 0 | 1;
	upNextPosition?: number; // null if not in up next queue
	playedAt?: Date; // When it was last played, for history
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
