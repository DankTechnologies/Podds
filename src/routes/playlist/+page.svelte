<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { getActiveEpisodes, getEpisodes, getFeedIconsById } from '$lib/stores/db.svelte';

	let listenedToActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter((episode) => episode.playbackPosition > 0 && !episode.isPlaying)
			.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())
			.slice(0, 10)
	);

	let listenedToEpisodes = $derived(
		getEpisodes()
			.filter((episode) => listenedToActiveEpisodes.find((x) => x.id === episode.id))
			.sort((a, b) => {
				const aIndex = listenedToActiveEpisodes.findIndex((x) => x.id === b.id);
				const bIndex = listenedToActiveEpisodes.findIndex((x) => x.id === a.id);
				return bIndex - aIndex;
			})
			.slice(0, 10)
	);

	let upNextActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter(
				(episode) => episode.playbackPosition === 0 && !episode.isPlaying && episode.isDownloaded
			)
			.sort((a, b) => (a.sortOrder ?? 99999999) - (b.sortOrder ?? 99999999))
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
		class:active={view === 'listenedTo'}
		onclick={() => (view = 'listenedTo')}
	>
		Recently Listened To
	</button>
	<button
		class="playlist-view-button"
		class:active={view === 'upNext'}
		onclick={() => (view = 'upNext')}
	>
		Up Next
	</button>
</div>

{#if view === 'listenedTo'}
	<div class="section-listened-to">
		{#if listenedToEpisodes}
			<div class="section-content">
				<EpisodeList
					episodes={listenedToEpisodes}
					activeEpisodes={listenedToActiveEpisodes}
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
		gap: 1rem;
		background-color: var(--bg-less);
	}

	.playlist-view-button {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		color: var(--primary-less);
		border: none;
	}

	.playlist-view-button.active {
		color: var(--primary-more);
		background-color: var(--bg);
	}
</style>
