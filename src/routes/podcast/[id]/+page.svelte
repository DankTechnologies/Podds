<script lang="ts">
	import { db } from '$lib/db/db';
	import { liveQuery } from 'dexie';
	import { page } from '$app/state';

	const podcastId = parseInt(page.params.id);
	let expandedEpisodeIds = $state<number[]>([]);

	const podcast = liveQuery(async () => await db.podcasts.get(podcastId));
	const episodes = liveQuery(
		async () =>
			await db.episodes.where('podcastId').equals(podcastId).reverse().sortBy('publishedAt')
	);

	function toggleExpanded(episodeId: number) {
		if (isExpanded(episodeId)) {
			expandedEpisodeIds = expandedEpisodeIds.filter((id) => id !== episodeId);
		} else {
			expandedEpisodeIds = [...expandedEpisodeIds, episodeId];
		}
	}

	function isExpanded(episodeId: number) {
		return expandedEpisodeIds.includes(episodeId);
	}
</script>

{#if $podcast}
	<div class="mx-auto max-w-4xl px-4 py-8">
		<!-- Podcast Header -->
		<div class="mb-12 flex gap-8">
			<img
				src={`data:${$podcast.icon}`}
				alt={$podcast.title}
				class="h-40 w-40 flex-shrink-0 rounded-xl object-cover shadow-lg"
			/>
			<div class="flex flex-col justify-center">
				<h1 class="mb-2 text-4xl font-bold text-gray-900">{$podcast.title}</h1>
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
				{/each}
			</div>
		{/if}
	</div>
{/if}
