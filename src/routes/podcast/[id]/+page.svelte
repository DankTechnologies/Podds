<script lang="ts">
    import { db } from '$lib/db/db';
    import { liveQuery } from 'dexie';
    import { page } from '$app/state';

    const podcastId = parseInt(page.params.id);
    
    const podcast = liveQuery(() => db.podcasts.get(podcastId));
    const episodes = liveQuery(async () => {
        const eps = await db.episodes
            .where('podcastId')
            .equals(podcastId)
//            .limit(50)
            .reverse()
            .sortBy('publishedAt');
        return eps.map(ep => ({ ...ep, isExpanded: false }));
    });
</script>

{#if $podcast}
    <div class="flex items-center gap-4 mb-8">
        <img 
        src={`data:${$podcast.icon}`}
        alt={$podcast.title} 
            class="w-32 h-32"
        />
        <h1 class="text-8xl font-bold">{$podcast.title}</h1>
    </div>

    {#if $episodes}
        <div class="flex flex-col gap-6">
            {#each $episodes as episode}
                <div class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <h3 class="text-lg font-semibold mb-2">{episode.title}</h3>
                    <div class="text-sm text-gray-500 mb-3">
                        {new Date(episode.publishedAt).toLocaleDateString()}
                    </div>
                    
                    <button 
                        class="text-sm text-blue-600 hover:text-blue-800 mb-2"
                        on:click={() => episode.isExpanded = !episode.isExpanded}
                    >
                        {episode.isExpanded ? 'Show Less' : 'Show More'}
                    </button>

                    {#if episode.isExpanded}
                        <div class="prose prose-sm max-w-none">
                            {@html episode.content}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
{/if}
