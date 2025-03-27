<script lang="ts">
	import { PodcastIndexClient } from '$lib/api/podcast-index';
	import type { PIApiEpisodeBase, PIApiFeed } from '$lib/types/podcast-index';
	import { Search as SearchIcon, Check } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { resizeBase64Image } from '$lib/utils/resizeImage';
	import { SvelteMap } from 'svelte/reactivity';
	import { FeedService } from '$lib/service/FeedService';
	import { getFeeds, getSettings } from '$lib/stores/db.svelte';
	import { parseSubtitle, parseTitle } from '$lib/utils/feedParser';
	import { formatEpisodeDate } from '$lib/utils/time';

	let query = $state('');
	let feedResults = $state<PIApiFeed[]>([]);
	let episodeResults = $state<PIApiEpisodeBase[]>([]);
	let resizedImageById = $state<SvelteMap<number, string | null>>(new SvelteMap());
	let isLoading = $state(false);
	let client = $state<PodcastIndexClient | null>(null);
	let feedService = new FeedService();

	const ICON_MAX_WIDTH = 300;
	const ICON_MAX_HEIGHT = 300;

	onMount(async () => {
		const settings = getSettings();
		if (!settings) return;

		client = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
	});

	async function handleSearch() {
		if (!query.trim() || !client) return;

		feedResults = [];
		episodeResults = [];
		resizedImageById.clear();
		isLoading = true;

		try {
			feedResults = await client.searchFeeds(query);
			episodeResults = await client.episodesByPerson(query);

			isLoading = false;

			// TODO: This is a hack to get the images to load after the results are loaded
			setTimeout(() => {
				type FeedImage = { image: string | undefined };
				const uniqueFeeds = new Map<number, FeedImage>();

				// Process feed results first (they have more complete data)
				feedResults.forEach(feed => {
					if (!uniqueFeeds.has(feed.id)) {
						uniqueFeeds.set(feed.id, { image: feed.image || feed.artwork });
					}
				});

				// Then process episode results only for feeds we haven't seen
				episodeResults.forEach(episode => {
					if (!uniqueFeeds.has(episode.feedId)) {
						uniqueFeeds.set(episode.feedId, { image: episode.feedImage });
					}
				});

				Array.from(uniqueFeeds.entries()).forEach(([id, feed]) => {
					if (!feed.image) {
						resizedImageById.set(id, null);
						return;
					}
					const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(feed.image)}`;
					resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT)
						.then((resizedImage) => {
							resizedImageById.set(id, resizedImage);
						})
						.catch((error) => {
							resizedImageById.set(id, null);
						});
				});
			}, 0);
		} catch (error) {
			console.error('Search failed:', error);
			isLoading = false;
		}
	}

	function addFeed(feed: PIApiFeed) {
		feedService.addFeed(feed, resizedImageById.get(feed.id) ?? '');
	}
</script>

<div class="search-container">
	<div class="search-bar">
		<input
			type="search"
			bind:value={query}
			placeholder="Search podcasts..."
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		<button class="search-button" onclick={handleSearch} disabled={isLoading}>
			<SearchIcon size="1.5rem" />
		</button>
	</div>

	{#if isLoading}
		<div class="message">Loading...</div>
	{:else if feedResults.length > 0 || episodeResults.length > 0}
	<h2>Feeds</h2>
	<ul role="list">
		{#each feedResults as feed (feed.id)}
			<li>
						<div class="image-container">
							{#if !resizedImageById.has(feed.id)}
								<div class="skeleton"></div>
							{:else if resizedImageById.get(feed.id) !== null}
								<img src={resizedImageById.get(feed.id)} alt={feed.title} class="fade-in" />
							{:else}
								<div class="fallback">
									<span>{feed.title[0]?.toUpperCase() || '?'}</span>
								</div>
							{/if}
							{#if getFeeds()?.some((f) => f.id === feed.id.toString())}
								<div class="added-overlay">
									<Check size="2rem" />
								</div>
							{/if}
						</div>
						<div class="title">{parseTitle(feed.title)}</div>
						<div class="subtitle">{parseSubtitle(feed.title)}</div>
						<div class="subtitle">{feed.episodeCount} episodes</div>
						<div class="subtitle">Last episode: {formatEpisodeDate(feed.newestItemPubdate * 1000)}</div>
				</li>
			{/each}
		</ul>
		<h2>Episodes</h2>
		<ul role="list">
			{#each episodeResults as episode (episode.id)}
				<li>
						<div class="image-container">
							{#if !resizedImageById.has(episode.feedId)}
								<div class="skeleton"></div>
							{:else if resizedImageById.get(episode.feedId) !== null}
								<img src={resizedImageById.get(episode.feedId)} alt={episode.title} class="fade-in" />
							{:else}
								<div class="fallback">
									<span>{episode.title[0]?.toUpperCase() || '?'}</span>
								</div>
							{/if}
							{#if getFeeds()?.some((f) => f.id === episode.feedId.toString())}
								<div class="added-overlay">
									<Check size="2rem" />
								</div>
							{/if}
						</div>
						<div class="title">{episode.feedTitle}</div>
						<div class="title">{episode.title}</div>
						<div class="subtitle">{formatEpisodeDate(episode.datePublished * 1000)}</div>
				</li>
			{/each}
		</ul>
	{:else if query}
		<div class="message">No podcasts found</div>
	{/if}
</div>

<style>
	.search-container {
		padding: 1rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.search-bar {
		display: flex;
		width: 100%;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding: 1rem;
	}

	input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--primary-less);
		background: var(--bg);
		color: var(--text);
	}

	.search-button {
		padding: 0.75rem;
		background: var(--primary);
		border: none;
		color: var(--neutral);
	}

	.title {
	}

	.message {
		text-align: center;
		padding: 2rem;
	}

	.image-container {
		position: relative;
		width: 100px;
		height: 100px;
		background: var(--bg-less);
	}

	.fade-in {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		color: var(--text-less);
	}

	.added-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--neutral);
	}

	button:disabled {
		opacity: 0.7;
		cursor: default;
	}
</style>
