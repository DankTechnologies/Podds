<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { EpisodeService } from '$lib/service/EpisodeService';
	import { PodcastService } from '$lib/service/PodcastService';
	import type { Episode } from '$lib/types/db';
	import { onMount } from 'svelte';
	import type { SvelteMap } from 'svelte/reactivity';

	let episodes = $state<Episode[]>([]);
	let podcastIcons = $state<SvelteMap<number, string>>();
	let loading = $state<boolean>(false);
	let hasMore = $state<boolean>(true);
	let currentPage = $state<number>(0);

	const ITEMS_PER_PAGE = 50;
	let observerTarget = $state<HTMLElement | null>(null);

	async function loadMoreEpisodes() {
		if (loading || !hasMore) return;

		loading = true;
		const start = currentPage * ITEMS_PER_PAGE;
		const newEpisodes = await EpisodeService.getRecentEpisodes(start, ITEMS_PER_PAGE);

		if (newEpisodes.length < ITEMS_PER_PAGE) {
			hasMore = false;
		}

		episodes = [...episodes, ...newEpisodes];
		currentPage++;
		loading = false;
	}

	// @ts-ignore
	onMount(async () => {
		podcastIcons = await PodcastService.fetchPodcastIconsById();
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
	<div>
		<EpisodeList {episodes} {podcastIcons} />
		<div bind:this={observerTarget}></div>
	</div>
{/if}
