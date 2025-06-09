import type { EpisodeCleanerResponse } from '$lib/types/episodeCleaner';
import * as Comlink from 'comlink';

async function deleteCachedAudio(url: string): Promise<void> {
    if ('caches' in self) {
        const cache = await caches.open('mp3-cache');
        // Find and delete matching cache entries
        const keys = await cache.keys();
        const matchingKey = keys.find(key =>
            key.url.includes(encodeURIComponent(url))
        );
        if (matchingKey) {
            await cache.delete(matchingKey);
        } else {
            throw new Error(`No matching cache entry found for URL ${url}`);
        }
    }
}

async function cleanEpisodes(urls: string[]): Promise<EpisodeCleanerResponse> {
    const deletedUrls: string[] = [];
    const errors: string[] = [];

    for (const url of urls) {
        try {
            await deleteCachedAudio(url);
            deletedUrls.push(url);
        } catch (error) {
            errors.push(`Failed to delete audio for URL ${url}: ${error}`);
        }
    }

    return {
        deletedUrls,
        errors
    };
}

Comlink.expose({
    cleanEpisodes
}); 