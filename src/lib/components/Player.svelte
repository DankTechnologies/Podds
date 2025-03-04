<script lang="ts">
	import { RotateCcw, RotateCw, Play, Pause, X, Loader2 } from 'lucide-svelte';
	import { formatPlaybackPosition } from '$lib/utils/time';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { circIn, circOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import type { ActiveEpisode } from '$lib/types/db';

	const ICON_SIZE = '2rem';

	let { episode }: { episode: ActiveEpisode } = $props();

	let currentTime = $state(0);
	let duration = $state(0);
	let paused = $state(true);
	let showDetailedControls = $state(false);
	let previousEpisodeId = $state('');

	onMount(() => {
		AudioService.loadPaused(episode.url, episode.playbackPosition ?? 0);
	});

	$effect(() => {
		if (episode.id !== previousEpisodeId) {
			previousEpisodeId = episode.id;
			showDetailedControls = false;
		}
	});

	$effect(() => {
		const updateTime = () => {
			currentTime = AudioService.getCurrentTime();
		};

		AudioService.addEventListener('timeupdate', updateTime);

		return () => {
			AudioService.removeEventListener('timeupdate', updateTime);
		};
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
		};

		AudioService.addEventListener('ended', handleEnded);

		return () => {
			AudioService.removeEventListener('ended', handleEnded);
		};
	});

	function handleBack(e: Event) {
		e.stopPropagation();
		if (!episode.isDownloaded) return;
		const newTime = Math.max(0, Math.min(duration, currentTime - 10));
		AudioService.seek(newTime);
		EpisodeService.updatePlaybackPosition(episode.id, newTime);
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
		EpisodeService.updatePlaybackPosition(episode.id, newTime);
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

	function slideIn(node: Element) {
		return slide(node, {
			duration: 200,
			easing: circIn,
			axis: 'y'
		});
	}

	function fadeOut(node: Element) {
		return fade(node, {
			duration: 200,
			easing: circOut
		});
	}

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		const newTime = Number(target.value);

		AudioService.seek(newTime);
		EpisodeService.updatePlaybackPosition(episode.id, newTime);
	}
</script>

<div
	class="player"
	class:player-expanded={showDetailedControls}
	onclick={() => (showDetailedControls = !showDetailedControls)}
	onkeydown={(e) => e.key === 'Enter' && (showDetailedControls = !showDetailedControls)}
	role="button"
	tabindex="0"
>
	{#if showDetailedControls}
		<div class="player__episode-title" in:slideIn out:fadeOut>
			{episode.title}
		</div>
		<div class="player__episode-feed-title" in:slideIn out:fadeOut>
			<a href="/" onclick={handleFeedClick}>
				{episode.feedTitle}
			</a>
		</div>
		<div class="player__time" in:slideIn out:fadeOut>
			<div>
				{formatPlaybackPosition(currentTime)}
			</div>
			<div>
				-{formatPlaybackPosition(duration - currentTime)}
			</div>
		</div>
		<input
			class="player__playback-expanded"
			in:slideIn
			out:fadeOut
			type="range"
			min="0"
			bind:value={currentTime}
			max={duration}
			onchange={handleSeek}
			onclick={(e) => e.stopPropagation()}
		/>
	{:else}
		<input
			class="player__playback"
			in:slideIn
			out:fadeOut
			type="range"
			min="0"
			bind:value={currentTime}
			max={duration}
			style="--value: {currentTime}; --max: {duration}"
			disabled
		/>
	{/if}
	<div class="player__controls">
		<div class="player__artwork">
			<img src={`data:${episode.feedIconData}`} alt="" />
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

<style>
	.player {
		display: flex;
		container-type: inline-size;
		flex-direction: column;
		position: fixed;
		bottom: 4rem;
		left: 0;
		right: 0;
		z-index: 50;
		background: linear-gradient(to bottom, var(--bg-less) 0%, var(--bg) 60%, var(--bg) 100%);
	}

	.player.player-expanded {
		background: linear-gradient(to bottom, var(--bg-less) 0%, var(--bg) 60%, var(--bg) 100%);
		border-radius: 1rem;
	}

	.player__episode-title {
		text-align: center;
		font-weight: bold;
		padding: 1rem;
		font-size: var(--text-xl);
	}

	.player__episode-feed-title {
		text-align: center;
		font-weight: bold;
		/* font-size: var(--text-small); */
		padding: 1rem;
	}

	.player__time {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-small);
		padding: 0 1rem;
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

	.player__playback-expanded {
		display: flex;
		flex: 1;
		appearance: none;
		border: none;
		margin: 1rem;
	}

	.player__playback-expanded::-webkit-slider-runnable-track {
		height: 1rem;
		background: var(--primary);
		border: none;
	}

	.player__playback-expanded::-moz-range-track {
		height: 1rem;
		background: var(--primary);
		border: none;
	}

	.player__playback-expanded::-webkit-slider-thumb {
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

	.player__playback-expanded::-moz-range-thumb {
		width: 1.25rem;
		height: 1.25rem;
		background-color: var(--primary-more);
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
