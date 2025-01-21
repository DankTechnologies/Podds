interface Settings {
	id: number;
	host: string;
	apiKey: string;
	categories: string;
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
	isDownloaded: boolean;
	isPlaying: false;
	playbackPosition?: number;
	sortOrder?: number;
}

export type { Settings, Podcast, Episode };
