import type { ActiveEpisode, CompletedEpisode, Episode, Feed, LogEntry, Settings, SearchHistory } from '$lib/types/db';
import createIndexedDBAdapter from '@signaldb/indexeddb';
import { Collection } from '@signaldb/core';
import { SvelteMap } from 'svelte/reactivity';
import { DefaultSettings } from '$lib/service/SettingsService.svelte';

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
		persistence: createIndexedDBAdapter('feeds.json')
	}),
	episodes: new Collection<Episode>({
		name: 'episodes',
		reactivity: reactivityConfig,
		persistence: createIndexedDBAdapter('episodes.json')
	}),
	activeEpisodes: new Collection<ActiveEpisode>({
		name: 'activeEpisodes',
		reactivity: reactivityConfig,
		persistence: createIndexedDBAdapter('activeEpisodes.json')
	}),
	completedEpisodes: new Collection<CompletedEpisode>({
		name: 'completedEpisodes',
		reactivity: reactivityConfig,
		persistence: createIndexedDBAdapter('completedEpisodes.json')
	}),
	logs: new Collection<LogEntry>({
		name: 'logs',
		reactivity: reactivityConfig,
		persistence: createIndexedDBAdapter('logs.json')
	}),
	settings: new Collection<Settings>({
		name: 'settings',
		reactivity: reactivityConfig,
		persistence: createIndexedDBAdapter('settings.json')
	}),
	searchHistory: new Collection<SearchHistory>({
		name: 'searchHistory',
		reactivity: reactivityConfig,
		persistence: createIndexedDBAdapter('searchHistory.json')
	})
};

// consolidate live queries here

let feeds = $state.raw<Feed[]>([]);
let episodes = $state.raw<Episode[]>([]);
let activeEpisodes = $state.raw<ActiveEpisode[]>([]);
let settings = $state.raw<Settings>();
let searchHistory = $state.raw<SearchHistory[]>([]);
let logs = $state.raw<LogEntry[]>([]);

$effect.root(() => {
	$effect(() => {
		const feedsCursor = db.feeds.find();
		feeds = feedsCursor.fetch();

		return () => {
			feedsCursor.cleanup();
		};
	});

	$effect(() => {
		const episodesCursor = db.episodes.find();
		episodes = episodesCursor.fetch();

		return () => {
			episodesCursor.cleanup();
		};
	});

	$effect(() => {
		const activeEpisodesCursor = db.activeEpisodes.find();
		activeEpisodes = activeEpisodesCursor.fetch();

		return () => {
			activeEpisodesCursor.cleanup();
		};
	});

	$effect(() => {
		settings = db.settings.findOne({ id: '1' });
	});

	$effect(() => {
		const searchHistoryCursor = db.searchHistory.find();
		searchHistory = searchHistoryCursor.fetch();

		return () => {
			searchHistoryCursor.cleanup();
		};
	});

	$effect(() => {
		const logsCursor = db.logs.find();
		logs = logsCursor.fetch();

		return () => {
			logsCursor.cleanup();
		};
	});
});

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
	return settings ?? DefaultSettings;
}

function getSearchHistory() {
	return searchHistory;
}

function getLogs() {
	return logs;
}

export { getFeeds, getFeedIconsById, getSettings, getEpisodes, getActiveEpisodes, getSearchHistory, getLogs };
