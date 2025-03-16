import type { Episode, Feed } from './db';

export interface FinderRequest {
	apiKey: string;
	apiSecret: string;
	feeds: Feed[];
	since?: number;
}

export interface FinderResponse {
	episodes: Episode[];
	errors: string[];
}
