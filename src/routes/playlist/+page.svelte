<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { getActiveEpisodes, getEpisodes, getSettings } from '$lib/stores/db.svelte';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import type { Episode } from '$lib/types/db';
	import { onMount } from 'svelte';
	import { SettingsService } from '$lib/service/SettingsService.svelte';

	const ITEMS_PER_PAGE = 20;

	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	let listenedToActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter(
				(episode) => (episode.playbackPosition > 0 || episode.isPlaying) && !episode.wasAddedNext
			)
			.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())
			.slice(0, limit)
	);

	let listenedToEpisodes = $derived(
		getEpisodes()
			.filter((episode) => listenedToActiveEpisodes.find((x) => x.id === episode.id))
			.sort((a, b) => {
				const aIndex = listenedToActiveEpisodes.findIndex((x) => x.id === b.id);
				const bIndex = listenedToActiveEpisodes.findIndex((x) => x.id === a.id);
				return bIndex - aIndex;
			})
			.slice(0, limit)
	);

	// sort by isPlaying, then by sortOrder
	let upNextActiveEpisodes = $derived(
		getActiveEpisodes()
			.filter(
				(episode) =>
					(episode.playbackPosition === 0 || episode.isPlaying || episode.wasAddedNext) &&
					episode.isDownloaded
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

	let view = $derived(getSettings().playlistView);
	let previousUpNextCount = $state(-1);
	let wiggleUpNext = $state(false);

	$effect(() => {
		if (upNextEpisodes.length !== previousUpNextCount) {
			if (upNextEpisodes.length > previousUpNextCount && previousUpNextCount !== -1) {
				wiggleUpNext = true;
				setTimeout(() => (wiggleUpNext = false), 300);
			}
			previousUpNextCount = upNextEpisodes.length;
		}
	});

	function handlePlayNext(episode: Episode) {
		const episodeIds = upNextEpisodes.map((e) => e.id);

		if (episodeIds.includes(episode.id)) {
			const targetIndex = episodeIds.indexOf(episode.id);
			episodeIds.splice(targetIndex, 1);
		} else {
			EpisodeService.markAddedNext(episode.id);
		}

		episodeIds.unshift(episode.id);
		EpisodeService.reorderEpisodes(episodeIds);
	}

	async function loadMoreEpisodes() {
		limit += ITEMS_PER_PAGE;
	}

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && listenedToEpisodes?.length) {
						loadMoreEpisodes();
					}
				});
			},
			{ rootMargin: '200px' }
		);

		if (observerTarget) {
			observer.observe(observerTarget);
		}

		return () => {
			if (observerTarget) {
				observer.disconnect();
			}
		};
	});
</script>

<div class="playlist-view-controls">
	<button
		class="playlist-view-button"
		class:active={view === 'listenedTo'}
		onclick={() => SettingsService.updatePlaylistView('listenedTo')}
	>
		Recently Listened To
	</button>
	<button
		class="playlist-view-button"
		class:active={view === 'upNext'}
		class:wiggle={wiggleUpNext}
		onclick={() => SettingsService.updatePlaylistView('upNext')}
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
					isPlaylist={true}
					onPlayNext={handlePlayNext}
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
					isPlaylist={true}
					onPlayNext={handlePlayNext}
				/>
			</div>
		{/if}
	</div>
{/if}

<div bind:this={observerTarget}></div>

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
		border: none;
		background: var(--bg);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.playlist-view-button.active {
		opacity: 1;
	}

	.playlist-view-button:not(.active) {
		opacity: 0.5;
	}

	.playlist-view-button-count {
		font-size: var(--text-xs);
		font-family: monospace;
		color: var(--primary-200);
		background-color: var(--bg);
		padding: 2px 4px;
		border-radius: 0.25rem;
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
