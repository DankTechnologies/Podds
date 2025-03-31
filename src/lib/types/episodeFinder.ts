import type { Episode, Feed } from './db';

export interface FinderRequest {
	feeds: Feed[];
	since?: number;
}

export interface FinderResponse {
	episodes: Episode[];
	errors: string[];
}
