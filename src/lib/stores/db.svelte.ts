import type { ActiveEpisode, Episode, Feed, LogEntry, Settings } from '$lib/types/db';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import { Collection } from '@signaldb/core';
import { SvelteMap } from 'svelte/reactivity';
import svelteReactivityAdapter from "@signaldb/svelte";

export const db = {
	feeds: new Collection<Feed>({
		name: 'feeds',
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter('feeds.json')
	}),
	episodes: new Collection<Episode>({
		name: 'episodes',
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter('episodes.json')
	}),
	activeEpisodes: new Collection<ActiveEpisode>({
		name: 'activeEpisodes',
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter('activeEpisodes.json')
	}),
	logs: new Collection<LogEntry>({
		name: 'logs',
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter('logs.json')
	}),
	settings: new Collection<Settings>({
		name: 'settings',
		reactivity: svelteReactivityAdapter,
		persistence: createIndexedDBAdapter('settings.json')
	})
};

// consolidate live queries here

let feeds = $derived(db.feeds.find({}).fetch());
let episodes = $derived(db.episodes.find({}).fetch());
let activeEpisodes = $derived(db.activeEpisodes.find({}).fetch());
let settings = $derived(db.settings.findOne({ id: '1' }));

function getFeeds() {
	return feeds;
}

function getFeedIconsById() {
	return new SvelteMap(getFeeds().map((feed) => [feed.id, feed.iconData]));
}

function getEpisodes() {
	return episodes;
}

function getActiveEpisodes() {
	return activeEpisodes;
}

function getSettings() {
	return settings;
}

export { getFeeds, getFeedIconsById, getSettings, getEpisodes, getActiveEpisodes };
