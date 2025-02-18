<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { page } from '$app/state';
	import type { Episode, Feed } from '$lib/types/db';
	import { db } from '$lib/stores/db.svelte';
	import { onMount } from 'svelte';

	const feedId = page.params.id;

	const ITEMS_PER_PAGE = 100;
	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	// Raw state holders for query results
	let episodes = $state.raw<Episode[]>([]);
	let feed = $state.raw<Feed>();

	// Set up reactive queries with proper cleanup
	$effect(() => {
		feed = db.feeds.findOne({ id: feedId });

		if (!feed) return;

		const episodesCursor = db.episodes.find(
			{ feedId: feed.id },
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

	function loadMoreEpisodes() {
		limit += ITEMS_PER_PAGE;
	}

	function getTitle(title: string | undefined): string {
		if (!title) return '';
		const match = title.match(/^(.*?)(?:[-:])(.*)/);
		return match ? match[1].trim() : title.trim();
	}

	function getSubtitle(title: string | undefined): string {
		if (!title) return '';
		const match = title.match(/^(.*?)(?:[-:])(.*)/);
		return match ? match[2].trim() : '';
	}
</script>

{#if episodes.length > 0}
	<!-- Podcast Header -->
	<header class="podcast-header">
		<img class="podcast-header__image" src={`data:${feed?.iconData}`} alt={feed?.title} />
		<div class="podcast-header__content">
			<h1 class="podcast-header__title">{getTitle(feed?.title)}</h1>
			<span class="podcast-header__subtitle">{getSubtitle(feed?.title)}</span>
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
		gap: 1.5rem;
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
		gap: 1rem;
		padding-top: 1rem;
	}

	.podcast-header__title {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0;
	}
</style>
