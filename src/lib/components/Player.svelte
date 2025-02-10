<script lang="ts">
	import { playService } from '$lib/service/PlayService.svelte';
	import { RotateCcw, RotateCw, Play, Pause, Menu } from 'lucide-svelte';
	import { Log } from '$lib/service/LogService';
	import type { Icon } from '$lib/types/db';
	import { db } from '$lib/stores/db.svelte';

	const ICON_SIZE = '2rem';
	let icons = $state.raw<Icon[]>([]);

	$effect(() => {
		const iconsCursor = db.icons.find({ id: playService?.episode?.podcast.id });
		icons = iconsCursor.fetch();

		return () => {
			iconsCursor.cleanup();
		};
	});

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
		Log.info('Opening playlist/menu');
	}
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
				Log.debug(`Attempting to set time to ${newTime} of ${playService.totalDuration}`);
				playService.setCurrentTime(newTime);
			}}
		/>

		<div class="player__controls">
			<div class="player__artwork">
				{#if icons}
					<img
						src={`data:${icons.find((x) => x.id === playService?.episode?.podcast?.id)?.data}`}
						alt=""
					/>
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
		bottom: 5.5rem;
		left: 0;
		right: 0;
		z-index: 50;
		opacity: 0.99;
		backdrop-filter: blur(1rem) saturate(50%);
		background: rgba(var(--neutral-rgb), 0.7);
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
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
