<script lang="ts">
	import { PodcastIndexClient } from '$lib/api/podcast-index';
	import type { PIApiEpisodeBase, PIApiFeed } from '$lib/types/podcast-index';
	import { Search as SearchIcon } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { resizeBase64Image } from '$lib/utils/resizeImage';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		getActiveEpisodes,
		getEpisodes,
		getFeedIconsById,
		getFeeds,
		getSettings
	} from '$lib/stores/db.svelte';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import FeedList from '$lib/components/FeedList.svelte';
	import type { Episode } from '$lib/types/db';

	let query = $state('');
	let feedResults = $state<PIApiFeed[]>([]);
	let episodeResults = $state<PIApiEpisodeBase[]>([]);
	let resizedImageById = $state<SvelteMap<string, string>>(new SvelteMap());
	let isLoading = $state(false);
	let client = $state<PodcastIndexClient | null>(null);
	let view = $state<'feeds' | 'episodes' | 'library'>('feeds');
	let libraryEpisodes = $state<Episode[]>([]);

	let feedIconsById = $derived(getFeedIconsById());

	const ICON_MAX_WIDTH = 300;
	const ICON_MAX_HEIGHT = 300;

	onMount(async () => {
		const settings = getSettings();
		if (!settings) return;

		client = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
	});

	let currentFeeds = $derived(getFeeds());

	let activeEpisodes = $derived(getActiveEpisodes());

	let settings = $derived(getSettings());

	let episodes: Episode[] = $derived(
		episodeResults.map((episode) => ({
			id: episode.guid, // aligns with feedParser
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
		libraryEpisodes = [];
		resizedImageById.clear();
		isLoading = true;

		try {
			feedResults = await client.searchFeeds(query);
			episodeResults = await client.episodesByPerson(query);

			// Search local episodes
			const searchQuery = query.toLowerCase();
			libraryEpisodes = getEpisodes().filter(
				(episode) =>
					episode.title.toLowerCase().includes(searchQuery) ||
					episode.content.toLowerCase().includes(searchQuery)
			);

			// Set initial view based on results
			if (feedResults.length > 0) {
				view = 'feeds';
			} else if (episodeResults.length > 0) {
				view = 'episodes';
			} else if (libraryEpisodes.length > 0) {
				view = 'library';
			}

			isLoading = false;

			// TODO: This is a hack to get the images to load after the results are loaded
			setTimeout(() => {
				type FeedImage = { image: string | undefined; title: string };
				const uniqueFeeds = new Map<number, FeedImage>();

				// Process feed results first (they have more complete data)
				feedResults.forEach((feed) => {
					if (!uniqueFeeds.has(feed.id)) {
						uniqueFeeds.set(feed.id, { image: feed.image || feed.artwork, title: feed.title });
					}
				});

				// Then process episode results only for feeds we haven't seen
				episodeResults.forEach((episode) => {
					if (!uniqueFeeds.has(episode.feedId)) {
						uniqueFeeds.set(episode.feedId, { image: episode.feedImage, title: episode.feedTitle });
					}
				});

				Array.from(uniqueFeeds.entries()).forEach(([id, feed]) => {
					if (!feed.image) {
						return;
					}
					resizeBase64Image(
						feed.image,
						ICON_MAX_WIDTH,
						ICON_MAX_HEIGHT,
						settings!.corsHelperUrl,
						settings!.corsHelperBackupUrl,
						feed.title
					).then((resizedImage) => {
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
			spellcheck="false"
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
{:else if feedResults.length > 0 || episodeResults.length > 0 || libraryEpisodes.length > 0}
	<div class="search-view-controls">
		{#if feedResults.length > 0}
			<button
				class="search-view-button"
				class:active={view === 'feeds'}
				onclick={() => (view = 'feeds')}
			>
				Feeds
				<span class="search-view-button-count">{feedResults.length}</span>
			</button>
		{/if}
		{#if episodeResults.length > 0}
			<button
				class="search-view-button"
				class:active={view === 'episodes'}
				onclick={() => (view = 'episodes')}
			>
				Episodes
				<span class="search-view-button-count">{episodeResults.length}</span>
			</button>
		{/if}
		{#if libraryEpisodes.length > 0}
			<button
				class="search-view-button"
				class:active={view === 'library'}
				onclick={() => (view = 'library')}
			>
				Library
				<span class="search-view-button-count">{libraryEpisodes.length}</span>
			</button>
		{/if}
	</div>

	{#if view === 'feeds' && feedResults.length > 0}
		<FeedList feeds={feedResults} feedIconsById={resizedImageById} {currentFeeds} />
	{/if}
	{#if view === 'episodes' && episodeResults.length > 0}
		<EpisodeList {episodes} {activeEpisodes} feedIconsById={resizedImageById} isSearch />
	{/if}
	{#if view === 'library' && libraryEpisodes.length > 0}
		<EpisodeList episodes={libraryEpisodes} {activeEpisodes} {feedIconsById} />
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
		gap: 1rem;
		padding: 1rem;
	}

	input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--primary-less);
		border-radius: 0.25rem;
	}

	input[type='search']::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
		-webkit-tap-highlight-color: transparent;
		height: 1.5rem;
		width: 1.5rem;
		border-radius: 50%;
		background: light-dark(var(--grey-500), var(--grey-600));
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
		background-size: 1em;
		background-position: center;
		background-repeat: no-repeat;
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	.search-button {
		padding: 0.75rem;
		background: var(--primary);
		border: none;
		color: var(--neutral);
		border-radius: 0.25rem;
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
		overflow-x: scroll;
	}

	.search-view-button {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		border: none;
		background: var(--bg);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.search-view-button.active {
		opacity: 1;
	}

	.search-view-button:not(.active) {
		opacity: 0.5;
	}

	.search-view-button-count {
		font-size: var(--text-xs);
		font-family: monospace;
		background-color: var(--bg);
		padding: 2px 4px;
		border-radius: 0.25rem;
	}

	.search-view-button.active .search-view-button-count {
		background-color: var(--bg-less);
	}
</style>
