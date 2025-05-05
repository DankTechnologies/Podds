import type {
	SearchResponse,
	PodcastResponse,
	EpisodesResponse,
	PIApiFeed,
	PIApiEpisodeBase
} from '../types/podcast-index';

export class PodcastIndexClient {
	private apiUrl = `https://api.podcastindex.org/api/1.0`;
	private userAgent = 'podds/1.0';
	private version = '1.0';
	private key: string;
	private secret: string;

	constructor(key: string, secret: string) {
		this.key = key;
		this.secret = secret;
	}

	public async podcastById(id: number): Promise<PodcastResponse> {
		return this.fetchJSON('/podcasts/byfeedid', { id });
	}

	public async episodeByGuid(feedId: string, guid: string): Promise<PIApiEpisodeBase> {
		return this.fetchJSON('/episodes/byguid', { guid, feedid: feedId });
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

	public async testConnection(): Promise<boolean> {
		try {
			await this.fetchJSON('/categories/list');
			return true;
		} catch (error) {
			return false;
		}
	}

	public async searchFeeds(
		query: string,
		options: {
			clean?: boolean;
			max?: number;
			fulltext?: boolean;
		} = {}
	): Promise<Array<PIApiFeed>> {
		const response = (await this.fetchJSON('/search/byterm', {
			q: query,
			max: options.max,
			similar: true
		})) as SearchResponse;

		// Filter out dead feeds and deduplicate by title
		const uniqueFeeds = response.feeds
			.filter((feed) => !feed.dead && feed.episodeCount > 0)
			.sort((a, b) => (b.newestItemPubdate - a.newestItemPubdate))
			.reduce((acc, feed) => {
				const existingFeed = acc.find((f) => f.title === feed.title);
				if (!existingFeed || (feed.lastUpdateTime ?? 0) > (existingFeed.lastUpdateTime ?? 0)) {
					// If no existing feed with this title, or this feed has a newer update time
					// Remove the old one if it exists and add the new one
					if (existingFeed) {
						const index = acc.indexOf(existingFeed);
						acc.splice(index, 1);
					}
					acc.push(feed);
				}
				return acc;
			}, [] as PIApiFeed[]);

		return uniqueFeeds;
	}

	public async episodesByPerson(
		query: string,
		options: {
			max?: number;
			fulltext?: boolean;
		} = {}
	): Promise<Array<PIApiEpisodeBase>> {
		const response = (await this.fetchJSON('/search/byperson', {
			q: query,
			max: options.max,
			similar: true
		})) as EpisodesResponse;

		return response.items
			.reduce((acc, episode) => {
				const existingEpisodeByTitle = acc.find((e) => e.title === episode.title);
				const existingEpisodeByUrl = acc.find((e) => e.enclosureUrl === episode.enclosureUrl);

				// If we have a duplicate by URL, keep the most recently published one
				if (existingEpisodeByUrl) {
					if (episode.datePublished > existingEpisodeByUrl.datePublished) {
						const index = acc.indexOf(existingEpisodeByUrl);
						acc.splice(index, 1);
						acc.push(episode);
					}
					return acc;
				}

				// If we have a duplicate by title, keep the one with higher feedId
				if (existingEpisodeByTitle) {
					if (episode.feedId > existingEpisodeByTitle.feedId) {
						const index = acc.indexOf(existingEpisodeByTitle);
						acc.splice(index, 1);
						acc.push(episode);
					}
					return acc;
				}

				// No duplicates found, add the episode
				acc.push(episode);
				return acc;
			}, [] as PIApiEpisodeBase[]);
	}

	public async episodesByFeedIds(
		ids: string,
		options: {
			max?: number;
			since?: number;
			fulltext?: boolean;
		} = {}
	): Promise<EpisodesResponse> {
		return this.fetchJSON('/episodes/byfeedid', {
			...options,
			id: ids
		});
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
		const filteredQs = qs
			? Object.fromEntries(Object.entries(qs).filter(([_, v]) => v != null))
			: {};
		const queryString = new URLSearchParams(filteredQs).toString();
		const url = `${this.apiUrl}${endpoint}${queryString ? `?${queryString}` : ``}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: await this.generateHeaders()
		});

		if (!response.ok) {
			throw new Error(`Error fetching ${endpoint}: ${response.statusText}`);
		}

		const data = await response.json();
		return data;
	}
}

// Use Node's crypto in Node environment, otherwise use browser's crypto
async function sha1(data: string): Promise<string> {
	if (typeof crypto === 'undefined') {
		// Node environment
		const crypto = await import('crypto');
		return crypto.createHash('sha1').update(data).digest('hex');
	} else {
		// Browser or Web Worker environment
		const msgUint8 = new TextEncoder().encode(data);
		const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}
}

export default PodcastIndexClient;

// Export type for the client
export type { SearchResponse, PodcastResponse, EpisodesResponse };
