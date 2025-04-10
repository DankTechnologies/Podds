import { Log } from '$lib/service/LogService';
import type { Feed, Episode } from '$lib/types/db';

export interface ShareConfig {
    podcastIndexKey: string;
    podcastIndexSecret: string;
    feedId: string;
    episodePublishedAt?: number;
}

interface ShareOptions {
    title: string;
    text?: string;
    url: string;
}

export function encodeShareLink(config: ShareConfig): string {
    const parts = [
        config.podcastIndexKey,
        config.podcastIndexSecret,
        config.feedId
    ];

    if (config.episodePublishedAt) {
        parts.push(config.episodePublishedAt.toString());
    }

    const hash = encodeURIComponent(parts.join(' '));

    return `${window.location.origin}/share#${hash}`;
}

export function decodeShareLink(hash: string): ShareConfig {
    try {
        const parts = decodeURIComponent(hash).split(' ');

        return {
            podcastIndexKey: parts[0],
            podcastIndexSecret: parts[1],
            feedId: parts[2],
            episodePublishedAt: parts[3] ? parseInt(parts[3], 10) : undefined
        };
    } catch {
        throw new Error('Invalid share link format');
    }
}

export async function shareFeed(feed: Feed, podcastIndexKey: string, podcastIndexSecret: string): Promise<void> {
    const url = encodeShareLink({
        podcastIndexKey,
        podcastIndexSecret,
        feedId: feed.id
    });

    const success = await shareWithNative({
        title: feed.title,
        text: `Check out this podcast: ${feed.title}`,
        url
    });

    if (!success) {
        await shareWithClipboard(url);
    }
}

export async function shareEpisode(episode: Episode, feed: Feed, podcastIndexKey: string, podcastIndexSecret: string): Promise<void> {
    const url = encodeShareLink({
        podcastIndexKey,
        podcastIndexSecret,
        feedId: feed.id,
        episodePublishedAt: episode.publishedAt.getTime() / 1000
    });

    const success = await shareWithNative({
        title: `${feed.title} - ${episode.title}`,
        text: `Check out this podcast: ${episode.title}`,
        url
    });

    if (!success) {
        await shareWithClipboard(url);
    }
}

async function shareWithNative(options: ShareOptions): Promise<boolean> {
    if (!navigator.share) {
        return false;
    }

    try {
        await navigator.share(options);
        return true;
    } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
            Log.error(`Share failed: ${error.message}`);
        }
        return false;
    }
}

async function shareWithClipboard(url: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(url);
        alert('Share link copied to clipboard!');
    } catch (error) {
        Log.error(`Clipboard write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
