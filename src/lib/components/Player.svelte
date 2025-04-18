<script lang="ts">
	import { RotateCcw, RotateCw, Play, Pause, X, Loader2 } from 'lucide-svelte';
	import { formatPlaybackPosition } from '$lib/utils/time';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { ActiveEpisode } from '$lib/types/db';
	import type { SvelteMap } from 'svelte/reactivity';
	import { page } from '$app/state';
	import PlayerDetails from './PlayerDetails.svelte';

	const ICON_SIZE = '2rem';

	let {
		episode,
		feedIconsById
	}: { episode: ActiveEpisode; feedIconsById: SvelteMap<string, string> } = $props();

	let currentTime = $state(0);
	let lastUpdatedTime = $state(0);
	let duration = $state(0);
	let paused = $state(true);
	let showDetailedControls = $state(false);
	let previousEpisodeId = $state('');
	let previousPage = $state('');

	let remainingTime = $derived(duration - currentTime);

	onMount(() => {
		AudioService.loadPaused(episode.url, episode.playbackPosition ?? 0);
	});

	$effect(() => {
		if (page.url.pathname !== previousPage) {
			previousPage = page.url.pathname;
			showDetailedControls = false;
		}
	});

	$effect(() => {
		if (episode.id !== previousEpisodeId) {
			previousEpisodeId = episode.id;
			showDetailedControls = false;

			AudioService.updateMediaSessionMetadata(
				episode.title,
				episode.feedTitle,
				feedIconsById.get(episode.feedId)
			);
		}
	});

	$effect(() => {
		const updateTime = () => {
			currentTime = AudioService.getCurrentTime();

			let currentTimeRounded = Math.round(currentTime);

			// Update media session every second instead of every timeupdate
			if (currentTimeRounded !== Math.floor(lastUpdatedTime)) {
				AudioService.updateMediaSessionPosition(duration, currentTime);
			}

			// Update playback position every 5 seconds
			if (
				currentTimeRounded > 0 &&
				currentTimeRounded % 5 === 0 &&
				currentTimeRounded !== lastUpdatedTime
			) {
				EpisodeService.updatePlaybackPosition(episode.id, currentTimeRounded, remainingTime);
				lastUpdatedTime = currentTimeRounded;
			}
		};

		AudioService.addEventListener('timeupdate', updateTime);

		return () => AudioService.removeEventListener('timeupdate', updateTime);
	});

	$effect(() => {
		const updateDuration = () => {
			duration = AudioService.getDuration();
		};

		AudioService.addEventListener('durationchange', updateDuration);

		return () => {
			AudioService.removeEventListener('durationchange', updateDuration);
		};
	});

	$effect(() => {
		const updatePaused = () => {
			paused = AudioService.getPaused();
		};

		AudioService.addEventListener('pause', updatePaused);
		AudioService.addEventListener('play', updatePaused);

		return () => {
			AudioService.removeEventListener('pause', updatePaused);
			AudioService.removeEventListener('play', updatePaused);
		};
	});

	$effect(() => {
		const handleEnded = () => {
			EpisodeService.markCompleted(episode.id);
			const upNextEpisode = EpisodeService.findUpNextEpisode();
			if (upNextEpisode) {
				EpisodeService.setPlayingEpisode(upNextEpisode);
				AudioService.play(upNextEpisode.url, upNextEpisode.playbackPosition);
			} else {
				AudioService.stop();
				EpisodeService.clearPlayingEpisodes();
			}
		};

		AudioService.addEventListener('ended', handleEnded);

		return () => AudioService.removeEventListener('ended', handleEnded);
	});

	function handleBack(e: Event) {
		e.stopPropagation();
		if (!episode.isDownloaded) return;
		const newTime = Math.max(0, Math.min(duration, currentTime - 10));
		AudioService.seek(newTime);
		EpisodeService.updatePlaybackPosition(episode.id, newTime, remainingTime);
	}

	function handlePlayPause(e: Event) {
		e.stopPropagation();
		if (!episode.isDownloaded) return;
		AudioService.togglePlayPause();
	}

	function handleForward(e: Event) {
		e.stopPropagation();
		if (!episode.isDownloaded) return;
		const newTime = Math.max(0, Math.min(duration, currentTime + 30));
		AudioService.seek(newTime);
		EpisodeService.updatePlaybackPosition(episode.id, newTime, remainingTime);
	}

	function handleStop(e: Event) {
		e.stopPropagation();
		AudioService.stop();
		EpisodeService.clearPlayingEpisodes();
	}

	function handleFeedClick(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		goto(`/podcast/${episode.feedId}`);
	}

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		const newTime = Number(target.value);

		AudioService.seek(newTime);
		EpisodeService.updatePlaybackPosition(episode.id, newTime, remainingTime);
	}
