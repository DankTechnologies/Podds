import { getSettings } from '$lib/stores/db.svelte';
import type { Feed, Episode } from '$lib/types/db';

export interface ShareConfig {
    feedId: string;
    episodePublishedAt?: number;
    corsHelper?: string;
    corsHelper2?: string;
}

interface ShareOptions {
    title: string;
    text?: string;
    url: string;
}

export function getUrlHash(): string | null {
    const url = new URL(window.location.href);
    return url.hash.slice(1) ?? null;
}

export function getShareData(): ShareConfig | null {
    const hash = getUrlHash();
    return hash === null
        ? null
        : decodeShareLink(hash);
}

export function encodeShareLink(config: ShareConfig): string {
    const parts: string[] = [config.feedId];

    if (config.episodePublishedAt) {
        parts.push(config.episodePublishedAt.toString());
    }

    if (config.corsHelper) {
        parts.push(config.corsHelper.replace('https://', ''));
    }

    if (config.corsHelper2) {
        parts.push(config.corsHelper2.replace('https://', ''));
    }

    const hash = parts.join('+');
    return `${window.location.origin}/share#${hash}`;
}

export function decodeShareLink(hash: string): ShareConfig {
    try {
        const parts = hash.split('+');
        const config: ShareConfig = {
            feedId: parts[0]
        };

        // Check if we have an episode timestamp and/or CORS helpers
        if (parts.length > 1) {
            if (/^\d+$/.test(parts[1])) {
                config.episodePublishedAt = parseInt(parts[1], 10);
                // If we have CORS helpers, they'll be after the timestamp
                if (parts.length > 2) {
                    config.corsHelper = `https://${parts[2]}`;
                }
                if (parts.length > 3) {
                    config.corsHelper2 = `https://${parts[3]}`;
                }
            } else {
                config.corsHelper = `https://${parts[1]}`;

                if (parts.length > 2) {
                    config.corsHelper2 = `https://${parts[2]}`;
                }
            }
        }

        return config;
    } catch {
        throw new Error('Invalid share link format');
    }
}

export async function shareFeed(feed: Feed): Promise<void> {
    const settings = getSettings();

    const shareConfig: ShareConfig = {
        feedId: feed.id,
    };

    if (settings.isCustomCorsHelpers) {
        shareConfig.corsHelper = settings.corsHelper;
        shareConfig.corsHelper2 = settings.corsHelper2;
    }

    const url = encodeShareLink(shareConfig);

    const success = await shareWithNative({
        title: `🎙️ ${feed.title}`,
        text: `Tune into ${feed.title} on ${window.location.hostname}\n\n`,
        url
    });

    if (!success) {
        await shareWithClipboard(url);
    }
}

export async function shareEpisode(episode: Episode, feed: Feed): Promise<void> {
    const settings = getSettings();

    const shareConfig: ShareConfig = {
        feedId: feed.id,
        episodePublishedAt: episode.publishedAt.getTime() / 1000
    };

    if (settings.isCustomCorsHelpers) {
        shareConfig.corsHelper = settings.corsHelper;
        shareConfig.corsHelper2 = settings.corsHelper2;
    }

    const url = encodeShareLink(shareConfig);


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
        return false;
    }
}

async function shareWithClipboard(url: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(url);
        alert('Share link copied to clipboard!');
    } catch (error) {
    }
}
