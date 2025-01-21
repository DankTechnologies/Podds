import Dexie, { type EntityTable } from 'dexie';
import { type Podcast, type Episode, type Settings } from '$lib/types/db';
const db = new Dexie('fluxcast') as Dexie & {
	podcasts: EntityTable<Podcast, 'id'>;
	episodes: EntityTable<Episode, 'id'>;
	settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
	podcasts: '++id, _titleSort',
	episodes: '++id, podcastId, title, state, publishedAt, lastUpdatedAt, sortOrder, [podcastId+id]',
	settings: '++id'
});

export { db };
