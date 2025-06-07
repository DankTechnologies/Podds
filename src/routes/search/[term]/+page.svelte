<script lang="ts">
	import { page } from '$app/stores';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { getActiveEpisodes, getFeeds } from '$lib/stores/db.svelte';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import FeedList from '$lib/components/FeedList.svelte';
	import type { Feed, Episode } from '$lib/types/db';
	import { SearchHistoryService } from '$lib/service/SearchHistoryService.svelte';
	import { searchEpisodes, searchPodcasts } from '$lib/api/itunes';
	import { isOnline } from '$lib/utils/networkState.svelte';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';

	let feedResults = $state<Feed[]>([]);
	let episodeResults = $state<Episode[]>([]);
	let isLoading = $state(false);
	let view = $state<'feeds' | 'episodes'>('feeds');

	let term = $derived(decodeURIComponent($page.params.term));
	let previousTerm = $state('');

	let currentFeeds = $derived(getFeeds());
	let activeEpisodes = $derived(getActiveEpisodes());

	let currentFeedIds = $derived(new SvelteSet(currentFeeds.map((f) => f.id.toString())));
	let currentSubscribedFeedIds = $derived(
		new SvelteSet(currentFeeds.filter((f) => f.isSubscribed).map((f) => f.id.toString()))
	);

	let feedIconsById = $derived(
		new SvelteMap(feedResults.map((x) => [x.id.toString(), x.iconData]))
	);
	let episodeIconsById = $derived(new SvelteMap(episodeResults.map((x) => [x.feedId, x.iconData])));

	$effect(() => {
		if (term && term !== previousTerm) {
			previousTerm = term;
			handleSearch(term);
		}
	});

	async function handleSearch(term: string) {
		if (!term) return;

		feedResults = [];
		episodeResults = [];
		isLoading = true;

		let localEpisodeResults = [];
		let remoteEpisodeResults = [];

		try {
			[feedResults, remoteEpisodeResults, localEpisodeResults] = await Promise.all([
				isOnline() ? searchPodcasts(term, { skipConvertIcon: true }) : Promise.resolve([]),
				isOnline() ? searchEpisodes(term, { skipConvertIcon: true }) : Promise.resolve([]),
				EpisodeService.findEpisodesByTerm(term)
			]);

			localEpisodeResults.forEach((ep) => {
				const feed = currentFeeds.find((f) => f.id === ep.feedId);

				if (feed) {
					ep.iconData = feed.iconData;
					ep.title = `[${feed.title}] ${ep.title}`;
				}
			});

			episodeResults = [
				...new Map(
					[...localEpisodeResults, ...remoteEpisodeResults].map((ep) => [ep.id, ep])
				).values()
			].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

			// Set initial view based on results
			view = feedResults.length > 0 ? 'feeds' : 'episodes';

			// Save search history
			const latestEpisodeDate = new Date(
				Math.max(...episodeResults.map((e) => e.publishedAt.getTime()))
			);
			SearchHistoryService.addSearchHistory(term, latestEpisodeDate);

			isLoading = false;
		} catch (error) {
			console.error('Search failed:', error);
			isLoading = false;
		}
	}

	async function handleDeleteSearch(id: string) {
		SearchHistoryService.deleteSearchHistory(id);
	}
</script>

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
				Podcasts
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
	</div>

	{#if view === 'feeds' && feedResults.length > 0}
		<FeedList feeds={feedResults} {currentFeedIds} {currentSubscribedFeedIds} {feedIconsById} />
	{/if}
	{#if view === 'episodes' && episodeResults.length > 0}
		<EpisodeList
			episodes={episodeResults}
			{activeEpisodes}
			feedIconsById={episodeIconsById}
			isSearch
		/>
	{/if}
{:else if $page.params.term}
	<div class="message">No podcasts found</div>
{/if}

<style>
	.message {
		text-align: center;
		padding: 2rem;
	}

	.search-view-controls {
		display: flex;
		padding: 1rem;
		gap: 1rem;
		background-color: var(--bg-less);
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
