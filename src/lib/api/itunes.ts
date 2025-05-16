import type {
    ITunesPodcast,
    ITunesEpisode
} from '$lib/types/itunes';

const apiUrl = 'https://itunes.apple.com/search';
const lookupApiUrl = 'https://itunes.apple.com/lookup';

export async function searchPodcasts(term: string, options: { limit?: number } = {}): Promise<ITunesPodcast[]> {
    const params = new URLSearchParams({
        media: 'podcast',
        entity: 'podcast',
        term,
        limit: String(options.limit ?? 20)
    });
    const url = `${apiUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching podcasts: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data.results) ? data.results as ITunesPodcast[] : [];
}

export async function searchEpisodes(term: string, options: { limit?: number } = {}): Promise<ITunesEpisode[]> {
    const params = new URLSearchParams({
        media: 'podcast',
        entity: 'podcastEpisode',
        term,
        limit: String(options.limit ?? 20)
    });
    const url = `${apiUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching episodes: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data.results) ? data.results as ITunesEpisode[] : [];
}

export async function lookupITunesPodcastById(collectionId: string): Promise<ITunesPodcast | null> {
    const params = new URLSearchParams({
        id: collectionId,
        entity: 'podcast'
    });
    const url = `${lookupApiUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error looking up podcast: ${response.statusText}`);
    }
    const data = await response.json();
    if (Array.isArray(data.results) && data.results.length > 0) {
        // The first result should be the podcast
        return data.results[0] as ITunesPodcast;
    }
    return null;
} 