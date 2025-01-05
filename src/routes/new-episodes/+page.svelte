<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { PodcastService, type EpisodeExt } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	let expandedEpisodeIds = $state<number[]>([]);
	let episodes = $state<EpisodeExt[]>([]);

	onMount(async () => {
		episodes = await PodcastService.getRecentEpisodes();
	});

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

{#if episodes}
	<div class="divide-y divide-gray-200">
		<EpisodeList {episodes} />
	</div>
{/if}
