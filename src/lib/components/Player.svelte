<script lang="ts">
	import { playService } from '$lib/service/PlayService.svelte';
	import { PodcastService } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	import type { SvelteMap } from 'svelte/reactivity';

	let podcastIcons = $state<SvelteMap<number, string>>();

	function handleBack() {
		playService.seek(-10);
	}

	function handlePlayPause() {
		playService.togglePlayPause();
	}

	function handleForward() {
		playService.seek(30);
	}

	function handlePlaylist() {
		console.log('Opening playlist/menu');
	}

	onMount(async () => {
		podcastIcons = await PodcastService.fetchPodcastIconsById();
	});
</script>

{#if playService.episode}
	<div class="player">
		<div class="player__artwork">
			<img src={`data:${podcastIcons?.get(playService.episode.podcastId)}`} alt="" />
		</div>

		<button class="player__button" onclick={handleBack}> -10s </button>

		<button class="player__button" onclick={handlePlayPause}>
			{playService.isPaused ? '▶️' : '⏸️'}
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

	.player__artwork {
		width: 3.25rem;
		height: 3.25rem;
	}

	.player__artwork img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: opacity 0.3s ease;
	}

	.player__button {
		border: none;
		background: none;
		color: slategray;
	}
</style>
