import type { Episode, Feed } from './db';

export interface EpisodeFinderRequest {
	feeds: Feed[];
	since?: number;
	corsHelperUrl: string;
	corsHelperBackupUrl: string | undefined;
}

export interface EpisodeFinderResponse {
	episodes: Episode[];
	feeds: Feed[];
	errors: string[];
}
