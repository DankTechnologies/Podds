<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { onMount } from 'svelte';
	import { db } from '$lib/stores/db.svelte';
	import type { Episode, Icon } from '$lib/types/db';

	const ITEMS_PER_PAGE = 50;
	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	// Raw state holders for query results
	let episodes = $state.raw<Episode[]>([]);
	let icons = $state.raw<Icon[]>([]);

	// Set up reactive queries with proper cleanup
	$effect(() => {
		const episodesCursor = db.episodes.find(
			{},
			{
				sort: { publishedAt: -1 },
				limit
			}
		);
		episodes = episodesCursor.fetch();

		return () => {
			episodesCursor.cleanup();
		};
	});

	$effect(() => {
		const iconsCursor = db.icons.find();
		icons = iconsCursor.fetch();

		return () => {
			iconsCursor.cleanup();
		};
	});

	async function loadMoreEpisodes() {
		limit += ITEMS_PER_PAGE;
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && episodes?.length) {
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
	<EpisodeList {episodes} podcastIcons={icons} />
{/if}
<div bind:this={observerTarget}></div>