</script>

<div
	class="player"
	onclick={() => (showDetailedControls = !showDetailedControls)}
	onkeydown={(e) => e.key === 'Enter' && (showDetailedControls = !showDetailedControls)}
	role="button"
	tabindex="0"
>
	<input
		class="player__playback"
		type="range"
		min="0"
		bind:value={currentTime}
		max={duration}
		style="--value: {currentTime}; --max: {duration}"
		disabled
	/>
	<div class="player__controls">
		<div class="player__artwork">
			<img src={`data:${feedIconsById.get(episode.feedId)}`} alt="" />
		</div>

		<button class="player__button" onclick={(e) => handleBack(e)}>
			<div class="stack-cell">
				<div>
					<RotateCcw size={ICON_SIZE} />
				</div>
				<div class="time-text">10</div>
			</div>
		</button>

		<button class="player__button play-pause" onclick={(e) => handlePlayPause(e)}>
			<div class="stack-cell">
				<div class="play-pause__circle"></div>
				<div class="play-pause__icon">
					{#if !episode.isDownloaded}
						<Loader2 class="play-pause__icon--loading" size={ICON_SIZE} />
					{:else if paused}
						<Play class="play-pause__icon--play" size={ICON_SIZE} />
					{:else}
						<Pause class="play-pause__icon--pause" size={ICON_SIZE} />
					{/if}
				</div>
			</div>
		</button>

		<button class="player__button" onclick={(e) => handleForward(e)}>
			<div class="stack-cell">
				<div>
					<RotateCw size={ICON_SIZE} />
				</div>
				<div class="time-text">30</div>
			</div>
		</button>

		<button class="player__button" onclick={(e) => handleStop(e)}>
			<X size={ICON_SIZE} />
		</button>
	</div>
</div>

<PlayerDetails
	{episode}
	{currentTime}
	{duration}
	{remainingTime}
	{paused}
	onBack={handleBack}
	onPlayPause={handlePlayPause}
	onForward={handleForward}
	onSeek={handleSeek}
	onFeedClick={handleFeedClick}
	onClose={() => (showDetailedControls = false)}
	isOpen={showDetailedControls}
/>

<style>
	.player {
		display: flex;
		container-type: inline-size;
		flex-direction: column;
		position: fixed;
		bottom: 4rem;
		left: 0;
		right: 0;
		z-index: 49;
		background: linear-gradient(to bottom, var(--bg-less) 0%, var(--bg) 60%, var(--bg) 100%);
	}
	.player__playback {
		display: flex;
		flex: 1;
		appearance: none;
		border: none;
		--progress: calc((var(--value) / var(--max)) * 100%);
	}

	/* Track styles */
	.player__playback::-webkit-slider-runnable-track {
		height: 0.25rem;
		background: linear-gradient(
			to right,
			var(--primary) var(--progress),
			var(--bg-less) var(--progress)
		);
		border: none;
	}

	.player__playback::-moz-range-track {
		height: 0.25rem;
		background: linear-gradient(
			to right,
			var(--primary) var(--progress),
			var(--bg) var(--progress)
		);
		border: none;
	}

	/* Hide thumb in collapsed state */
	.player__playback::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 0;
		height: 0;
	}

	.player__playback::-moz-range-thumb {
		width: 0;
		height: 0;
		border: none;
	}

	.player__controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		height: 3.25rem;
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
		border-radius: 0.5rem;
	}

	.player__button {
		border: none;
		background: none;
		color: var(--primary-more);
		border-radius: 5rem;
		transition:
			box-shadow 0.05s,
			transform 0.05s;
	}

	.player__button:active {
		box-shadow: 0 0 2rem var(--bg-less);
		transform: scale(0.95);
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

	.play-pause__icon :global(.play-pause__icon--loading) {
		margin-top: 0.25rem;
		stroke-width: 2.5;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
