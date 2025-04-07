<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { page } from '$app/state';
	import { db, getActiveEpisodes, getEpisodes } from '$lib/stores/db.svelte';
	import { onMount } from 'svelte';
	import { Trash2 } from 'lucide-svelte';
	import { FeedService } from '$lib/service/FeedService';
	import type { Feed } from '$lib/types/db';
	import { goto } from '$app/navigation';
	import { parseSubtitle, parseTitle } from '$lib/utils/feedParser';
	const feedId = page.params.id;
	let searchQuery = $state('');

	const ITEMS_PER_PAGE = 10;
	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);
	let feedService = new FeedService();
	let isDeleting = $state(false);
	let isAdding = $state(false);

	// corner case for new feeds added by search missing episodes, due to reactivity bug
	// only evaluates if episodes is empty
	let episodesFallback = $derived(db.episodes.find({ feedId }).fetch());

	let episodes = $derived(
		getEpisodes()
			.filter((episode) => {
				if (episode.feedId !== feedId) return false;
				if (!searchQuery) return true;

				const query = searchQuery.toLowerCase();
				return (
					episode.title.toLowerCase().includes(query) ||
					episode.content.toLowerCase().includes(query)
				);
			})
			.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
			.slice(0, limit)
	);
	let activeEpisodes = $derived(getActiveEpisodes().filter((episode) => episode.feedId === feedId));

	let feed = $derived(db.feeds.findOne({ id: feedId }));

	onMount(() => {
		if (!feed) {
			isAdding = true;
			feedService.addFeedById(feedId).then(() => {
				isAdding = false;
			});
		}

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

	function deleteFeed(feed: Feed) {
		isDeleting = true;
		setTimeout(() => {
			feedService.deleteFeed(feed.id);
			goto('/');
		});
	}
</script>

{#if isDeleting}
	<div class="status-screen">
		<div class="status-message">Deleting...</div>
	</div>
{:else if isAdding}
	<div class="status-screen">
		<div class="status-message">Loading...</div>
	</div>
{:else if feed}
	<!-- Podcast Header -->
	<header class="podcast-header">
		<img class="podcast-header__image" src={`data:${feed.iconData}`} alt={feed.title} />
		<div class="podcast-header__content">
			<h1 class="podcast-header__title">{parseTitle(feed.title)}</h1>
			<span class="podcast-header__subtitle">{parseSubtitle(feed.title)}</span>
			<div class="podcast-header__buttons">
				<button class="podcast-header__button" onclick={() => deleteFeed(feed)}>
					<Trash2 size="14" />
					Delete
				</button>
			</div>
		</div>
	</header>

	<!-- Search Bar -->
	<div class="search-container">
		<div class="search-bar">
			<input type="search" bind:value={searchQuery} placeholder="Search episodes..." />
		</div>
	</div>

	<!-- Episodes List -->
	<section class="podcast-section">
		{#if episodes.length > 0}
			<EpisodeList {episodes} {activeEpisodes} />
		{:else if searchQuery}
			<div class="message">No episodes found matching "{searchQuery}"</div>
		{:else}
			<EpisodeList episodes={episodesFallback} {activeEpisodes} />
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

	.podcast-header__buttons {
		display: flex;
	}

	.podcast-header__button {
		display: flex;
		font-size: var(--text-small);
		font-weight: 600;
		align-items: center;
		background: var(--primary-less);
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		color: var(--neutral);
		cursor: pointer;
		border-radius: 0.25rem;
	}

	.status-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: var(--bg);
	}

	.status-message {
		font-size: var(--text-3xl);
		color: var(--primary);
	}

	.search-container {
		padding: 1rem 2rem;
		display: flex;
	}

	.search-bar {
		display: flex;
		width: 100%;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--primary-less);
		background: var(--bg);
		color: var(--text);
	}

	.message {
		text-align: center;
		padding: 2rem;
		color: var(--text);
	}
</style>
