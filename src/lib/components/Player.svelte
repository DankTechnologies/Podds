<script lang="ts">
	import { RotateCcw, RotateCw, Play, Pause, X, Loader2 } from 'lucide-svelte';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { ActiveEpisode } from '$lib/types/db';
	import type { SvelteMap } from 'svelte/reactivity';
	import { page } from '$app/state';
	import PlayerDetails from './PlayerDetails.svelte';
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { getSettings } from '$lib/stores/db.svelte';
	import { isAppleDevice } from '$lib/utils/osCheck';

	const ICON_SIZE = '2rem';
	const PLAYBACK_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0];

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
	let settings = $derived(getSettings());

	let remainingTime = $derived(duration - currentTime);
	let currentChapter = $derived(() => {
		if (!episode.chapters?.length) return null;
		return (
			episode.chapters.findLast((chapter) => currentTime >= chapter.startTime) ??
			episode.chapters[0]
		);
	});

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
		const newTime = Math.max(
			0,
			Math.min(duration, currentTime - (settings.skipBackwardButtonSeconds ?? 10))
		);
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
		const newTime = Math.max(
			0,
			Math.min(duration, currentTime + (settings.skipForwardButtonSeconds ?? 30))
		);
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

	function handleSpeedChange(e: Event) {
		e.stopPropagation();

		const currentIndex = PLAYBACK_SPEEDS.indexOf(settings!.playbackSpeed);
		const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
		const newSpeed = PLAYBACK_SPEEDS[nextIndex];

		AudioService.setPlaybackSpeed(newSpeed);
		SettingsService.updatePlaybackSpeed(newSpeed);
	}
</script>

<div class="player" class:is-apple-device={isAppleDevice}>
	<svg class="player__pattern" xmlns="http://www.w3.org/2000/svg" viewBox="222 50 400 200"
		><defs
			><pattern id="a" width="70" height="8" patternUnits="userSpaceOnUse"
				><rect width="100%" height="100%" fill="var(--pattern-bg)" /><path
					fill="none"
					stroke="var(--pattern-stroke)"
					d="M-.02 22c8.373 0 11.938-4.695 16.32-9.662C20.785 7.258 25.728 2 35 2s14.215 5.258 18.7 10.338C58.082 17.305 61.647 22 70.02 22M-.02 14.002C8.353 14 11.918 9.306 16.3 4.339 20.785-.742 25.728-6 35-6S49.215-.742 53.7 4.339c4.382 4.967 7.947 9.661 16.32 9.664M70 6.004c-8.373-.001-11.918-4.698-16.3-9.665C49.215-8.742 44.272-14 35-14S20.785-8.742 16.3-3.661C11.918 1.306 8.353 6-.02 6.002"
				/></pattern
			></defs
		><rect width="800%" height="800%" fill="url(#a)" /></svg
	>
	<div class="player__controls">
		<div
			class="player__artwork"
			onclick={() => (showDetailedControls = !showDetailedControls)}
			onkeydown={(e) => e.key === 'Enter' && (showDetailedControls = !showDetailedControls)}
			role="button"
			tabindex="0"
		>
			<img src={`data:${feedIconsById.get(episode.feedId)}`} alt="" />
		</div>

		<button class="player__button" onclick={(e) => handleBack(e)}>
			<div class="stack-cell">
				<div>
					<RotateCcw size={ICON_SIZE} />
				</div>
				<div class="time-text">{settings.skipBackwardButtonSeconds ?? 10}</div>
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
				<div class="time-text">{settings.skipForwardButtonSeconds ?? 30}</div>
			</div>
		</button>

		<button class="player__button" onclick={(e) => handleStop(e)}>
			<X size={ICON_SIZE} />
		</button>
	</div>
	<input
		class="player__playback"
		type="range"
		min="0"
		bind:value={currentTime}
		max={duration}
		style="--value: {currentTime}; --max: {duration}"
		disabled
	/>
</div>

<PlayerDetails
	{episode}
	{currentTime}
	{duration}
	{remainingTime}
	{paused}
	currentChapter={currentChapter()}
	onBack={handleBack}
	onPlayPause={handlePlayPause}
	onForward={handleForward}
	onSeek={handleSeek}
	onFeedClick={handleFeedClick}
	onClose={() => (showDetailedControls = false)}
	onStop={handleStop}
	onSpeedChange={handleSpeedChange}
	playbackSpeed={settings!.playbackSpeed}
	isOpen={showDetailedControls}
	skipForwardButtonSeconds={settings.skipForwardButtonSeconds ?? 30}
	skipBackwardButtonSeconds={settings.skipBackwardButtonSeconds ?? 10}
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
		background: light-dark(var(--grey-200), var(--grey-800));
		--pattern-bg: light-dark(var(--grey-100), var(--grey-900));
		--pattern-stroke: light-dark(var(--primary-grey-light), var(--primary));
		view-transition-name: player;
	}

	.player__pattern {
		position: absolute;
		opacity: 0.15;
		pointer-events: none;
	}

	.is-apple-device {
		padding-bottom: 1rem;
	}

	.player:focus-visible {
		outline: none;
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
		padding: 1rem 1.5rem 1rem 0;
		height: 3.25rem;
		z-index: 1;
	}

	.player__artwork {
		width: 4rem;
		height: 4rem;
		border: 0.6rem solid light-dark(var(--grey-200), var(--grey-800));
		border-radius: 0.25rem;
	}

	.player__artwork img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: opacity 0.3s ease;
		border-radius: 0.25rem;
	}

	.player__button {
		border: none;
		background: none;
		border-radius: 5rem;
		color: light-dark(var(--primary-grey-dark), var(--primary-black));
		transition:
			box-shadow 0.2s,
			transform 0.2s;
	}

	.player__button:active {
		box-shadow: 0 0 1.5rem var(--bg-less);
		transform: scale(1.1);
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
		background-color: light-dark(var(--primary), var(--primary-more));
		border-radius: 50%;
	}

	.play-pause__icon {
		color: light-dark(var(--grey-100), var(--primary-grey-light));
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
