import type { Episode, Feed } from '$lib/types/db';
import type {
    ITunesPodcast,
    ITunesEpisode
} from '$lib/types/itunes';
import { resizeBase64Image } from '$lib/utils/resizeImage';

const apiUrl = 'https://itunes.apple.com/search';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;

export async function searchPodcasts(term: string, options: { limit?: number } = {}): Promise<Feed[]> {
    const params = new URLSearchParams({
        media: 'podcast',
        entity: 'podcast',
        term
    });
    const url = `${apiUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching podcasts: ${response.statusText}`);
    }
    const data = await response.json();

    // Filtering and sorting on raw iTunesPodcast objects
    const lowerTerm = term.trim().toLowerCase();
    let results = data.results as ITunesPodcast[];
    results = results.sort((a, b) => {
        // 1. Exact match on collectionName or collectionId
        const aExact = a.collectionName.toLowerCase() === lowerTerm || a.collectionId.toString() === term;
        const bExact = b.collectionName.toLowerCase() === lowerTerm || b.collectionId.toString() === term;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        // 2. collectionName contains term
        const aContains = a.collectionName.toLowerCase().includes(lowerTerm);
        const bContains = b.collectionName.toLowerCase().includes(lowerTerm);
        if (aContains && !bContains) return -1;
        if (!aContains && bContains) return 1;
        // 3. newestItemPubdate descending
        return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    });
    if (options.limit) {
        results = results.slice(0, options.limit);
    }
    const feeds = await Promise.all(results.map(mapITunesFeedToFeed)) as Feed[];
    return feeds;
}

export async function findPodcastByTitleAndUrl(title: string, url: string): Promise<Feed | null> {
    const podcasts = await searchPodcasts(title);

    if (podcasts.length === 0) {
        return null;
    }

    const exactUrlMatch = podcasts.find((p) => p.url === url);
    if (exactUrlMatch)
        return exactUrlMatch;

    const lowerTitle = title.trim().toLowerCase();
    const containsNameMatch = podcasts.find((p) => p.title.toLowerCase().includes(lowerTitle));
    if (containsNameMatch)
        return containsNameMatch;

    return podcasts.sort((a, b) => b.newestItemPubdate.getTime() - a.newestItemPubdate.getTime())[0];
}

export async function searchEpisodes(term: string, options: { limit?: number } = {}): Promise<Episode[]> {
    const params = new URLSearchParams({
        media: 'podcast',
        entity: 'podcastEpisode',
        term
    });

    const url = `${apiUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching episodes: ${response.statusText}`);
    }
    const data = await response.json();
    let results = data.results as ITunesEpisode[];

    const terms = term
        .replace(/["']/g, '')
        .toLowerCase()
        .trim()
        .split(' ')
        .filter(t => t.length > 0);

    results = results
        .filter(episode =>
            terms.every(term =>
                episode.trackName.toLowerCase().includes(term) ||
                (episode.description?.toLowerCase().includes(term) ?? false)
            )
        )
        .reduce((acc, episode) => {
            const existing = acc.get(episode.episodeGuid);
            return !existing || episode.collectionId > existing.collectionId
                ? acc.set(episode.episodeGuid, episode)
                : acc;
        }, new Map<string, ITunesEpisode>())
        .values()
        .toArray()
        .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

    if (options.limit) {
        results = results.slice(0, options.limit);
    }
    const episodes = await Promise.all(results.map(mapITunesEpisodeToEpisode)) as Episode[];
    return episodes;
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
        id: episode.episodeGuid,
        feedId: episode.collectionId.toString(),
        title: episode.trackName,
        publishedAt: new Date(episode.releaseDate),
        content: episode.description || '',
        url: episode.episodeUrl || '',
        durationMin: Math.floor(episode.trackTimeMillis / 60000),
        chaptersUrl: undefined,
        iconData,
    };
}
