export interface PIApiCategory {
	id: number;
	name: string;
}

interface PIApiEpisodeBase {
	id: number;
	title: string;
	link: string;
	description: string;
	guid: string;
	datePublished: number;
	datePublishedPretty: string;
	dateCrawled: number;
	enclosureUrl: string;
	enclosureType: string;
	enclosureLength: number;
	explicit: number;
	episode: number | null;
	episodeType: string | null;
	season: number;
	image: string;
	feedItunesId: number | null;
	feedImage: string;
	feedId: number;
	feedLanguage: string;
	chaptersUrl: string | null;
	duration: number;
	transcriptUrl: string | null;
}

interface PIApiFeedBase {
	id: number;
	title: string;
	url: string;
	itunesId: number | null;
	language: string;
	categories: {
		[k: string]: string;
	} | null;
}

export interface PIApiFeed extends PIApiFeedBase {
	originalUrl: string;
	link: string;
	description: string;
	author: string;
	ownerName: string;
	image: string;
	artwork: string;
	lastUpdateTime: number;
	type: PodcastFeedType;
}

export interface PIApiPodcast extends PIApiFeed {
	episodeCount: number;
	explicit: boolean;
}

export interface ApiResponse {
	status: 'true';
	description: string;
}

export interface SearchResponse extends ApiResponse {
	feeds: Array<PIApiFeed>;
	count: number;
	query: string;
}

export interface PodcastResponse extends ApiResponse {
	feed: PIApiPodcast;
	query: {
		url?: string;
		id?: string;
	};
}

export interface EpisodesResponse extends ApiResponse {
	items: Array<PIApiEpisodeBase>;
	count: number;
	query: string;
}

export enum PodcastFeedType {
	RSS = 0,
	ATOM = 1
}
