<script lang="ts">
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import { db, getSettings } from '$lib/stores/db.svelte';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import type { Episode } from '$lib/types/db';
	import { onMount } from 'svelte';
	import { SettingsService } from '$lib/service/SettingsService.svelte';

	const ITEMS_PER_PAGE = 10;

	let limit = $state<number>(ITEMS_PER_PAGE);
	let observerTarget = $state<HTMLElement | null>(null);

	let listenedToActiveEpisodes = $derived(
		db.activeEpisodes
			.find(
				{
					$and: [{ $or: [{ playbackPosition: { $gt: 0 } }, { isPlaying: 1 }] }, { wasAddedNext: 0 }]
				},
				{
					sort: { lastUpdatedAt: -1 },
					limit
				}
			)
			.fetch()
	);

	let listenedToEpisodes = $derived(
		db.episodes
			.find(
				{
					id: { $in: listenedToActiveEpisodes.map((x) => x.id) }
				},
				{
					sort: { lastUpdatedAt: -1 },
					limit
				}
			)
			.fetch()
	);

	// sort by isPlaying, then by sortOrder
	let upNextActiveEpisodes = $derived(
		db.activeEpisodes
			.find(
				{
					$and: [
						{ $or: [{ playbackPosition: 0 }, { isPlaying: 1 }, { wasAddedNext: 1 }] },
						{ isDownloaded: 1 }
					]
				},
				{
					sort: { isPlaying: -1, sortOrder: 1 }
				}
			)
			.fetch()
	);

	let upNextEpisodes = $derived(
		db.episodes
			.find(
				{
					id: { $in: upNextActiveEpisodes.map((x) => x.id) }
				},
				{
					sort: { lastUpdatedAt: -1 }
				}
			)
			.fetch()
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
