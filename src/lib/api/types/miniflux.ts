export interface Category {
	id: number;
	title: string;
}

export interface Feed {
	id: number;
	title: string;
	site_url: string;
}

export interface Entry {
	id: number;
	title: string;
	url: string;
	content: string;
	published_at: string;
}

export interface EntrySearchResult {
	total: number;
	entries: Entry[];
}
