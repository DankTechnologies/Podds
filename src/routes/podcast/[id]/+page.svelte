<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { page } from '$app/state';
	import { PodcastService } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	import type { Podcast } from '$lib/types/db';
	import Dexie, { liveQuery } from 'dexie';
	import { db } from '$lib/db/FluxcastDb';

	const podcastId = parseInt(page.params.id);

	const ITEMS_PER_PAGE = 50;
	let podcast = $state<Podcast | null>(null);
	let episodeCount = $state<number>(0);
	let limit = $state<number>(ITEMS_PER_PAGE);

	let observerTarget = $state<HTMLElement | null>(null);

	let episodes = $derived.by(() => {
		// noop just to make it reactive
		limit;

		return liveQuery(() =>
			db.episodes
				.where('[podcastId+id]') // can't use orderBy and where
				.between([podcastId, Dexie.minKey], [podcastId, Dexie.maxKey])
				.reverse()
				.limit(limit)
				.toArray()
		);
	});
	$inspect($episodes);
	async function loadMoreEpisodes() {
		if (limit < episodeCount) limit += ITEMS_PER_PAGE;
	}

	onMount(() => {
		PodcastService.getPodcastWithDetails(podcastId, 0, ITEMS_PER_PAGE).then((details) => {
			podcast = details.podcast;
			episodeCount = details.episodeCount;
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

	.podcast-section {
		padding-bottom: 7.5rem;
	}
</style>
