import { db } from '$lib/stores/db.svelte';
import type { SearchHistory } from '$lib/types/db';
import { Log } from '$lib/service/LogService';
import PodcastIndexClient from '$lib/api/podcast-index';
import { getSettings } from '$lib/stores/db.svelte';
import { isOnline } from '$lib/utils/networkState.svelte';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export class SearchHistoryService {
    private api: PodcastIndexClient | null = null;

    static addSearchHistory(term: string, latestEpisodePublishedAt: Date): void {
        const existingSearch = this.findSearchHistory(term);

        if (existingSearch) {
            db.searchHistory.updateOne(
                { id: existingSearch.id },
                {
                    $set: {
                        executedAt: new Date(),
                        latestEpisodePublishedAt
                    }
                }
            );
        } else {
            db.searchHistory.insert({
                id: crypto.randomUUID(),
                term,
                executedAt: new Date(),
                latestEpisodePublishedAt,
                monitored: false,
                hasNewResults: false
            });
        }
    }

    static findSearchHistory(term: string): SearchHistory | undefined {
        return db.searchHistory.findOne({ term });
    }

    static getMonitoredSearchHistory(): SearchHistory[] {
        return db.searchHistory.find({ monitored: true }, { sort: { executedAt: 1 } }).fetch();
    }

    static getAllSearchHistory(): SearchHistory[] {
        return db.searchHistory.find({}, { sort: { executedAt: -1 } }).fetch();
    }

    static deleteSearchHistory(id: string): void {
        db.searchHistory.removeOne({ id });
    }

    static clearHasNewResults(id: string): void {
        db.searchHistory.updateOne({ id }, { $set: { hasNewResults: false } });
    }

    static toggleMonitor(id: string): void {
        const search = db.searchHistory.findOne({ id });
        if (!search) {
            Log.error(`Search history ${id} not found`);
            return;
        }

        db.searchHistory.updateOne({ id }, { $set: { monitored: !search.monitored } });
    }

    async updateMonitoredSearches() {
        const settings = getSettings();
        if (!settings) {
            Log.warn('Settings not found, skipping search updates');
            return;
        }

        await this.initialize();

        const monitoredSearches = SearchHistoryService.getMonitoredSearchHistory();

        if (monitoredSearches.length === 0) {
            Log.debug('No monitored searches found, skipping update');
            return;
        }

        Log.info('Starting update of monitored searches');

        for (const search of monitoredSearches) {
            try {
                // Check if enough time has passed since last check
                const timestampNow = Math.floor(Date.now() / 1000);
                const timestampLastCheck = Math.floor(search.executedAt.getTime() / 1000);
                const lastCheckAtSeconds = timestampNow - timestampLastCheck;

                const syncIntervalHours = settings.searchTermSyncIntervalHours ?? 24;
                if (lastCheckAtSeconds < syncIntervalHours * 60 * 60) {
                    const hours = Math.floor(lastCheckAtSeconds / 60 / 60);
                    Log.debug(`Last check for "${search.term}" was ${hours}h ago, skipping`);
                    continue;
                }

                Log.info(`Checking for new episodes for search term: ${search.term}`);

                // Search for new episodes
                const episodes = await this.api!.episodesByPerson(search.term);

                if (episodes.length === 0) {
                    Log.debug(`No episodes found for search term: ${search.term}`);

                    db.searchHistory.updateOne(
                        { id: search.id },
                        { $set: { executedAt: new Date() } }
                    );
                    continue;
                }

                // Find the latest episode date
                const latestEpisodeDate = new Date(Math.max(...episodes.map(e => e.datePublished * 1000)));

                // Update search history with new results
                const hasNewResults = latestEpisodeDate > search.latestEpisodePublishedAt;

                db.searchHistory.updateOne(
                    { id: search.id },
                    {
                        $set: {
                            executedAt: new Date(),
                            latestEpisodePublishedAt: latestEpisodeDate,
                            hasNewResults
                        }
                    }
                );

                if (hasNewResults) {
                    Log.info(`Found new episodes for search term: ${search.term}`);
                } else {
                    Log.debug(`No new episodes found for search term: ${search.term}`);
                }
            } catch (error) {
                Log.error(`Error updating search term ${search.term}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        Log.info('Finished update of monitored searches');
    }

    startPeriodicUpdates() {
        Log.debug('Starting registering periodic monitored search updates');

        let isUpdating = false;
        let lastCheckTime = 0;

        const sync = async () => {
            if (isUpdating) {
                Log.warn('Skipping search updates due to active update');
                return;
            }

            if (!isOnline()) {
                Log.debug('Skipping search updates due to no network connection');
                return;
            }

            try {
                isUpdating = true;
                await this.updateMonitoredSearches();
                lastCheckTime = Date.now();
            } finally {
                isUpdating = false;
            }
        };

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // If it's been more than 30 minutes since last check, run it now
                if (Date.now() - lastCheckTime > CHECK_INTERVAL_MS) {
                    Log.debug('App became visible, running search updates');
                    sync();
                }
            }
        });

        // Delay first sync by 5 seconds, defer to feed sync
        setTimeout(sync, 5000);

        // Register periodic updates
        setInterval(sync, CHECK_INTERVAL_MS);
    }

    private async initialize() {
        if (this.api) return;

        const settings = getSettings();
        if (!settings?.podcastIndexKey || !settings?.podcastIndexSecret) {
            throw new Error('Podcast Index credentials not found');
        }

        this.api = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
    }

} 