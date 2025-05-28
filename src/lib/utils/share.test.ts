import { describe, it, expect } from 'vitest';
import { encodeShareLink, decodeShareLink } from './share';

describe('share link encoding/decoding', () => {
    const baseConfig = {
        feedId: '123456'
    };

    const episodeConfig = {
        ...baseConfig,
        episodePublishedAt: 1234567890
    };

    const corsConfig = {
        ...baseConfig,
        corsHelper: 'https://cors1.example.com',
        corsHelper2: 'https://cors2.example.com'
    };

    const fullConfig = {
        ...episodeConfig,
        corsHelper: 'https://cors1.example.com',
        corsHelper2: 'https://cors2.example.com'
    };

    it('encodes and decodes feedId only', () => {
        const encoded = encodeShareLink(baseConfig);
        expect(encoded).toBe('https://podds.io/share#123456');

        const decoded = decodeShareLink(encoded.split('#')[1]);
        expect(decoded).toEqual(baseConfig);
    });

    it('encodes and decodes feedId with episode', () => {
        const encoded = encodeShareLink(episodeConfig);
        expect(encoded).toBe('https://podds.io/share#123456+1234567890');

        const decoded = decodeShareLink(encoded.split('#')[1]);
        expect(decoded).toEqual(episodeConfig);
    });

    it('encodes and decodes feedId with CORS helpers', () => {
        const encoded = encodeShareLink(corsConfig);
        expect(encoded).toBe('https://podds.io/share#123456+cors1.example.com+cors2.example.com');

        const decoded = decodeShareLink(encoded.split('#')[1]);
        expect(decoded).toEqual(corsConfig);
    });

    it('encodes and decodes full config', () => {
        const encoded = encodeShareLink(fullConfig);
        expect(encoded).toBe('https://podds.io/share#123456+1234567890+cors1.example.com+cors2.example.com');

        const decoded = decodeShareLink(encoded.split('#')[1]);
        expect(decoded).toEqual(fullConfig);
    });
}); 