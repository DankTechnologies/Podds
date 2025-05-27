import { Log } from '$lib/service/LogService';
import { getSettings } from '$lib/stores/db.svelte';
import type { Episode, Feed } from '$lib/types/db';
import type {
    ITunesPodcast,
    ITunesEpisode
} from '$lib/types/itunes';
import { resizeBase64Image } from '$lib/utils/resizeImage';

const apiUrl = 'https://itunes.apple.com/search';

const ICON_MAX_WIDTH = 300;
const ICON_MAX_HEIGHT = 300;

export async function searchPodcasts(term: string, options: { limit?: number; skipConvertIcon?: boolean } = {}): Promise<Feed[]> {
    const params = new URLSearchParams({
        media: 'podcast',
        entity: 'podcast',
        term
    });
    const url = `${apiUrl}?${params.toString()}`;
    const data = await fetchWithCorsFallback(url);
    let results = data.results as ITunesPodcast[];

    const lowerTerm = term.trim().toLowerCase();

    results = results
        .reduce((acc, podcast) => {
            // eliminiate duplicates with same name + feed URL
            const existing = acc.get(podcast.collectionName + podcast.feedUrl);
            return !existing || podcast.trackCount > existing.trackCount
                ? acc.set(podcast.collectionName + podcast.feedUrl, podcast)
                : acc;
        }, new Map<string, ITunesPodcast>())
        .values()
        .toArray()
        .sort((a, b) => {
            // 1. Exact match on collectionName or collectionId, but only if trackCount >= 3
            const aExact = (a.collectionName.toLowerCase() === lowerTerm || a.collectionId.toString() === term) && a.trackCount >= 3;
            const bExact = (b.collectionName.toLowerCase() === lowerTerm || b.collectionId.toString() === term) && b.trackCount >= 3;
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
    const feeds = await Promise.all(results.map(feed => mapITunesFeedToFeed(feed, { skipConvertIcon: options.skipConvertIcon }))) as Feed[];
    return feeds;
}

export async function findPodcastByEpisode(episode: Episode): Promise<Feed | null> {
    let podcasts = await searchPodcasts(episode.feedId, { limit: 1 });

    if (podcasts.length === 0) {
        const feedTitle = episode.title.match(/^\[(.+?)\]/)?.[1];
        if (feedTitle) {
            podcasts = await searchPodcasts(feedTitle, { limit: 1 });
        }
    }

    return podcasts[0] ?? null;
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

export async function searchEpisodes(term: string, options: { limit?: number; skipConvertIcon?: boolean } = {}): Promise<Episode[]> {
    const params = new URLSearchParams({
        media: 'podcast',
        entity: 'podcastEpisode',
        term
    });

    const url = `${apiUrl}?${params.toString()}`;
    const data = await fetchWithCorsFallback(url);
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
    const episodes = await Promise.all(results.map(episode => mapITunesEpisodeToEpisode(episode, { skipConvertIcon: options.skipConvertIcon }))) as Episode[];
    return episodes;
}

async function mapITunesFeedToFeed(feed: ITunesPodcast, options: { skipConvertIcon?: boolean } = {}): Promise<Feed> {
    const iconData = options.skipConvertIcon
        ? feed.artworkUrl600
        : await resizeBase64Image(
            feed.artworkUrl600,
            ICON_MAX_WIDTH,
            ICON_MAX_HEIGHT,
            undefined,
            undefined,
            feed.collectionName
        );

    return {
        id: feed.collectionId.toString(),
        isSubscribed: 1,
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

async function mapITunesEpisodeToEpisode(episode: ITunesEpisode, options: { skipConvertIcon?: boolean } = {}): Promise<Episode> {
    const iconData = options.skipConvertIcon
        ? episode.artworkUrl600
        : await resizeBase64Image(
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
        title: `[${episode.collectionName}] ${episode.trackName}`,
        publishedAt: new Date(episode.releaseDate),
        content: episode.description || '',
        url: episode.episodeUrl || '',
        durationMin: Math.floor(episode.trackTimeMillis / 60000),
        chaptersUrl: undefined,
        iconData,
    };
}

export async function convertUrlToBase64(url: string, title: string): Promise<string> {
    if (!url || url.startsWith('data:')) {
        return url;
    }

    return await resizeBase64Image(
        url,
        ICON_MAX_WIDTH,
        ICON_MAX_HEIGHT,
        undefined,
        undefined,
        title
    );
}

async function fetchWithCorsFallback(url: string): Promise<any> {
    const settings = getSettings();

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                throw new Error('No results found');
            }
            return data;
        }
    } catch (error) {
        Log.debug(`Failed to fetch ${url}: ${error}`);
    }

    try {
        const corsUrl = `${settings.corsHelper}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
        const corsResponse = await fetch(corsUrl);
        if (corsResponse.ok) {
            return await corsResponse.json();
        }
    } catch (error) {
        Log.debug(`Failed to fetch ${url}: ${error}`);
    }

    if (settings.corsHelper2) {
        try {
            const corsUrl2 = `${settings.corsHelper2}?url=${encodeURIComponent(url)}&nocache=${Date.now()}`;
            const corsResponse2 = await fetch(corsUrl2);
            if (corsResponse2.ok) {
                return await corsResponse2.json();
            }
        } catch (error) {
            Log.debug(`Failed to fetch ${url}: ${error}`);
        }
    }

    throw new Error(`Unable to fetch data at ${url}`);
}
