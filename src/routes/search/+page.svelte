<script lang="ts">
	import { PodcastIndexClient } from '$lib/api/podcast-index';
	import type { PIApiEpisodeBase, PIApiFeed } from '$lib/types/podcast-index';
	import { Search as SearchIcon } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { resizeBase64Image } from '$lib/utils/resizeImage';
	import { SvelteMap } from 'svelte/reactivity';
	import { getActiveEpisodes, getFeeds, getSettings } from '$lib/stores/db.svelte';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import FeedList from '$lib/components/FeedList.svelte';
	import type { Episode } from '$lib/types/db';

	let query = $state('');
	let feedResults = $state<PIApiFeed[]>([]);
	let episodeResults = $state<PIApiEpisodeBase[]>([]);
	let resizedImageById = $state<SvelteMap<string, string>>(new SvelteMap());
	let isLoading = $state(false);
	let client = $state<PodcastIndexClient | null>(null);
	let view = $state<'feeds' | 'episodes'>('feeds');

	const ICON_MAX_WIDTH = 300;
	const ICON_MAX_HEIGHT = 300;

	onMount(async () => {
		const settings = getSettings();
		if (!settings) return;

		client = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
	});

	let currentFeeds = $derived(getFeeds());

	let activeEpisodes = $derived(getActiveEpisodes());

	let episodes: Episode[] = $derived(
		episodeResults.map((episode) => ({
			id: episode.id.toString(),
			feedId: episode.feedId.toString(),
			title: episode.title,
			publishedAt: new Date(episode.datePublished * 1000),
			content: episode.description,
			url: episode.enclosureUrl,
			durationMin: Math.floor(episode.duration / 60)
		}))
	);

	async function handleSearch() {
		if (!query.trim() || !client) return;

		feedResults = [];
		episodeResults = [];
		resizedImageById.clear();
		isLoading = true;

		try {
			feedResults = await client.searchFeeds(query);
			episodeResults = await client.episodesByPerson(query);

			view = feedResults.length > 0 ? 'feeds' : 'episodes';

			isLoading = false;

			// TODO: This is a hack to get the images to load after the results are loaded
			setTimeout(() => {
				type FeedImage = { image: string | undefined };
				const uniqueFeeds = new Map<number, FeedImage>();

				// Process feed results first (they have more complete data)
				feedResults.forEach((feed) => {
					if (!uniqueFeeds.has(feed.id)) {
						uniqueFeeds.set(feed.id, { image: feed.image || feed.artwork });
					}
				});

				// Then process episode results only for feeds we haven't seen
				episodeResults.forEach((episode) => {
					if (!uniqueFeeds.has(episode.feedId)) {
						uniqueFeeds.set(episode.feedId, { image: episode.feedImage });
					}
				});

				Array.from(uniqueFeeds.entries()).forEach(([id, feed]) => {
					if (!feed.image) {
						return;
					}
					const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(feed.image)}`;
					resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT).then((resizedImage) => {
						resizedImageById.set(id.toString(), resizedImage);
					});
				});
			}, 0);
		} catch (error) {
			console.error('Search failed:', error);
			isLoading = false;
		}
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
</div>

{#if isLoading}
	<div class="message">Loading...</div>
{:else if feedResults.length > 0 || episodeResults.length > 0}
	<div class="search-view-controls">
		{#if feedResults.length > 0}
			<button
				class="search-view-button"
				class:active={view === 'feeds'}
				onclick={() => (view = 'feeds')}
			>
				Feeds ({feedResults.length})
			</button>
		{/if}
		{#if episodeResults.length > 0}
			<button
				class="search-view-button"
				class:active={view === 'episodes'}
				onclick={() => (view = 'episodes')}
			>
				Episodes ({episodeResults.length})
			</button>
		{/if}
	</div>

	{#if view === 'feeds' && feedResults.length > 0}
		<FeedList feeds={feedResults} feedIconsById={resizedImageById} {currentFeeds} />
	{/if}
	{#if view === 'episodes' && episodeResults.length > 0}
		<EpisodeList {episodes} {activeEpisodes} feedIconsById={resizedImageById} isSearch />
	{/if}
{:else if query}
	<div class="message">No podcasts found</div>
{/if}

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

	.message {
		text-align: center;
		padding: 2rem;
	}

	button:disabled {
		opacity: 0.7;
		cursor: default;
	}

	.search-view-controls {
		display: flex;
		padding: 1rem;
		gap: 1rem;
		background-color: var(--bg-less);
	}

	.search-view-button {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		color: var(--primary-less);
		border: none;
	}

	.search-view-button.active {
		color: var(--primary-more);
		background-color: var(--bg);
	}
</style>
