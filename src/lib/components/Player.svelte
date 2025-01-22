<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService';
	import { PodcastService } from '$lib/service/PodcastService';
	import { liveQuery } from 'dexie';
	import { onMount } from 'svelte';
	import type { SvelteMap } from 'svelte/reactivity';

	let podcastIcons = $state<SvelteMap<number, string>>();
	let time = $state(0);
	let paused = $state(true);
	let playingEpisode = liveQuery(() => EpisodeService.getPlayingEpisode());

	function handleBack() {
		time = Math.max(0, time - 10);
	}

	function handlePlayPause() {
		paused = !paused;
	}
	function handleForward() {
		if ($playingEpisode?.durationMin !== undefined) {
			time = Math.min($playingEpisode.durationMin * 60, time + 30);
		} else {
			time += 30;
		}
	}

	function handlePlaylist() {
		console.log('Opening playlist/menu');
	}

	onMount(async () => {
		podcastIcons = await PodcastService.fetchPodcastIconsById();
	});
</script>

{#if $playingEpisode}
	<audio src={$playingEpisode.url} bind:currentTime={time} bind:paused></audio>
	<div class="player">
		<div class="player__artwork">
			<img src={podcastIcons?.get($playingEpisode.id)} alt="" />
		</div>

		<button class="player__button" onclick={handleBack}> -10s </button>

		<button class="player__button" onclick={handlePlayPause}>
			{$playingEpisode.isPlaying ? '⏸️' : '▶️'}
		</button>

		<button class="player__button" onclick={handleForward}> +30s </button>

		<button class="player__button" onclick={handlePlaylist}> ☰ </button>
	</div>
{/if}

<style>
	.player {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: fixed;
		bottom: 4.25rem;
		left: 0;
		right: 0;
		z-index: 50;
		height: 3.25rem;
		padding: 0.5rem 1rem;
		border-top: 3px solid darkorange;
		background-color: white;
	}

	/* .player__artwork {
		width: 2.5rem;
		height: 2.5rem;
	}

	.player__artwork img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
 */
	.player__button {
		border: none;
		background: none;
		color: slategray;
	}
</style>
