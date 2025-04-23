<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { getActiveEpisodes, getEpisodes, getFeedIconsById } from '$lib/stores/db.svelte';

	let listenedToActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter((episode) => episode.playbackPosition > 0 || episode.isPlaying)
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

	// sort by isPlaying, then by sortOrder
	let upNextActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter(
				(episode) => (episode.playbackPosition === 0 || episode.isPlaying) && episode.isDownloaded
			)
			.sort((a, b) => {
				if (a.isPlaying && !b.isPlaying) return -1;
				if (!a.isPlaying && b.isPlaying) return 1;
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

	let playingEpisode = $derived(getActiveEpisodes().find((x) => x.isPlaying));

	let feedIconsById = $derived(getFeedIconsById());
	let view = $state('upNext');

	let previousUpNextCount = $state(-1);
	let previousListenedToCount = $state(-1);
	let wiggleUpNext = $state(false);
	let wiggleListenedTo = $state(false);

	$effect(() => {
		// avoid wiggle on page load
		if (previousUpNextCount === -1) {
			previousUpNextCount = upNextEpisodes.length;
			previousListenedToCount = listenedToEpisodes.length;
			return;
		}

		if (playingEpisode) {
			return;
		}

		if (upNextEpisodes.length !== previousUpNextCount) {
			wiggleUpNext = true;
			previousUpNextCount = upNextEpisodes.length;
			setTimeout(() => (wiggleUpNext = false), 300);
		}

		if (listenedToEpisodes.length !== previousListenedToCount) {
			wiggleListenedTo = true;
			previousListenedToCount = listenedToEpisodes.length;
			setTimeout(() => (wiggleListenedTo = false), 300);
		}
	});
</script>

<div class="playlist-view-controls">
	<button
		class="playlist-view-button"
		class:active={view === 'listenedTo'}
		class:wiggle={wiggleListenedTo}
		onclick={() => (view = 'listenedTo')}
	>
		Recently Listened To
	</button>
	<button
		class="playlist-view-button"
		class:active={view === 'upNext'}
		class:wiggle={wiggleUpNext}
		onclick={() => (view = 'upNext')}
	>
		Up Next
		<span class="playlist-view-button-count">{upNextEpisodes.length}</span>
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
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 4px solid var(--primary-less);
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
		display: inline-block;
	}

	.playlist-view-button.active .playlist-view-button-count {
		background-color: var(--bg-less);
	}

	@keyframes wiggle {
		0% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-2deg);
		}
		75% {
			transform: rotate(2deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}

	.wiggle {
		animation: wiggle 0.2s ease-in-out;
	}
</style>
