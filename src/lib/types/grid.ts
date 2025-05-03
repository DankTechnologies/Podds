import type { Feed } from './db';
import type { Settings, Share2, RefreshCw } from 'lucide-svelte';

export interface GridShortcut {
    type: 'shortcut';
    id: 'settings' | 'share' | 'update';
    url?: string;
    action?: () => void;
    svg: typeof Settings | typeof Share2 | typeof RefreshCw;
}

export type GridItem = Feed | GridShortcut;

export function isShortcut(item: GridItem): item is GridShortcut {
    return 'type' in item && item.type === 'shortcut';
} 