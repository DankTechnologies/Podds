interface Settings {
	id?: number;
	host: string;
	apiKey: string;
	categories: string;
}

interface Podcast {
	id?: number;
	title: string;
	lastUpdatedAt?: Date;
	newEpisodes: number;
	icon: string;
	_titleSort: string;
}

interface Episode {
	id?: number;
	podcastId: number;
	podcastTitle: string;
	title: string;
	content: string;
	state?: 'history' | 'playing' | 'queue';
	publishedAt: Date;
	lastUpdatedAt?: Date;
	isDownloaded: boolean;
	file?: Blob;
	playbackPosition?: number;
}

export type { Settings, Podcast, Episode };
