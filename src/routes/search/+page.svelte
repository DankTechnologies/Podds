<script lang="ts">
	import { Search as SearchIcon, Bell, BellRing, X, BellOff, Dot } from 'lucide-svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { getActiveEpisodes, getFeeds, getSearchHistory } from '$lib/stores/db.svelte';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import FeedList from '$lib/components/FeedList.svelte';
	import type { Feed, Episode, SearchHistory } from '$lib/types/db';
	import { SearchHistoryService } from '$lib/service/SearchHistoryService.svelte';
	import { searchEpisodes, searchPodcasts } from '$lib/api/itunes';

	let query = $state('');
	let queryTrimmed = $derived(query.trim());
	let feedResults = $state<Feed[]>([]);
	let episodeResults = $state<Episode[]>([]);
	let isLoading = $state(false);
	let view = $state<'feeds' | 'episodes'>('feeds');

	let searchHistory = $derived(
		getSearchHistory()
			.slice(0, 20)
			.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
			.sort((a, b) => Number(b.monitored) - Number(a.monitored))
	);

	let currentFeeds = $derived(getFeeds());
	let activeEpisodes = $derived(getActiveEpisodes());

	let episodeIconsById = $derived(new SvelteMap(episodeResults.map((x) => [x.feedId, x.iconData])));

	$effect(() => {
		if (queryTrimmed === '') {
			feedResults = [];
			episodeResults = [];
		}
	});

	async function handleSearch() {
		if (!queryTrimmed) return;

		feedResults = [];
		episodeResults = [];
		isLoading = true;

		try {
			feedResults = await searchPodcasts(queryTrimmed);
			episodeResults = await searchEpisodes(queryTrimmed);

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
			SearchHistoryService.addSearchHistory(queryTrimmed, latestEpisodeDate);

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

		query = history.term;
		await handleSearch();
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
{:else if query && (feedResults.length > 0 || episodeResults.length > 0)}
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
	</div>

	{#if view === 'feeds' && feedResults.length > 0}
		<FeedList feeds={feedResults} {currentFeeds} />
	{/if}
	{#if view === 'episodes' && episodeResults.length > 0}
		<div class="episodes-header">
			<button
				class="monitor-button"
				class:monitored={searchHistory.find((h) => h.term === query)?.monitored}
				onclick={() => handleToggleMonitor(searchHistory.find((h) => h.term === query)?.id ?? '')}
			>
				{#if searchHistory.find((h) => h.term === query)?.monitored}
					<BellRing size="16" /> Track New Episodes - ON
				{:else}
					<BellOff size="16" /> Track New Episodes - OFF
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
{:else if query}
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

	input[type='search']::placeholder {
		opacity: 0.5;
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
	}

	.episodes-header .monitor-button {
		background: var(--bg-less);
	}

	.monitor-button,
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

	.monitor-button.monitored {
		opacity: 1;
		color: var(--success);
	}
</style>
