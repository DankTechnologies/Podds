import Dexie, { type EntityTable } from 'dexie';

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

const db = new Dexie('fluxcast') as Dexie & {
	podcasts: EntityTable<Podcast, 'id'>;
	episodes: EntityTable<Episode, 'id'>;
	settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
	podcasts: '++id, title',
	episodes: '++id, podcastId, title, state, publishedAt, lastUpdatedAt, isDownloaded',
	settings: '++id'
});

export type { Podcast, Episode, Settings };
export { db };
