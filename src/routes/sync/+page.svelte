<script lang="ts">
    import { onMount } from 'svelte';
    import MinifluxApi from '$lib/api/miniflux';
    import { db, type Episode, type Podcast } from '$lib/db/db';
	import { goto } from '$app/navigation';

    let status = $state<string>('Syncing podcasts...');

    onMount(async () => {
        const settings = await db.settings.get(1);

        if (!settings) {
            throw new Error('Settings not found');
        }

        const api = new MinifluxApi(settings.host, settings.apiKey);
        const categoryIds = settings.categories.split(',').map(Number);

        const feeds = (await Promise.all(categoryIds.map(async categoryId => {
            const categoryFeeds = await api.fetchFeedsForCategory(categoryId);

            return Promise.all(categoryFeeds.map(async feed => ({
                ...feed,
                icon: await api.fetchFeedIcon(feed.id)
            })));
        }))).flat();

        const podcasts: Podcast[] = feeds.map(feed => ({
            id: feed.id,
            title: feed.title,
            newEpisodes: 0,
            icon: feed.icon
        }));

        await db.podcasts.bulkPut(podcasts);

        for (const feed of feeds) {
            const entryResult = await api.fetchEntriesForFeed(feed.id, { limit: 1000 });

            status = `Syncing ${feed.title}...`;
            
            const episodes: Episode[] = entryResult.entries.map(entry => ({
                id: entry.id,
                podcastId: feed.id,
                podcastTitle: feed.title,
                title: entry.title,
                content: entry.content,
                publishedAt: new Date(entry.published_at),
                isDownloaded: false
            }));

            await db.episodes.bulkPut(episodes);
        }

        status = 'Sync complete!';
        setTimeout(() => goto('/'), 1000);
    });
</script>

<div class="flex flex-col items-center justify-center min-h-screen">
    <div class="w-full max-w-md p-6 space-y-4">
        <h1 class="text-2xl font-bold text-center">Initial Sync</h1>
            <div class="space-y-4">
                <p class="text-center text-gray-600">{status}</p>
            </div>
    </div>
</div> 