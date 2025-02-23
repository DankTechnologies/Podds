<script lang="ts">
	import { RotateCcw, RotateCw, Play, Pause, X } from 'lucide-svelte';
	import { Log } from '$lib/service/LogService';
	import { getFeeds, getPlayingEpisode } from '$lib/stores/db.svelte';
	import { formatPlaybackPosition } from '$lib/utils/time';
	import { EpisodeService } from '$lib/service/EpisodeService';

	const ICON_SIZE = '2rem';

	let episode = $derived(getPlayingEpisode());
	let feed = $derived(getFeeds().find((f) => f.id === episode?.feedId));
	let currentTime = $state(0);
	let duration = $state(0);
	let paused = $state(true);

	$effect(() => {
		currentTime = episode?.playbackPosition ?? 0;
	});

	function handleBack() {
		if (!episode) return;
		const newTime = Math.max(0, Math.min(duration, currentTime - 10));
		currentTime = newTime;
		EpisodeService.updatePlaybackPosition(episode.id, newTime);
	}

	function handlePlayPause() {
		if (!episode) return;
		paused = !paused;
	}

	function handleForward() {
		if (!episode) return;
		const newTime = Math.max(0, Math.min(duration, currentTime + 30));
		currentTime = newTime;
		EpisodeService.updatePlaybackPosition(episode.id, newTime);
	}

	function handleStop() {
		if (!episode) return;
		EpisodeService.clearPlayingEpisode();
	}

	function handlePlaylist() {
		Log.info('Opening playlist/menu');
	}
</script>

{#if episode}
	<audio src={episode.url} bind:duration bind:currentTime bind:paused></audio>
	<div class="player">
		<div class="player__time">
			<div>
				{formatPlaybackPosition(currentTime)}
			</div>
			<div>
				-{formatPlaybackPosition(duration - currentTime)}
			</div>
		</div>
		<input
			class="player__playback"
			type="range"
			min="0"
			bind:value={currentTime}
			max={duration}
			oninput={(event) => {
				const target = event.target as HTMLInputElement;
				const newTime = Number(target.value);
				Log.debug(`Attempting to set time to ${newTime} of ${duration}`);
				if (episode) {
					currentTime = newTime;
					EpisodeService.updatePlaybackPosition(episode.id, newTime);
				}
			}}
		/>
		<div class="player__controls">
			<div class="player__artwork">
				{#if feed?.iconData}
					<img src={`data:${feed.iconData}`} alt="" />
				{/if}
			</div>

			<button class="player__button" onclick={handleBack}>
				<div class="stack-cell">
					<div>
						<RotateCcw size={ICON_SIZE} />
					</div>
					<div class="time-text">10</div>
				</div>
			</button>

			<button class="player__button play-pause" onclick={handlePlayPause}>
				<div class="stack-cell">
					<div class="play-pause__circle"></div>
					<div class="play-pause__icon">
						{#if paused}
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

			<button class="player__button" onclick={handleStop}>
				<X size={ICON_SIZE} />
			</button>
		</div>
	</div>
{/if}

<style>
	.player {
		display: flex;
		flex-direction: column;
		position: fixed;
		bottom: 4rem;
		left: 0;
		right: 0;
		z-index: 50;
		opacity: 0.99;
		backdrop-filter: blur(1rem) saturate(50%);
		background: rgba(var(--neutral-rgb), 0.7);
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.player__time {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-small);
		padding: 0.25rem 0.5rem 0;
	}

	.player__playback {
		display: flex;
		flex: 1;
		appearance: none;
		background: var(--primary);
		margin-top: 0.5rem;
	}

	.player__playback::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 1.25rem;
		height: 1.5rem;
		background-color: var(--primary-more);
		border-top: 2px solid var(--primary-less);
		border-left: 2px solid var(--primary-less);
		border-right: 2px solid var(--primary-less);
		margin-top: -0.5rem;
		border-top-left-radius: 0.25rem;
		border-top-right-radius: 0.25rem;
	}

	.player__playback::-moz-range-thumb {
		width: 1.25rem;
		height: 1.25rem;
		background-color: var(--primary-more);
		border: none;
	}

	.player__controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 0;
		height: 3.25rem;
	}

	.player__artwork {
		width: 5.25rem;
		height: 5.25rem;
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
		color: var(--primary-more);
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

	.play-pause {
		color: white;
	}
	.play-pause__circle {
		width: 3rem;
		height: 3rem;
		background-color: var(--primary);
		border-radius: 50%;
	}

	.play-pause__icon {
		color: var(--neutral);
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
