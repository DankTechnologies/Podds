import { Log } from '$lib/service/LogService';
import type { Feed, Episode } from '$lib/types/db';

export interface ShareConfig {
    podcastIndexKey: string;
    podcastIndexSecret: string;
    corsHelper: string;
    corsHelper2?: string;
    feedId: string;
    episodePublishedAt?: number;
}

interface ShareOptions {
    title: string;
    text?: string;
    url: string;
}

function shortenUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const currentHost = window.location.hostname;

        if (urlObj.hostname.endsWith('.workers.dev')) {
            // Case 1: Cloudflare workers
            const subdomain = urlObj.hostname.replace('.workers.dev', '');
            return `@${subdomain}`;
        } else if (urlObj.hostname.endsWith(currentHost)) {
            // Case 2: Subdomain of current host
            const subdomain = urlObj.hostname.replace(`.${currentHost}`, '');
            return `#${subdomain}`;
        }

        // Case 3: Regular URL - remove https:// prefix
        return url.replace(/^https:\/\//, '');
    } catch {
        return url;
    }
}

function expandUrl(shortUrl: string): string {
    if (shortUrl.startsWith('@')) {
        // Case 1: Cloudflare worker
        return `https://${shortUrl.slice(1)}.workers.dev`;
    } else if (shortUrl.startsWith('#')) {
        // Case 2: Subdomain of current host
        return `https://${shortUrl.slice(1)}.${window.location.hostname}`;
    }

    // Case 3: Regular URL - add https:// prefix
    return `https://${shortUrl}`;
}

export function encodeShareLink(config: ShareConfig): string {
    const parts = [
        config.podcastIndexKey,
        config.podcastIndexSecret,
        config.corsHelper2
            ? `${shortenUrl(config.corsHelper)}|||${shortenUrl(config.corsHelper2)}`
            : shortenUrl(config.corsHelper),
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

        const corsHelpers = parts[2].split('|||');
        const corsHelper = expandUrl(corsHelpers[0]);
        const corsHelper2 = corsHelpers.length > 1 ? expandUrl(corsHelpers[1]) : undefined;

        return {
            podcastIndexKey: parts[0],
            podcastIndexSecret: parts[1],
            corsHelper,
            corsHelper2,
            feedId: parts[3],
            episodePublishedAt: parts[4] ? parseInt(parts[4], 10) : undefined
        };
    } catch {
        throw new Error('Invalid share link format');
    }
}

export async function shareFeed(feed: Feed, podcastIndexKey: string, podcastIndexSecret: string, corsHelper: string, corsHelper2?: string): Promise<void> {
    const url = encodeShareLink({
        podcastIndexKey,
        podcastIndexSecret,
        corsHelper,
        corsHelper2,
        feedId: feed.id
    });

    const success = await shareWithNative({
        title: `🎙️ ${feed.title}`,
        text: `Tune into ${feed.title} on ${window.location.hostname}\n\n`,
        url
    });

    if (!success) {
        await shareWithClipboard(url);
    }
}

export async function shareEpisode(episode: Episode, feed: Feed, podcastIndexKey: string, podcastIndexSecret: string, corsHelper: string, corsHelper2?: string): Promise<void> {
    const url = encodeShareLink({
        podcastIndexKey,
        podcastIndexSecret,
        corsHelper,
        corsHelper2,
        feedId: feed.id,
        episodePublishedAt: episode.publishedAt.getTime() / 1000
    });

    const success = await shareWithNative({
        title: `🎙️ "${episode.title}" on ${feed.title}`,
        text: `"${episode.title}" on ${feed.title}\n\n`,
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
