import type { Episode, Icon, LogEntry } from '$lib/types/db';
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
	icons: new Collection<Icon>({
		name: 'icons',
		reactivity: reactivityConfig,
		persistence: createOPFSAdapter('icons.json')
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
