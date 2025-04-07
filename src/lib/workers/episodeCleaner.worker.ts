import type { EpisodeCleanerRequest, EpisodeCleanerResponse } from '$lib/types/episodeCleaner';

async function deleteCachedAudio(url: string): Promise<void> {
    if ('caches' in self) {
        try {
            const cache = await caches.open('mp3-cache');
            // Find and delete matching cache entries
            const keys = await cache.keys();
            const matchingKey = keys.find(key =>
                key.url.includes(encodeURIComponent(url))
            );
            if (matchingKey) {
                await cache.delete(matchingKey);
            }
        } catch (error) {
            throw new Error(`Failed to clear cache for URL ${url}: ${error}`);
        }
    }
}

self.onmessage = async (e: MessageEvent<EpisodeCleanerRequest>) => {
    try {
        const { urls } = e.data;
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

        const response: EpisodeCleanerResponse = {
            deletedUrls,
            errors
        };

        self.postMessage(response);
    } catch (error) {
        self.postMessage({
            deletedUrls: [],
            errors: [`Worker error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
    }
}; 