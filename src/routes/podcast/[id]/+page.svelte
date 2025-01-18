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

		if (observerTarget) observer.observe(observerTarget);

		return () => observer.disconnect();
	});
</script>

{#if podcast}
	<!-- Podcast Header -->
	<header class="podcast-header">
		<img class="podcast-header__image" src={`data:${podcast.icon}`} alt={podcast.title} />
		<div class="podcast-header__content">
			<div class="podcast-header__title">{podcast.title}</div>
			{#if episodeCount}
				<div class="podcast-header__episodes">{episodeCount} episodes</div>
			{/if}
		</div>
	</header>

	<!-- Episodes List -->
	<section>
		{#if episodes}
			<EpisodeList {episodes} />
		{/if}
	</section>
{/if}
<div bind:this={observerTarget}></div>

<style>
	.podcast-header {
		display: flex;
		gap: 1rem;
		padding: 1rem;
	}

	.podcast-header__image {
		width: 150px;
		height: 150px;
		border-radius: 0.5rem;
		box-shadow:
			4px 6px 6px -1px rgb(0 0 0 / 0.3),
			2px 4px 4px -2px rgb(0 0 0 / 0.2);
		object-fit: cover;
	}

	.podcast-header__content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.podcast-header__title {
		font-size: 1.75rem;
		font-weight: 600;
	}

	.podcast-header__episodes {
		font-size: var(--text-small);
	}
</style>
