import type { SearchResponse, PodcastResponse, EpisodesResponse } from '../types/podcast-index';

// Use Node's crypto in Node environment, otherwise use browser's crypto
async function sha1(data: string): Promise<string> {
	if (typeof window === 'undefined') {
		// Node environment
		const crypto = await import('crypto');
		return crypto.createHash('sha1').update(data).digest('hex');
	} else {
		// Browser environment
		const msgUint8 = new TextEncoder().encode(data);
		const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}
}

export class PodcastIndexClient {
	private apiUrl = `https://api.podcastindex.org/api/1.0`;
	private userAgent = 'FluxcastClient/1.0';
	private version = '1.0';
	private key: string;
	private secret: string;

	constructor(key: string, secret: string) {
		this.key = key;
		this.secret = secret;
	}

	private async generateHeaders() {
		const apiHeaderTime = Math.floor(Date.now() / 1000);
		const data4Hash = this.key + this.secret + apiHeaderTime;
		const hash4Header = await sha1(data4Hash);

		return {
			'Content-Type': 'application/json',
			'X-Auth-Date': `${apiHeaderTime}`,
			'X-Auth-Key': this.key,
			Authorization: hash4Header,
			'User-Agent': `${this.userAgent}/${this.version}`
		};
	}

	private async fetchJSON<T>(endpoint: string, qs?: Record<string, any>): Promise<T> {
		const queryString = qs ? new URLSearchParams(qs).toString() : '';
		const url = `${this.apiUrl}${endpoint}${queryString ? `?${queryString}` : ``}`;

		console.log('Fetching URL:', url);
		console.log('Headers:', await this.generateHeaders());

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: await this.generateHeaders()
			});

			if (!response.ok) {
				throw new Error(`Error fetching ${endpoint}: ${response.statusText}`);
			}

			const data = await response.json();
			console.log('Response data:', data);
			return data;
		} catch (error) {
			console.error('Fetch error:', error);
			throw error;
		}
	}

	public async search(
		query: string,
		options: {
			clean?: boolean;
			max?: number;
			fulltext?: boolean;
		} = {}
	): Promise<SearchResponse> {
		return this.fetchJSON('/search/byterm', {
			q: query,
			max: options.max ?? 25,
			clean: Boolean(options.clean),
			fulltext: Boolean(options.fulltext)
		});
	}

	public async podcastById(id: number): Promise<PodcastResponse> {
		return this.fetchJSON('/podcasts/byfeedid', { id });
	}

	public async trending(
		options: {
			max?: number;
			lang?: string | string[];
		} = {}
	): Promise<SearchResponse> {
		const apiOptions: Record<string, string | number | undefined> = {
			max: options.max ?? 40
		};

		if (options.lang) {
			apiOptions.lang = Array.isArray(options.lang) ? options.lang.join(',') : options.lang;
		}

		return this.fetchJSON('/podcasts/trending', apiOptions);
	}

	public async episodesByPersion(
		query: string,
		options: {
			max?: number;
			fulltext?: boolean;
		} = {}
	): Promise<EpisodesResponse> {
		return this.fetchJSON('/search/byperson', {
			q: query,
			max: options.max ?? 25,
			fulltext: Boolean(options.fulltext)
		});
	}

	public async episodesByFeedUrl(
		url: string,
		options: {
			max?: number;
			since?: number;
			fulltext?: boolean;
		} = {}
	): Promise<EpisodesResponse> {
		return this.fetchJSON('/episodes/byfeedurl', {
			...options,
			since: options.since && Math.floor(options.since / 1000),
			url
		});
	}
}

export default PodcastIndexClient;

// Export type for the client
export type { SearchResponse, PodcastResponse, EpisodesResponse };
