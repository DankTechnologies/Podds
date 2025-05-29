import { Log } from './LogService';

export interface StorageStats {
	cacheSize: number;
	dbSize: number;
	quota: number;
	remaining: number;
	loading: boolean;
}

export const StorageInfo = $state({
	cacheSize: 0,
	dbSize: 0,
	quota: 0,
	remaining: 0,
	loading: true
});

export class StorageService {
	static async calculateStorageUsage(): Promise<void> {
		StorageInfo.loading = true;

		try {
			// Get cache size
			if ('caches' in window) {
				const cacheKeys = await caches.keys();
				let totalSize = 0;
				for (const key of cacheKeys) {
					const cache = await caches.open(key);
					const requests = await cache.keys();
					// Estimate size by summing response sizes
					for (const request of requests) {
						const response = await cache.match(request);
						if (response) {
							const blob = await response.blob();
							totalSize += blob.size;
						}
					}
				}
				StorageInfo.cacheSize = totalSize;
			}

			// Get detailed IndexedDB size
			let totalIDBSize = 0;
			if ('indexedDB' in window) {
				const databases = await window.indexedDB.databases();
				for (const db of databases) {
					if (!db.name) continue;

					try {
						const size = await this.getIDBDatabaseSize(db.name);
						totalIDBSize += size;
					} catch (err) {
						Log.error(`Error measuring database ${db.name}: ${err}`);
					}
				}
			}

			// Get quota information
			if (navigator.storage && navigator.storage.estimate) {
				const estimate = await navigator.storage.estimate();
				StorageInfo.quota = estimate.quota || 0;
				StorageInfo.dbSize = totalIDBSize; // Use our calculated size instead
				StorageInfo.remaining = estimate.quota ? estimate.quota - totalIDBSize : 0;
			}
		} catch (error) {
			Log.error('Failed to calculate storage usage: ' + error);
		}

		StorageInfo.loading = false;
	}

	private static async getIDBDatabaseSize(dbName: string): Promise<number> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName);

			request.onerror = () => reject(request.error);

			request.onsuccess = async () => {
				const db = request.result;
				let totalSize = 0;

				try {
					const storeNames = Array.from(db.objectStoreNames);
					for (const storeName of storeNames) {
						const transaction = db.transaction(storeName, 'readonly');
						const store = transaction.objectStore(storeName);

						// Get all records and calculate their sizes
						const allRecords = await new Promise<any[]>((resolve, reject) => {
							const req = store.getAll();
							req.onsuccess = () => resolve(req.result);
							req.onerror = () => reject(req.error);
						});

						// Calculate size of all records in this store
						const storeSize = allRecords.reduce((size, record) => {
							return size + new Blob([JSON.stringify(record)]).size;
						}, 0);

						totalSize += storeSize;
					}

					db.close();
					resolve(totalSize);
				} catch (error) {
					db.close();
					reject(error);
				}
			};
		});
	}

	static formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}
