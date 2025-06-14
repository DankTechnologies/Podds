import { db } from '$lib/stores/db.svelte';
import type { SearchHistory } from '$lib/types/db';
import { Log } from '$lib/service/LogService';
import { getSettings } from '$lib/stores/db.svelte';
import { isOnline } from '$lib/utils/networkState.svelte';
import { searchEpisodes } from '$lib/api/itunes';
import { SettingsService } from './SettingsService.svelte';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export class SearchService {
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

        const monitoredSearches = SearchService.getMonitoredSearchHistory();

        if (monitoredSearches.length === 0) {
            Log.debug('No monitored searches found, skipping update');
            return;
        }

        Log.debug('Starting update of monitored searches');

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

                Log.debug(`Checking for new episodes for search term: ${search.term}`);

                // Search for new episodes
                const episodes = await searchEpisodes(search.term);

                if (episodes.length === 0) {
                    Log.debug(`No episodes found for search term: ${search.term}`);

                    db.searchHistory.updateOne(
                        { id: search.id },
                        { $set: { executedAt: new Date() } }
                    );
                    continue;
                }

                // Find the latest episode date
                const latestEpisodeDate = new Date(Math.max(...episodes.map(e => e.publishedAt.getTime())));

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
                Log.error(`Error updating search term ${search.term}: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`);
            }
        }

        Log.debug('Finished update of monitored searches');
    }

    startPeriodicUpdates() {
        Log.debug('Starting registering periodic monitored search updates');

        let isUpdating = false;

        const sync = async () => {
            if (isUpdating) {
                Log.debug('Skipping search updates due to active update');
                return;
            }

            if (!isOnline()) {
                Log.debug('Skipping search updates due to no network connection');
                return;
            }

            const settings = getSettings();
            const lastCheckTime = settings.lastSearchCheckAt ? new Date(settings.lastSearchCheckAt).getTime() : 0;

            // If it hasn't been long enough since last check, skip
            if (Date.now() - lastCheckTime < CHECK_INTERVAL_MS) {
                Log.debug('Skipping search updates due to recent update');
                return;
            }

            isUpdating = true;
            window.requestIdleCallback(async () => {
                try {
                    await this.updateMonitoredSearches();
                    SettingsService.updateLastSearchCheckAt();
                } catch (error) {
                    Log.error(`Error updating monitored searches: ${error instanceof Error ? `${error.message} - ${error.stack}` : String(error)}`);
                } finally {
                    isUpdating = false;
                }
            }, { timeout: 10000 });
        };

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                setTimeout(() => {
                    Log.debug('App became visible, running search updates');
                    sync();
                }, 10000);
            }
        });

        // Delay first sync by 30 seconds, not urgent 
        setTimeout(sync, 30000);

        // Register periodic updates
        setInterval(sync, CHECK_INTERVAL_MS);
    }
} 