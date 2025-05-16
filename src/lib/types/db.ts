export interface Feed {
	id: string;
	title: string;
	description?: string;
	author: string;
	ownerName: string;
	link?: string;
	url: string;
	iconData: string;
	episodeCount: number;
	newestItemPubdate: Date;
	lastModified?: Date;
	ttlMinutes?: number;
	lastCheckedAt?: Date;
	lastSyncedAt?: Date;
	categories: string[];
}

export interface Episode {
	id: string;
	feedId: string;
	title: string;
	publishedAt: Date;
	content: string;
	url: string;
	durationMin: number;
	chaptersUrl?: string;
	iconData?: string;
}

export interface ActiveEpisode {
	id: string;
	feedId: string;
	// denormalized fields
	durationMin: number;
	publishedAt: Date;
	feedTitle: string;
	title: string;
	content: string;
	url: string;
	chapters?: Chapter[];
	// activity tracking
	playbackPosition: number;
	minutesLeft: number;
	lastUpdatedAt: Date;
	isCompleted: 0 | 1;
	isDownloaded: 0 | 1;
	isPlaying: 0 | 1;
	wasAddedNext: 0 | 1;
	// queue management
	sortOrder?: number; // explicitly set when user reorders
}

export interface CompletedEpisode {
	id: string;
	feedId: string;
	publishedAt: Date;
	completedAt: Date;
	feedTitle: string;
	title: string;
}

export interface Chapter {
	title: string;
	startTime: number;
	endTime: number;
}

export interface LogEntry {
	id: string;
	timestamp: number;
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
}

export interface Settings {
	id: string;
	corsHelper: string;
	corsHelper2?: string;
	lastSyncAt: Date;
	syncIntervalMinutes: number;
	searchTermSyncIntervalHours: number;
	isPwaInstalled: boolean;
	isSyncing?: boolean;
	isAdvanced: boolean;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
	playbackSpeed: number;
	skipForwardButtonSeconds?: number;
	skipBackwardButtonSeconds?: number;
	completedEpisodeRetentionDays?: number;
	inProgressEpisodeRetentionDays?: number;
	goBackOnResumeSeconds?: number;
	primaryColor?: string;
	hugged: boolean;
}

export interface SearchHistory {
	id: string;
	term: string;
	executedAt: Date;
	latestEpisodePublishedAt: Date;
	monitored: boolean;
	hasNewResults: boolean;
}

// Helper type for creating new records without an ID
export type WithoutId<T> = Omit<T, 'id'>;

// Helper type for partial updates
export type UpdateFields<T> = Partial<Omit<T, 'id'>>;
