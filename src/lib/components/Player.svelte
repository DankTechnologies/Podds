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
		<input
			class="player__playback"
			type="range"
			min="0"
			bind:value={playService.currentTime}
			max={playService.totalDuration}
			oninput={(event) => {
				const target = event.target as HTMLInputElement;
				const newTime = Number(target.value);
				console.log(`Attempting to set time to ${newTime} of ${playService.totalDuration}`);
				playService.setCurrentTime(newTime);
			}}
		/>

		<div class="player__controls">
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
					<div class="play-pause__circle"></div>
					<div class="play-pause__icon">
						{#if playService.isPaused}
							<Play class="play-pause__icon--play" size={ICON_SIZE} />
						{:else}
							<Pause class="play-pause__icon--pause" size={ICON_SIZE} />
						{/if}
					</div>
				</div>
			</button>

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
	</div>
{/if}

<style>
	.player {
		display: flex;
		flex-direction: column;
		position: fixed;
		bottom: 4.25rem;
		left: 0;
		right: 0;
		z-index: 50;
		background-color: white;
	}

	.player__playback {
		display: flex;
		flex: 1;
		appearance: none;
		background: lightgrey;
	}

	.player__playback::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 1rem;
		height: 0.5rem;
		background: darkorange;
	}

	.player__controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		height: 3.25rem;
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

	.play-pause__circle {
		width: 3rem;
		height: 3rem;
		background-color: darkorange;
		border-radius: 50%;
	}

	.play-pause__icon {
		color: whitesmoke;
		opacity: 0.85;
		place-self: center;
	}

	.play-pause__icon :global(.play-pause__icon--play) {
		margin-top: 0.25rem;
		margin-left: 0.25rem;
		stroke-width: 2.5;
	}

	.play-pause__icon :global(.play-pause__icon--pause) {
		margin-top: 0.25rem;
		stroke-width: 2.5;
	}
</style>
