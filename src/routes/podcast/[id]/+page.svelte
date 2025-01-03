<script lang="ts">
    import { db } from '$lib/db/db';
    import { liveQuery } from 'dexie';
    import { page } from '$app/state';
	import { onMount } from 'svelte';

    const podcastId = parseInt(page.params.id);    
    let expandedEpisodeIds = $state<number[]>([]);
    
    const podcast = liveQuery(() => db.podcasts.get(podcastId));
    const episodes = liveQuery(async () => {
        const eps = await db.episodes
            .where('podcastId')
            .equals(podcastId)
            .reverse()
            .sortBy('publishedAt');
        return eps;
    });

    function toggleExpanded(episodeId: number) {
        
        if (isExpanded(episodeId)) {
            console.log('deleting ', episodeId);
            expandedEpisodeIds = expandedEpisodeIds.filter(id => id !== episodeId);
        } else {
            console.log('setting ', episodeId);
            expandedEpisodeIds = [...expandedEpisodeIds, episodeId];
        }
    }

    function isExpanded(episodeId: number) {
        return expandedEpisodeIds.includes(episodeId);
    }
</script>

{#if $podcast}
    <div class="max-w-4xl mx-auto px-4 py-8">
        <!-- Podcast Header -->
        <div class="flex gap-8 mb-12">
            <img 
                src={`data:${$podcast.icon}`}
                alt={$podcast.title} 
                class="w-40 h-40 rounded-xl shadow-lg object-cover flex-shrink-0"
            />
            <div class="flex flex-col justify-center">
                <h1 class="text-4xl font-bold text-gray-900 mb-2">{$podcast.title}</h1>
                <p class="text-lg text-gray-600">{$episodes?.length || 0} episodes</p>
            </div>
        </div>

        <!-- Episodes List -->
        {#if $episodes}
            <div class="divide-y divide-gray-200">
                {#each $episodes as episode}
                    <div class="py-6 first:pt-0">
                        <button 
                            type="button"
                            class="w-full text-left group"
                            onclick={() => toggleExpanded(episode.id!)}
                        >
                            <div class="flex items-center justify-between">
                                <h3 class="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {episode.title}
                                </h3>
                                <span 
                                    class="text-sm text-gray-500 group-hover:text-blue-600 transition-colors"
                                >
                                    {isExpanded(episode.id!) ? '↑ Less' : '↓ More'}
                                </span>
                            </div>
                            
                            <time class="text-sm text-gray-500 mt-1 block">
                                {new Date(episode.publishedAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </time>
                        </button>

                        {#if isExpanded(episode.id!)}
                            <div class="prose prose-gray max-w-none mt-4 text-gray-700">
                                {@html episode.content}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}
