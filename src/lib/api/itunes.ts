import type { Episode, Feed } from '$lib/types/db';
import type {
    ITunesPodcast,
    ITunesEpisode
} from '$lib/types/itunes';
import { resizeBase64Image } from '$lib/utils/resizeImage';

const apiUrl = 'https://itunes.apple.com/search';
const lookupApiUrl = 'https://itunes.apple.com/lookup';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;

export async function searchPodcasts(term: string, options: { limit?: number } = {}): Promise<Feed[]> {
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
    const feeds = await Promise.all(data.results.map(mapITunesFeedToFeed)) as Feed[];
    feeds.sort((a, b) => b.newestItemPubdate.getTime() - a.newestItemPubdate.getTime());
    return feeds;
}

export async function findPocastById(id: string): Promise<Feed | null> {
    const params = new URLSearchParams({
        id,
        entity: 'podcast'
    });
    const url = `${lookupApiUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching podcast: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.results?.length) {
        return null;
    }
    return await mapITunesFeedToFeed(data.results[0] as ITunesPodcast);

}

export async function findPodcastByTitleAndUrl(title: string, url: string): Promise<Feed | null> {
    const podcasts = await searchPodcasts(title, { limit: 1 });
    if (podcasts.length === 0) {
        return null;
    }

    return podcasts
        .sort((a, b) => b.newestItemPubdate.getTime() - a.newestItemPubdate.getTime())
        .find((p) => p.url === url) ?? null;
}

export async function searchEpisodes(term: string, options: { limit?: number } = {}): Promise<Episode[]> {
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
    const episodes = await Promise.all(data.results.map(mapITunesEpisodeToEpisode)) as Episode[]

    const terms = term
        .replace(/["']/g, '')
        .toLowerCase()
        .trim()
        .split(' ')
        .filter(t => t.length > 0);

    return episodes
        .filter(episode =>
            terms.every(term =>
                episode.title.toLowerCase().includes(term) ||
                (episode.content?.toLowerCase().includes(term) ?? false)
            )
        )
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export async function lookupITunesPodcastById(collectionId: string): Promise<Feed | null> {
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
        return mapITunesFeedToFeed(data.results[0] as ITunesPodcast);
    }
    return null;
}


async function mapITunesFeedToFeed(feed: ITunesPodcast): Promise<Feed> {
    const iconData = await resizeBase64Image(
        feed.artworkUrl600,
        ICON_MAX_WIDTH,
        ICON_MAX_HEIGHT,
        undefined,
        undefined,
        feed.collectionName
    );

    return {
        id: feed.collectionId.toString(),
        title: feed.collectionName,
        author: feed.artistName,
        ownerName: feed.artistName,
        url: feed.feedUrl,
        iconData,
        episodeCount: feed.trackCount,
        newestItemPubdate: new Date(feed.releaseDate),
        categories: feed.primaryGenreName ? [feed.primaryGenreName] : [],
    };
}

async function mapITunesEpisodeToEpisode(episode: ITunesEpisode): Promise<Episode> {
    const iconData = await resizeBase64Image(
        episode.artworkUrl600,
        ICON_MAX_WIDTH,
        ICON_MAX_HEIGHT,
        undefined,
        undefined,
        episode.trackName
    );

    return {
        id: episode.trackId.toString(),
        feedId: episode.collectionId.toString(),
        title: episode.trackName,
        publishedAt: new Date(episode.releaseDate),
        content: episode.description || '',
        url: episode.episodeUrl || '',
        durationMin: episode.trackTimeMillis ? Math.floor(episode.trackTimeMillis / 60000) : 0,
        chaptersUrl: undefined,
        iconData,
    };
}
