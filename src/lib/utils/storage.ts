export interface StorageInfo {
    cacheSize: number;
    dbSize: number;
    quota: number;
    usage: number;
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function calculateStorageUsage(): Promise<StorageInfo> {
    try {
        // Get storage quota
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;

        // Calculate Cache API size
        const cache = await caches.open('mp3-cache');
        const keys = await cache.keys();
        let totalCacheSize = 0;
        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalCacheSize += blob.size;
            }
        }

        // Get all IndexedDB databases
        const databases = await indexedDB.databases();
        let totalDbSize = 0;

        for (const dbInfo of databases) {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(dbInfo.name!);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            for (const storeName of db.objectStoreNames) {
                const store = db.transaction(storeName, 'readonly').objectStore(storeName);
                const data = await new Promise<any[]>((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
                totalDbSize += new Blob([JSON.stringify(data)]).size;
            }
            db.close();
        }

        return {
            cacheSize: totalCacheSize,
            dbSize: totalDbSize,
            quota,
            usage
        };
    } catch (error) {
        console.error('Error calculating storage usage:', error);
        return {
            cacheSize: 0,
            dbSize: 0,
            quota: 0,
            usage: 0
        };
    }
} 