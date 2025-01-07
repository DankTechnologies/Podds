<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { PodcastService, type EpisodeExt } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	let episodes = $state<EpisodeExt[]>([]);

	onMount(async () => {
		episodes = await PodcastService.getRecentEpisodes();
	});
</script>

{#if episodes}
	<div class="divide-y divide-gray-200">
		<EpisodeList {episodes} />
	</div>
{/if}
