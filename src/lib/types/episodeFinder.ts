import type { Episode, Feed } from './db';

export interface EpisodeFinderRequest {
	feeds: Feed[];
	since?: number;
	corsHelper: string;
	corsHelper2: string | undefined;
	force: boolean;
}

export interface EpisodeFinderResponse {
	episodes: Episode[];
	feeds: Feed[];
	errors: string[];
}
