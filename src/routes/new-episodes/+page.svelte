<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { onMount } from 'svelte';
	import { db } from '$lib/stores/db.svelte';
	import type { Episode, Feed } from '$lib/types/db';
	import { SvelteMap } from 'svelte/reactivity';

	const ITEMS_PER_PAGE = 100;
	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	// Raw state holders for query results
	let episodes = $state.raw<Episode[]>([]);
	let feedIconsById = $state.raw<SvelteMap<string, string>>(new SvelteMap());

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
		const feedsCursor = db.feeds.find();
		const feeds = feedsCursor.fetch();

		feeds.forEach((feed) => {
			feedIconsById.set(feed.id, feed.iconData);
		});

		return () => {
			feedsCursor.cleanup();
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
	<EpisodeList {episodes} {feedIconsById} />
{/if}
<div bind:this={observerTarget}></div>
