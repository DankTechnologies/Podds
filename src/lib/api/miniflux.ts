import type { Category, Entry, Feed } from './types/miniflux';

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

	async fetchFeedIcon(feedId: number): Promise<Blob> {
		return this.fetchBlob(`/v1/feeds/${feedId}/icon`);
	}

	async fetchEntries(
		feedId: number,
		options: { order?: string; direction?: string } = {}
	): Promise<Entry[]> {
		const queryParams = new URLSearchParams(options as Record<string, string>);
		return this.fetchJSON<Entry[]>(`/v1/feeds/${feedId}/entries?${queryParams.toString()}`);
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

	private async fetchBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
		const response = await fetch(`${this.host}${endpoint}`, {
			...options,
			headers: {
				'X-Auth-Token': this.apiKey,
				...options.headers
			}
		});

		if (!response.ok) {
			throw new Error(`Error fetching ${endpoint}: ${response.statusText}`);
		}

		return response.blob();
	}
}

export default MinifluxApi;
