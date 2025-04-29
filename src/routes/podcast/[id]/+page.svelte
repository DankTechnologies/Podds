<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { page } from '$app/state';
	import { getActiveEpisodes, getEpisodes, getFeeds, getSettings } from '$lib/stores/db.svelte';
	import { onMount } from 'svelte';
	import { Share2, Trash2, Search } from 'lucide-svelte';
	import { FeedService } from '$lib/service/FeedService';
	import type { Feed } from '$lib/types/db';
	import { goto } from '$app/navigation';
	import { parseOwner } from '$lib/utils/feedParser';
	import { Log } from '$lib/service/LogService';
	import { shareFeed as shareFeedUtil } from '$lib/utils/share';
	import { isAppleDevice } from '$lib/utils/osCheck';
	const feedId = page.params.id;
	let searchQuery = $state('');
	let isSearchVisible = $state(false);
	let searchInput = $state<HTMLInputElement | null>(null);

	const ITEMS_PER_PAGE = 10;
	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);
	let feedService = new FeedService();
	let isDeleting = $state(false);
	let isAdding = $state(false);
	let isUpdating = $state(false);

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

	let feed = $derived(getFeeds().find((feed) => feed.id === feedId));
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

	function shareFeed(feed: Feed) {
		const settings = getSettings();
		if (!settings) {
			Log.error('Settings not found, skipping share link');
			return;
		}

		shareFeedUtil(feed, settings.podcastIndexKey, settings.podcastIndexSecret);
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
		<div class="podcast-header__main">
			<a href={feed.link} target="_blank" rel="noopener noreferrer">
				<img class="podcast-header__image" src={`data:${feed.iconData}`} alt={feed.title} />
			</a>
			<div class="podcast-header__content">
				<div class="podcast-header__owner">{parseOwner(feed.author, feed.ownerName)}</div>
				<div class="podcast-header__description">{feed.description}</div>
			</div>
		</div>
		<div class="podcast-header__buttons">
			<button
				class="podcast-header__button"
				onclick={() => {
					isSearchVisible = !isSearchVisible;

					if (isSearchVisible && !isAppleDevice) {
						setTimeout(() => searchInput?.focus(), 0);
					}
				}}
			>
				<Search size="14" />
				Search
			</button>
			<button class="podcast-header__button" onclick={() => shareFeed(feed)}>
				<Share2 size="14" />
				Share
			</button>
			<button
				class="podcast-header__button podcast-header__button--delete"
				onclick={() => deleteFeed(feed)}
			>
				<Trash2 size="14" />
			</button>
		</div>
	</header>

	<!-- Search Bar -->
	{#if isSearchVisible}
		<div class="search-container">
			<div class="search-bar">
				<input
					type="search"
					bind:value={searchQuery}
					bind:this={searchInput}
					placeholder="Search episodes..."
				/>
			</div>
		</div>
	{/if}

	<!-- Episodes List -->
	<section class="podcast-section">
		{#if episodes.length > 0}
			<EpisodeList {episodes} {activeEpisodes} />
		{:else if searchQuery}
			<div class="message">No episodes found matching "{searchQuery}"</div>
		{:else}
			<div class="message">No episodes found</div>
		{/if}
	</section>
{/if}
<div bind:this={observerTarget}></div>

<style>
	.podcast-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background-color: var(--bg-less);
	}

	.podcast-header__main {
		display: flex;
		gap: 1rem;
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
		padding-top: 0.25rem;
	}

	.podcast-header__owner {
		font-weight: 600;
	}

	.podcast-header__description {
		font-size: var(--text-smaller);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 5;
		line-clamp: 5;
		-webkit-box-orient: vertical;
		word-break: break-word;
	}

	.podcast-header__buttons {
		display: flex;
		gap: 1rem;
	}

	.podcast-header__button {
		display: flex;
		font-size: var(--text-small);
		font-weight: 600;
		align-items: center;
		gap: 0.5rem;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 0.25rem;
		background: var(--bg);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
	}

	.podcast-header__button--delete {
		margin-left: auto;

		color: var(--error);
		opacity: 0.7;
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
		padding: 1rem;
		display: flex;
		background-color: var(--bg-less);
	}

	.search-bar {
		display: flex;
		width: 100vw;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--primary-less);
		background: var(--bg);
		color: var(--text);
		border-radius: 0.25rem;
	}

	.message {
		text-align: center;
		padding: 2rem;
		color: var(--text);
	}
</style>
