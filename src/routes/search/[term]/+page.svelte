<script lang="ts">
	import { page } from '$app/stores';
	import { Search as Bell, BellRing, X, Dot } from 'lucide-svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { getActiveEpisodes, getFeeds, getSearchHistory } from '$lib/stores/db.svelte';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import FeedList from '$lib/components/FeedList.svelte';
	import type { Feed, Episode, SearchHistory } from '$lib/types/db';
	import { SearchHistoryService } from '$lib/service/SearchHistoryService.svelte';
	import { searchEpisodes, searchPodcasts } from '$lib/api/itunes';

	let feedResults = $state<Feed[]>([]);
	let episodeResults = $state<Episode[]>([]);
	let isLoading = $state(false);
	let view = $state<'feeds' | 'episodes'>('feeds');

	let term = $derived(decodeURIComponent($page.params.term));
	let previousTerm = $state('');

	let searchHistory = $derived(
		getSearchHistory()
			.slice(0, 20)
			.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
			.sort((a, b) => Number(b.monitored) - Number(a.monitored))
	);

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

		try {
			[feedResults, episodeResults] = await Promise.all([
				searchPodcasts(term, { skipConvertIcon: true }),
				searchEpisodes(term, { skipConvertIcon: true })
			]);

			// Set initial view based on results
			if (feedResults.length > 0) {
				view = 'feeds';
			} else if (episodeResults.length > 0) {
				view = 'episodes';
			}

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

	async function handleToggleMonitor(id: string) {
		SearchHistoryService.toggleMonitor(id);
	}

	async function handleSearchTermClick(history: SearchHistory) {
		if (history.hasNewResults) {
			SearchHistoryService.clearHasNewResults(history.id);
		}

		await handleSearch(history.term);
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
		<div class="episodes-header">
			<button
				class="monitor-button"
				class:active={searchHistory.find((h) => h.term === $page.params.term)?.monitored}
				onclick={() =>
					handleToggleMonitor(searchHistory.find((h) => h.term === $page.params.term)?.id ?? '')}
			>
				{#if searchHistory.find((h) => h.term === $page.params.term)?.monitored}
					<BellRing size="14" /> Tracking
				{:else}
					Not Tracking
				{/if}
			</button>
		</div>
		<EpisodeList
			episodes={episodeResults}
			{activeEpisodes}
			feedIconsById={episodeIconsById}
			isSearch
		/>
	{/if}
{:else if $page.params.term}
	<div class="message">No podcasts found</div>
{:else if searchHistory.length > 0}
	<div class="search-history">
		<div class="search-history-header">History</div>
		<div class="search-history-list">
			{#each searchHistory as history}
				<div class="search-history-item">
					<button
						class="search-term"
						class:new-results={history.monitored && history.hasNewResults}
						onclick={() => handleSearchTermClick(history)}
					>
						{history.term}
						{#if history.monitored && history.hasNewResults}
							<div class="new-results-dot">
								<Dot size="24" />
							</div>
						{/if}
					</button>
					<div class="search-history-actions">
						<button
							class="monitor-button"
							class:monitored={history.monitored}
							onclick={() => handleToggleMonitor(history.id)}
						>
							{#if history.monitored}
								<BellRing size="1rem" />
							{:else}
								<Bell size="1rem" />
							{/if}
						</button>
						<button class="delete-button" onclick={() => handleDeleteSearch(history.id)}>
							<X size="1rem" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
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

	.search-history {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.search-history-header {
		font-size: var(--text-2xl);
		font-weight: 600;
	}

	.search-history-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.search-history-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: var(--bg-less);
		border-radius: 0.25rem;
	}

	.search-term {
		background: none;
		border: none;
		padding: 0;
		display: flex;
		align-items: center;
		color: var(--primary-faint);
	}

	.search-term.new-results {
		color: var(--primary-more);
	}

	.new-results-dot {
		margin-left: -0.25rem;
	}

	.search-history-actions {
		display: flex;
		gap: 1rem;
	}

	.episodes-header {
		padding: 1rem;
		display: flex;
		justify-content: flex-end;
		background-color: var(--bg-less);
	}

	.monitor-button {
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
		transition: all 0.6s ease-in-out;
		white-space: nowrap;
		overflow: hidden;
	}

	.monitor-button:not(.active) {
		opacity: 0.4;
		box-shadow: none;
	}

	.monitor-button.active {
		color: var(--primary-less);
		background: var(--bg-less);
		box-shadow: 0.25rem 0.25rem 0 0 var(--primary-less);
	}

	.delete-button {
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
		opacity: 0.5;
	}
</style>
