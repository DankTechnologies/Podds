import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PodcastIndexClient } from '../podcast-index';

describe('PodcastIndexClient', () => {
	let client: PodcastIndexClient;

	beforeEach(() => {
		client = new PodcastIndexClient(
			'9CYB9WG7DWUETXKW4ETS',
			'PWnkH#Dt5cZE$TSZxtsT3ugF#3VrXx6DnjXXXcUw'
		);
		// global.fetch = vi.fn();
	});

	it('should search podcasts', async () => {
		const result = await client.search('localfirst.fm', { fulltext: true });
		const result2 = await client.episodesByPersion('Maggie Appleton', { fulltext: true });
		console.log(result);
		console.log(result2);
	});

	// it('should fetch podcast by id', async () => {
	// 	const mockResponse = {
	// 		status: 'true',
	// 		feed: { id: 123 },
	// 		description: 'Podcast details'
	// 	};

	// 	(global.fetch as any).mockResolvedValueOnce({
	// 		ok: true,
	// 		json: () => Promise.resolve(mockResponse)
	// 	});

	// 	const result = await client.podcastById(123);
	// 	expect(result).toEqual(mockResponse);
	// });

	// it('should handle API errors', async () => {
	// 	(global.fetch as any).mockResolvedValueOnce({
	// 		ok: false,
	// 		statusText: 'Not Found'
	// 	});

	// 	await expect(client.search('test')).rejects.toThrow('Error fetching /search/byterm: Not Found');
	// });

	// it('should fetch trending podcasts', async () => {
	// 	const mockResponse = {
	// 		status: 'true',
	// 		feeds: [],
	// 		count: 0,
	// 		description: 'Trending podcasts'
	// 	};

	// 	(global.fetch as any).mockResolvedValueOnce({
	// 		ok: true,
	// 		json: () => Promise.resolve(mockResponse)
	// 	});

	// 	const result = await client.trending({ lang: 'en' });

	// 	expect(result).toEqual(mockResponse);
	// 	expect(global.fetch).toHaveBeenCalledWith(
	// 		'https://api.podcastindex.org/api/1.0/podcasts/trending?max=40&lang=en',
	// 		expect.any(Object)
	// 	);
	// });

	// it('should fetch episodes by feed url', async () => {
	// 	const mockResponse = {
	// 		status: 'true',
	// 		items: [],
	// 		count: 0,
	// 		query: 'test',
	// 		description: 'Feed episodes'
	// 	};

	// 	(global.fetch as any).mockResolvedValueOnce({
	// 		ok: true,
	// 		json: () => Promise.resolve(mockResponse)
	// 	});

	// 	const result = await client.episodesByFeedUrl('https://example.com/feed.xml');

	// 	expect(result).toEqual(mockResponse);
	// 	expect(global.fetch).toHaveBeenCalledWith(
	// 		expect.stringContaining('/episodes/byfeedurl?url=https%3A%2F%2Fexample.com%2Ffeed.xml'),
	// 		expect.any(Object)
	// 	);
	// });
});
