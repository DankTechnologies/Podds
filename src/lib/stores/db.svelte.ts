import type { Episode, Feed, LogEntry } from '$lib/types/db';
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
	})
};

// consolidate live queries here

let feeds = $state.raw<Feed[]>([]);

$effect.root(() => {
	$effect(() => {
		const feedsCursor = db.feeds.find();
		feeds = feedsCursor.fetch();

		return () => {
			feedsCursor.cleanup();
		};
	});
});

export function getAllFeeds() {
	return feeds;
}

let playingEpisode = $state.raw<Episode>();

$effect.root(() => {
	$effect(() => {
		playingEpisode = db.episodes.findOne({ isPlaying: 1 });
	});
});

export function getPlayingEpisode() {
	return playingEpisode;
}
