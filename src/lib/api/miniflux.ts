import type { Category, EntrySearchResult, Feed, FeedIconResult } from './types/miniflux';

interface EntryOptions {
	order?: string;
	direction?: string; 
	limit?: number;
	published_after?: number;
}

class MinifluxApi {
	private host: string;
	private apiKey: string;

	constructor(host: string, apiKey: string) {
		this.host = host;
		this.apiKey = apiKey;
	}

	async fetchCategories(): Promise<Category[]> {
		return this.fetchJSON<Category[]>('/v1/categories');
	}

	async fetchFeedsForCategory(categoryId: number): Promise<Feed[]> {
		return this.fetchJSON<Feed[]>(`/v1/categories/${categoryId}/feeds`);
	}

	async fetchFeedIcon(feedId: number): Promise<string> {
		return this.fetchJSON<FeedIconResult>(`/v1/feeds/${feedId}/icon`)
			.then(result => result.data);
	}

	async fetchEntriesForCategory(categoryId: number, options: EntryOptions = {} ): Promise<EntrySearchResult> {
		const queryParams = new URLSearchParams(options as Record<string, string>);
		return this.fetchJSON<EntrySearchResult>(`/v1/categories/${categoryId}/entries?${queryParams.toString()}`);
	}

	async fetchEntriesForFeed(feedId: number, options: EntryOptions = {} ): Promise<EntrySearchResult> {
		const queryParams = new URLSearchParams(options as Record<string, string>);
		return this.fetchJSON<EntrySearchResult>(`/v1/feeds/${feedId}/entries?${queryParams.toString()}`);
	}
	
	private async fetchJSON<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const response = await fetch(`${this.host}${endpoint}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'X-Auth-Token': this.apiKey,
				...options.headers
			}
		});

		if (!response.ok) {
			throw new Error(`Error fetching ${endpoint}: ${response.statusText}`);
		}

		return response.json();
	}

}

export default MinifluxApi;
