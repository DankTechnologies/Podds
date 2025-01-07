<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { PodcastService, type EpisodeExt } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';

	let episodes = $state<EpisodeExt[]>([]);
	let loading = $state<boolean>(false);
	let hasMore = $state<boolean>(true);
	let currentPage = $state<number>(0);

	const ITEMS_PER_PAGE = 50;
	let observerTarget = $state<HTMLElement | null>(null);

	async function loadMoreEpisodes() {
		if (loading || !hasMore) return;

		loading = true;
		const start = currentPage * ITEMS_PER_PAGE;
		const newEpisodes = await PodcastService.getRecentEpisodes(start, ITEMS_PER_PAGE);

		if (newEpisodes.length < ITEMS_PER_PAGE) {
			hasMore = false;
		}

		episodes = [...episodes, ...newEpisodes];
		currentPage++;
		loading = false;
	}

	onMount(() => {
		loadMoreEpisodes();

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						loadMoreEpisodes();
					}
				});
			},
			{ rootMargin: '200px' }
		);

		if (observerTarget) observer.observe(observerTarget);

		return () => observer.disconnect();
	});
</script>

{#if episodes}
	<div class="divide-y divide-gray-200">
		<EpisodeList {episodes} />
		<div bind:this={observerTarget} class="h-px"></div>
	</div>
{/if}
