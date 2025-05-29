import { vi } from 'vitest';

// Mock window and navigator globally
vi.stubGlobal('window', {
    location: new URL('https://podds.io'),
    matchMedia: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => true
    })
});

vi.stubGlobal('navigator', {
    userAgent: 'Mozilla/5.0',
    share: undefined,
    clipboard: {
        writeText: async () => { }
    }
}); 