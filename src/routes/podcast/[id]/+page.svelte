<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { page } from '$app/state';
	import { PodcastService, type EpisodeExt } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	import type { Podcast } from '$lib/types/db';

	const podcastId = parseInt(page.params.id);

	let episodes = $state<EpisodeExt[]>([]);
	let podcast = $state<Podcast | null>(null);
	let episodeCount = $state<number>(0);

	let loading = $state<boolean>(false);
	let hasMore = $state<boolean>(true);
	let currentPage = $state<number>(0);

	const ITEMS_PER_PAGE = 50;
	let observerTarget = $state<HTMLElement | null>(null);

	async function loadMoreEpisodes() {
		if (loading || !hasMore) return;

		loading = true;
		const start = currentPage * ITEMS_PER_PAGE;
		const newEpisodes = await PodcastService.getEpisodesByPodcast(podcastId, start, ITEMS_PER_PAGE);

		if (newEpisodes.length < ITEMS_PER_PAGE) {
			hasMore = false;
		}

		episodes = [...episodes, ...newEpisodes];
		currentPage++;
		loading = false;
	}

	onMount(() => {
		PodcastService.getPodcastWithDetails(podcastId, 0, ITEMS_PER_PAGE).then((details) => {
			episodes = details.episodes;
			podcast = details.podcast;
			episodeCount = details.episodeCount;

			if (details.episodes.length < ITEMS_PER_PAGE) {
				hasMore = false;
			}
		});

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

		if (observerTarget) {
			observer.observe(observerTarget);
			console.log('Observer attached to target');
		} else {
			console.log('No observer target found');
		}

		return () => observer.disconnect();
	});
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
<div bind:this={observerTarget} class="h-px"></div>
