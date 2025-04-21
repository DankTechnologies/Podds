<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { getActiveEpisodes, getEpisodes, getFeedIconsById } from '$lib/stores/db.svelte';

	let completedActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter((episode) => episode.isCompleted)
			.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())
			.slice(0, 10)
	);

	let completedEpisodes = $derived(
		getEpisodes()
			.filter((episode) => completedActiveEpisodes.find((x) => x.id === episode.id))
			.sort((a, b) => {
				const aIndex = completedActiveEpisodes.findIndex((x) => x.id === b.id);
				const bIndex = completedActiveEpisodes.findIndex((x) => x.id === a.id);
				return bIndex - aIndex;
			})
			.slice(0, 10)
	);

	let inProgressActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter((episode) => episode.playbackPosition > 0 && !episode.isCompleted)
			.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())
			.slice(0, 10)
	);

	let inProgressEpisodes = $derived(
		getEpisodes()
			.filter((episode) => inProgressActiveEpisodes.find((x) => x.id === episode.id))
			.sort((a, b) => {
				const aIndex = inProgressActiveEpisodes.findIndex((x) => x.id === b.id);
				const bIndex = inProgressActiveEpisodes.findIndex((x) => x.id === a.id);
				return bIndex - aIndex;
			})
			.slice(0, 10)
	);

	// sort by isPlaying, then by sortOrder
	let upNextActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter((episode) => episode.playbackPosition === 0 && episode.isDownloaded)
			.sort((a, b) => {
				return (a.sortOrder ?? 99999999) - (b.sortOrder ?? 99999999);
			})
	);

	let upNextEpisodes = $derived(
		getEpisodes()
			.filter((episode) => upNextActiveEpisodes.find((x) => x.id === episode.id))
			.sort((a, b) => {
				const aIndex = upNextActiveEpisodes.findIndex((x) => x.id === a.id);
				const bIndex = upNextActiveEpisodes.findIndex((x) => x.id === b.id);
				return aIndex - bIndex;
			})
	);

	let feedIconsById = $derived(getFeedIconsById());
	let view = $state('upNext');
</script>

<div class="playlist-view-controls">
	<button
		class="playlist-view-button"
		class:active={view === 'completed'}
		onclick={() => (view = 'completed')}
	>
		Completed
		<span class="playlist-view-button-count">{completedEpisodes.length}</span>
	</button>
	<button
		class="playlist-view-button"
		class:active={view === 'inProgress'}
		onclick={() => (view = 'inProgress')}
	>
		In Progress
		<span class="playlist-view-button-count">{inProgressEpisodes.length}</span>
	</button>
	<button
		class="playlist-view-button"
		class:active={view === 'upNext'}
		onclick={() => (view = 'upNext')}
	>
		Up Next
		<span class="playlist-view-button-count">{upNextEpisodes.length}</span>
	</button>
</div>

{#if view === 'completed'}
	<div class="section-completed">
		{#if completedEpisodes}
			<div class="section-content">
				<EpisodeList
					episodes={completedEpisodes}
					activeEpisodes={completedActiveEpisodes}
					{feedIconsById}
				/>
			</div>
		{/if}
	</div>
{/if}
{#if view === 'inProgress'}
	<div class="section-listened-to">
		{#if inProgressEpisodes}
			<div class="section-content">
				<EpisodeList
					episodes={inProgressEpisodes}
					activeEpisodes={inProgressActiveEpisodes}
					{feedIconsById}
				/>
			</div>
		{/if}
	</div>
{/if}
{#if view === 'upNext'}
	<div class="section-up-next">
		{#if upNextEpisodes}
			<div class="section-content">
				<EpisodeList
					episodes={upNextEpisodes}
					activeEpisodes={upNextActiveEpisodes}
					{feedIconsById}
					isPlaylist={true}
				/>
			</div>
		{/if}
	</div>
{/if}

<style>
	.playlist-view-controls {
		display: flex;
		padding: 1rem;
		gap: 0.5rem;
		background-color: var(--bg-less);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.playlist-view-button {
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		color: var(--primary-less);
		font-size: var(--text-smaller);
		border: none;
	}

	.playlist-view-button.active {
		color: var(--primary-more);
		background-color: var(--bg);
	}

	.playlist-view-button-count {
		font-size: var(--text-xs);
		font-family: monospace;
		background-color: var(--bg);
		padding: 2px 4px;
		border-radius: 0.25rem;
	}

	.playlist-view-button.active .playlist-view-button-count {
		background-color: var(--bg-less);
	}
</style>
