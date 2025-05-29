import type { Feed } from './db';
import type { Settings, RefreshCw, PackageOpen } from 'lucide-svelte';

export interface GridShortcut {
    type: 'shortcut';
    id: 'settings' | 'update' | 'receive';
    url?: string;
    action?: () => void;
    svg: typeof Settings | typeof RefreshCw | typeof PackageOpen;
}

export type GridItem = Feed | GridShortcut;

export function isShortcut(item: GridItem): item is GridShortcut {
    return 'type' in item && item.type === 'shortcut';
} 