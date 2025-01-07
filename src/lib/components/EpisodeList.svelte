<script lang="ts">
	import type { EpisodeExt } from '$lib/service/PodcastService';

	let { episodes }: { episodes: EpisodeExt[] } = $props();
	let expandedEpisodeIds = $state<number[]>([]);

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

<div class="divide-y divide-gray-200">
	{#each episodes as episode}
		<div class="pt-2">
			<button
				type="button"
				class="group w-full text-left"
				onclick={() => toggleExpanded(episode.id!)}
			>
				<div class="flex items-start gap-3">
					{#if episode.icon}
						<img src={`data:${episode.icon}`} alt="Feed icon" class="h-16 w-16 object-cover" />
					{/if}
					<div class="flex-1">
						<h3
							class="text-l font-semibold text-gray-900 transition-colors group-hover:text-blue-600"
						>
							{episode.title}
						</h3>
						<time class="mt-1 block text-xs text-gray-500">
							{new Date(episode.publishedAt).toLocaleDateString(undefined, {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</time>
					</div>
				</div>
			</button>

			{#if isExpanded(episode.id!)}
				<div class="prose prose-gray mt-2 max-w-none px-2 pb-4 text-sm text-gray-700">
					{@html episode.content}
				</div>
			{/if}
		</div>
	{/each}
</div>
