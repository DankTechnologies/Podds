<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { db } from '$lib/db/FluxcastDb';
	import { PodcastService } from '$lib/service/PodcastService';
	import { liveQuery } from 'dexie';
	import { onMount } from 'svelte';
	import type { SvelteMap } from 'svelte/reactivity';

	const ITEMS_PER_PAGE = 50;
	let podcastIcons = $state<SvelteMap<number, string>>();
	let limit = $state<number>(ITEMS_PER_PAGE);

	let observerTarget = $state<HTMLElement | null>(null);

	let episodes = $derived.by(() => {
		// noop just to make it reactive
		limit;

		return liveQuery(() => db.episodes.orderBy('publishedAt').reverse().limit(limit).toArray());
	});
	$inspect($episodes);
	async function loadMoreEpisodes() {
		limit += ITEMS_PER_PAGE;
	}

	// @ts-ignore
	onMount(async () => {
		podcastIcons = await PodcastService.fetchPodcastIconsById();

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && $episodes) {
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
	<EpisodeList {episodes} {podcastIcons} />
{/if}
<div bind:this={observerTarget}></div>
