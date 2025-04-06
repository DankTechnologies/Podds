export interface PIApiEpisodeBase {
	id: number;
	title: string;
	link: string;
	description: string;
	datePublished: number;
	enclosureUrl: string;
	enclosureType: string;
	enclosureLength: number;
	image: string;
	feedImage: string;
	feedId: number;
	feedTitle: string;
	chaptersUrl: string | null;
	duration: number;
}

export interface PIApiFeed {
	id: number;
	title: string;
	url: string;
	language: string;
	categories: Map<string, string>;
	link: string;
	description: string;
	episodeCount: number;
	newestItemPubdate: number;
	author: string;
	ownerName: string;
	image: string;
	artwork: string;
	lastUpdateTime: number;
	dead: boolean;
}

export interface PIApiPodcast extends PIApiFeed {
	episodeCount: number;
	explicit: boolean;
}

interface ApiResponse {
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
