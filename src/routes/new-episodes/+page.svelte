<script lang="ts">
	import { db } from '$lib/db/FluxcastDb';
	import { liveQuery } from 'dexie';

	let expandedEpisodeIds = $state<number[]>([]);

	const podcasts = liveQuery(() => db.podcasts.toArray());
	const episodes = liveQuery(() => db.episodes.limit(50).reverse().sortBy('publishedAt'));

	function toggleExpanded(episodeId: number) {
		if (isExpanded(episodeId)) {
			console.log('deleting ', episodeId);
			expandedEpisodeIds = expandedEpisodeIds.filter((id) => id !== episodeId);
		} else {
			console.log('setting ', episodeId);
			expandedEpisodeIds = [...expandedEpisodeIds, episodeId];
		}
	}

	function isExpanded(episodeId: number) {
		return expandedEpisodeIds.includes(episodeId);
	}
</script>

{#if $podcasts && $episodes}
	<div class="divide-y divide-gray-200">
		{#each $episodes as episode}
			<div class="py-6 first:pt-0">
				<div class="flex gap-4">
					{#if $podcasts}
						{#each $podcasts.filter((p) => p.id === episode.podcastId) as podcast}
							<img
								src={`data:${podcast.icon}`}
								alt={podcast.title}
								class="h-16 w-16 flex-shrink-0 rounded-lg object-cover shadow"
							/>
						{/each}
					{/if}
					<div class="flex-1">
						<button
							type="button"
							class="group w-full text-left"
							onclick={() => toggleExpanded(episode.id!)}
						>
							<div class="flex items-center justify-between">
								<h3
									class="text-xl font-semibold text-gray-900 transition-colors group-hover:text-blue-600"
								>
									{episode.title}
								</h3>
								<span class="text-sm text-gray-500 transition-colors group-hover:text-blue-600">
									{isExpanded(episode.id!) ? '↑ Less' : '↓ More'}
								</span>
							</div>

							<time class="mt-1 block text-sm text-gray-500">
								{new Date(episode.publishedAt).toLocaleDateString(undefined, {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</time>
						</button>

						{#if isExpanded(episode.id!)}
							<div class="prose prose-gray mt-4 max-w-none text-gray-700">
								{@html episode.content}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
