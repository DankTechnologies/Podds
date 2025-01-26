<script lang="ts">
	import { playService } from '$lib/service/PlayService.svelte';
	import { PodcastService } from '$lib/service/PodcastService';
	import { onMount } from 'svelte';
	import type { SvelteMap } from 'svelte/reactivity';
	import { RotateCcw, RotateCw, Play, Pause, Menu } from 'lucide-svelte';

	const ICON_SIZE = '2rem';
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

		<button class="player__button" onclick={handleBack}>
			<div class="stack-cell">
				<div>
					<RotateCcw size={ICON_SIZE} />
				</div>
				<div class="time-text">10</div>
			</div>
		</button>

		<button class="player__button" onclick={handlePlayPause}>
			<div class="stack-cell">
				<div class="play-button__circle"></div>
				<div class="play-button__icon">
					{#if playService.isPaused}
						<Play size={ICON_SIZE} />
					{:else}
						<Pause size={ICON_SIZE} />
					{/if}
				</div>
			</div></button
		>

		<button class="player__button" onclick={handleForward}>
			<div class="stack-cell">
				<div>
					<RotateCw size={ICON_SIZE} />
				</div>
				<div class="time-text">30</div>
			</div>
		</button>

		<button class="player__button" onclick={handlePlaylist}>
			<Menu size={ICON_SIZE} />
		</button>
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
		padding: 1rem;
		border-top: 3px solid darkorange;
		background-color: white;
	}

	.player__artwork {
		width: 3.5rem;
		height: 3.5rem;
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

	.stack-cell {
		display: grid;
		place-content: center;
	}

	.stack-cell > * {
		grid-area: 1 / 1;
	}

	.time-text {
		font-weight: bold;
		font-size: 0.75rem;
		place-self: center;
	}

	.play-button__circle {
		width: 3rem;
		height: 3rem;
		background-color: darkorange;
		border-radius: 50%;
	}

	.play-button__icon {
		color: whitesmoke;
		opacity: 0.9;
		place-self: center;
	}
</style>
