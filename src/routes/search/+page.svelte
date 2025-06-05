<script lang="ts">
	import { Bell, BellRing, X, BellOff, Dot } from 'lucide-svelte';
	import { getSearchHistory } from '$lib/stores/db.svelte';
	import type { SearchHistory } from '$lib/types/db';
	import { SearchHistoryService } from '$lib/service/SearchHistoryService.svelte';
	import { goto } from '$app/navigation';

	let searchHistory = $derived(
		getSearchHistory()
			.slice(0, 20)
			.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
			.sort((a, b) => Number(b.monitored) - Number(a.monitored))
	);

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

		goto(`/search/${encodeURIComponent(history.term)}`);
	}
</script>

{#if searchHistory.length > 0}
	<div class="search-history">
		<div class="search-history-header">Previous Searches</div>
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
	.search-history {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.search-history-header {
		background-color: light-dark(var(--grey-200), var(--grey-800));
		color: light-dark(var(--primary-grey-dark), var(--text));
		padding: 0.25rem 0.75rem;
		border-radius: 0.25rem;
		letter-spacing: 0.05em;
		font-weight: 600;
		font-size: var(--text-large);
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
