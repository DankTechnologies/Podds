interface Settings {
	id: number;
	host: string;
	apiKey: string;
	categories: string;
	lastSyncAt?: Date;
	syncIntervalHours: number;
	isSyncing?: boolean;
}

interface Podcast {
	id: number;
	title: string;
	lastUpdatedAt?: Date;
	newEpisodes: number;
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

type OptionalId<T extends { id: unknown }> = Omit<T, 'id'> & Partial<Pick<T, 'id'>>;

export type { Settings, Podcast, Episode, OptionalId };
