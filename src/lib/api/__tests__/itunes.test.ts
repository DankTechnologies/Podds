import { describe, it, expect } from 'vitest';
import { searchPodcasts, searchEpisodes } from '$lib/api/itunes';

describe('iTunes API functions', () => {
    it('should search for podcasts', async () => {
        const results = await searchPodcasts('Fresh Air', { limit: 3 });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toHaveProperty('collectionName');
        expect(results[0]).toHaveProperty('feedUrl');
    });

    it('should search for episodes', async () => {
        const results = await searchEpisodes('AI', { limit: 3 });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toHaveProperty('trackName');
        expect(results[0]).toHaveProperty('releaseDate');
    });
}); 