<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { onMount } from 'svelte';
	import { getActiveEpisodes, getEpisodes, getFeeds } from '$lib/stores/db.svelte';
	import { EpisodeUpdate } from '$lib/service/FeedService.svelte';

	const ITEMS_PER_PAGE = 20;
	const THREE_MONTHS_AGO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);

	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	let subscribedFeedIds = $derived(
		getFeeds()
			.filter((x) => x.isSubscribed)
			.map((x) => x.id)
	);

	let episodes = $derived(
		getEpisodes()
			.filter(
				(episode) =>
					episode.publishedAt > THREE_MONTHS_AGO && subscribedFeedIds.includes(episode.feedId)
			)
			.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
			.slice(0, limit)
	);

	let activeEpisodes = $derived(getActiveEpisodes());

	async function loadMoreEpisodes() {
		limit += ITEMS_PER_PAGE;
	}

	onMount(() => {
		EpisodeUpdate.hasNewEpisodes = false;
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
	<EpisodeList {episodes} {activeEpisodes} />
{/if}
<div bind:this={observerTarget}></div>
