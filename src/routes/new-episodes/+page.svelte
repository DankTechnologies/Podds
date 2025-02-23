<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { onMount } from 'svelte';
	import { getEpisodes, getFeedIconsById } from '$lib/stores/db.svelte';

	const ITEMS_PER_PAGE = 10;
	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	let feedIconsById = $derived(getFeedIconsById());

	let episodes = $derived(
		getEpisodes()
			.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
			.slice(0, limit)
	);

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
