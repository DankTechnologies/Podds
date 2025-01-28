export interface Category {
	id: number;
	title: string;
}

export interface Feed {
	id: number;
	title: string;
	site_url: string;
}

export interface FeedWithIcon extends Feed {
	icon: string;
}

export interface FeedIconResult {
	data: string;
}

export interface Entry {
	id: number;
	title: string;
	url: string; // website link
	content: string;
	published_at: string;
	reading_time: number;
	feed: Feed;
	enclosures: Enclosure[];
}

export interface Enclosure {
	url: string; // mp3 link
	mime_type: string;
	size: number;
}

export interface EntrySearchResult {
	total: number;
	entries: Entry[];
}
