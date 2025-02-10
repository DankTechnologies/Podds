<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { page } from '$app/state';
	import type { Episode, Icon } from '$lib/types/db';
	import { db } from '$lib/stores/db.svelte';
	import { onMount } from 'svelte';

	const podcastId = page.params.id;

	const ITEMS_PER_PAGE = 100;
	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	// Raw state holders for query results
	let episodes = $state.raw<Episode[]>([]);
	let icon = $state.raw<Icon>();

	// Set up reactive queries with proper cleanup
	$effect(() => {
		const episodesCursor = db.episodes.find(
			{ 'podcast.id': podcastId },
			{
				sort: { publishedAt: -1 },
				limit
			}
		);
		episodes = episodesCursor.fetch();
		icon = db.icons.findOne({ id: podcastId });

		return () => {
			episodesCursor.cleanup();
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

{#if episodes.length > 0}
	<!-- Podcast Header -->
	<header class="podcast-header">
		<img class="podcast-header__image" src={`data:${icon?.data}`} alt={episodes[0].podcast.title} />
		<div class="podcast-header__title">{episodes[0].podcast.title}</div>
	</header>

	<!-- Episodes List -->
	<section class="podcast-section">
		{#if episodes}
			<EpisodeList {episodes} />
		{/if}
	</section>
{/if}
<div bind:this={observerTarget}></div>

<style>
	.podcast-header {
		display: flex;
		gap: 2.5rem;
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

	.podcast-header__title {
		font-size: 1.75rem;
		font-weight: 600;
	}
</style>
