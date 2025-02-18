import type { Episode, Feed, LogEntry, Settings } from '$lib/types/db';
import createOPFSAdapter from '@signaldb/opfs';
import { Collection } from '@signaldb/core';

// Shared reactivity configuration for all collections
const reactivityConfig = {
	create() {
		let dep = $state(0);
		return {
			depend() {
				dep;
			},
			notify() {
				dep += 1;
			}
		};
	},
	isInScope: () => !!$effect.tracking()
};

export const db = {
	feeds: new Collection<Feed>({
		name: 'feeds',
		reactivity: reactivityConfig,
		persistence: createOPFSAdapter('feeds.json')
	}),
	episodes: new Collection<Episode>({
		name: 'episodes',
		reactivity: reactivityConfig,
		persistence: createOPFSAdapter('episodes.json')
	}),
	logs: new Collection<LogEntry>({
		name: 'logs',
		reactivity: reactivityConfig,
		persistence: createOPFSAdapter('logs.json')
	}),
	settings: new Collection<Settings>({
		name: 'settings',
		reactivity: reactivityConfig,
		persistence: createOPFSAdapter('settings.json')
	})
};

// consolidate live queries here

let feeds = $state.raw<Feed[]>([]);
let playingEpisode = $state.raw<Episode>();
let mostRecentEpisode = $state.raw<Episode>();
let settings = $state.raw<Settings>();

$effect.root(() => {
	$effect(() => {
		const feedsCursor = db.feeds.find();
		feeds = feedsCursor.fetch();

		return () => {
			feedsCursor.cleanup();
		};
	});

	$effect(() => {
		playingEpisode = db.episodes.findOne({ isPlaying: 1 });
	});

	$effect(() => {
		mostRecentEpisode = db.episodes.findOne({}, { sort: { publishedAt: -1 } });
	});

	$effect(() => {
		settings = db.settings.findOne({ id: '1' });
	});
});

function getAllFeeds() {
	return feeds;
}

function getPlayingEpisode() {
	return playingEpisode;
}

function getSettings() {
	return settings;
}

export { getAllFeeds, getPlayingEpisode, getSettings };
