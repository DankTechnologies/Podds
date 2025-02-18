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

export interface LogEntry {
	id: string;
	timestamp: number;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
}

// Helper type for creating new records without an ID
export type WithoutId<T> = Omit<T, 'id'>;

// Helper type for partial updates
export type UpdateFields<T> = Partial<Omit<T, 'id'>>;
