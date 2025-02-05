import Dexie, { type EntityTable } from 'dexie';
import { type Podcast, type Episode, type LogEntry } from '$lib/types/db';
const db = new Dexie('fluxcast') as Dexie & {
	podcasts: EntityTable<Podcast, 'id'>;
	episodes: EntityTable<Episode, 'id'>;
	log: EntityTable<LogEntry, 'id'>;
};

db.version(1).stores({
	podcasts: '++id, _titleSort',
	episodes:
		'++id, podcastId, title, state, publishedAt, lastUpdatedAt, sortOrder, isPlaying, isDownloaded, [podcastId+id]',
	log: '++id, timestamp, level'
});

export { db };
