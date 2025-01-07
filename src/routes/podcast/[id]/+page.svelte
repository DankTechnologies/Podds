<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { page } from '$app/state';
	import { PodcastService, type EpisodeExt } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	import type { Podcast } from '$lib/types/db';
	const podcastId = parseInt(page.params.id);
	let expandedEpisodeIds = $state<number[]>([]);
	let episodes = $state<EpisodeExt[]>([]);
	let podcast = $state<Podcast | null>(null);
	let episodeCount = $state<number>(0);
	onMount(async () => {
		episodes = await PodcastService.getEpisodesByPodcast(podcastId);
		podcast = await PodcastService.getPodcast(podcastId);
		episodeCount = await PodcastService.getEpisodeCountByPodcast(podcastId);
	});

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

{#if podcast}
	<div class="mx-auto max-w-4xl overflow-y-auto px-4 py-8">
		<!-- Podcast Header -->
		<div class="mb-12 flex gap-8">
			<img
				src={`data:${podcast.icon}`}
				alt={podcast.title}
				class="h-40 w-40 flex-shrink-0 rounded-xl object-cover shadow-lg"
			/>
			<div class="flex flex-col justify-center">
				<h1 class="mb-2 text-2xl font-bold text-gray-900">{podcast.title}</h1>
				{#if episodeCount}
					<p class="text-md text-gray-600">{episodeCount} episodes</p>
				{/if}
			</div>
		</div>

		<!-- Episodes List -->
		{#if episodes}
			<EpisodeList {episodes} />
		{/if}
	</div>
{/if}
