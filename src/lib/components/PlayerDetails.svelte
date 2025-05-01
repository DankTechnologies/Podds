<script lang="ts">
	import {
		RotateCcw,
		RotateCw,
		Play,
		Pause,
		Loader2,
		AudioWaveform,
		Calendar,
		Clock,
		Antenna
	} from 'lucide-svelte';
	import {
		formatEpisodeDate,
		formatEpisodeDuration,
		formatPlaybackPosition
	} from '$lib/utils/time';
	import { BottomSheet } from 'svelte-bottom-sheet';
	import type { ActiveEpisode } from '$lib/types/db';

	let {
		episode,
		onBack,
		onPlayPause,
		onForward,
		onSeek,
		onFeedClick,
		currentTime,
		duration,
		remainingTime,
		paused,
		onClose,
		isOpen
	} = $props<{
		episode: ActiveEpisode;
		onBack: (e: Event) => void;
		onPlayPause: (e: Event) => void;
		onForward: (e: Event) => void;
		onSeek: (e: Event) => void;
		onFeedClick: (e: Event) => void;
		currentTime: number;
		duration: number;
		remainingTime: number;
		paused: boolean;
		onClose: () => void;
		isOpen: boolean;
	}>();
</script>

<div class="bottom-sheet">
	<BottomSheet settings={{ maxHeight: 0.8 }} bind:isSheetOpen={isOpen} onclose={onClose}>
		<BottomSheet.Overlay>
			<BottomSheet.Sheet>
				<BottomSheet.Handle />
				<BottomSheet.Content>
					<div class="content">
						<div class="header">
							<div class="episode-title">
								<div class="episode-title-feed">
									<a href="/" onclick={onFeedClick}>
										{episode.feedTitle}
									</a>
								</div>
								<div class="episode-title-separator">
									<Antenna size="14" />
								</div>
								<div>
									{episode.title}
								</div>
							</div>
							<div class="episode-details">
								<div class="episode-details-date">
									<Calendar size="14" />
									{formatEpisodeDate(episode.publishedAt)}
								</div>
								{#if episode.durationMin > 0}
									<div class="episode-details-duration">
										<Clock size="14" />
										{formatEpisodeDuration(episode.durationMin)}
									</div>
								{/if}
								<div class="episode-details-separator"></div>
							</div>
						</div>
						<div class="description">
							{@html episode.content}
						</div>
						<div class="controls">
							<div class="buttons">
								<button class="button" onclick={onBack}>
									<div class="stack-cell">
										<div>
											<RotateCcw size="2.5rem" />
										</div>
										<div class="time-text">10</div>
									</div>
								</button>

								<button class="button play-pause" onclick={onPlayPause}>
									<div class="stack-cell">
										<div class="play-pause__circle"></div>
										<div class="play-pause__icon">
											{#if !episode.isDownloaded}
												<Loader2 class="play-pause__icon--loading" size="3rem" />
											{:else if paused}
												<Play class="play-pause__icon--play" size="3rem" />
											{:else}
												<Pause class="play-pause__icon--pause" size="3rem" />
											{/if}
										</div>
									</div>
								</button>

								<button class="button" onclick={onForward}>
									<div class="stack-cell">
										<div>
											<RotateCw size="2.5rem" />
										</div>
										<div class="time-text">30</div>
									</div>
								</button>
							</div>
							<div class="progress-container">
								<div class="time">
									<div>
										{formatPlaybackPosition(currentTime)}
									</div>
									<div>
										-{formatPlaybackPosition(remainingTime)}
									</div>
								</div>
								<input
									class="progress-bar"
									type="range"
									min="0"
									bind:value={currentTime}
									max={duration}
									onchange={onSeek}
									onclick={(e) => e.stopPropagation()}
									onmousedown={(e) => e.stopPropagation()}
									onmousemove={(e) => e.stopPropagation()}
									onmouseup={(e) => e.stopPropagation()}
									ontouchstart={(e) => e.stopPropagation()}
									ontouchmove={(e) => e.stopPropagation()}
									ontouchend={(e) => e.stopPropagation()}
								/>
							</div>
							<div class="bottom-nav-spacer"></div>
						</div>
					</div>
				</BottomSheet.Content>
			</BottomSheet.Sheet>
		</BottomSheet.Overlay>
	</BottomSheet>
</div>

<style>
	@media (prefers-color-scheme: dark) {
		.bottom-sheet :global(.bottom-sheet) {
			background-color: var(--bg-less);
		}
	}

	.bottom-sheet :global(.handle-container) {
		background-color: light-dark(var(--primary), var(--primary-more));
	}

	.bottom-sheet :global(.bottom-sheet-handle) {
		background-color: light-dark(var(--grey-100), var(--primary-grey-light));
	}

	.bottom-sheet :global(.bottom-sheet) {
		overflow-y: hidden;
	}

	.bottom-sheet :global(.bottom-sheet-content) {
		height: 100%;
		padding: 0;
	}

	.content {
		display: grid;
		gap: 2rem;
		padding: 1.5rem 1rem 0 1rem;
		height: 100%;
		box-sizing: border-box;
		grid-template-rows: auto 1fr auto auto;
	}

	.episode-title {
		font-weight: bold;
		font-size: var(--text-medium);
		line-height: var(--line-height-slack);
	}

	.episode-title > div {
		display: inline;
	}

	.episode-title-separator {
		padding: 0 0.25rem;
	}

	.episode-details {
		font-family: monospace;
		color: light-dark(var(--primary), var(--primary-more));
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1.25rem;
	}

	.episode-details > div {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.episode-details-separator {
		border-right: 0.4rem solid light-dark(var(--primary), var(--primary-more));
		height: 2rem;
	}

	.description {
		font-size: var(--text-smaller);
		line-height: var(--line-height-slack);
		overflow-y: auto;
		min-height: 0;
		padding: 0 1rem;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		word-break: break-word;

		:global(p) {
			margin: 0;
		}
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		justify-content: space-between;
	}

	.progress-container {
		display: flex;
		flex-direction: column;
	}

	.time {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-small);
		font-family: monospace;
	}

	.progress-bar {
		appearance: none;
		border: none;
		margin-top: 0.75rem;

		&::-webkit-slider-runnable-track {
			height: 1rem;
			background: var(--primary);
			border: none;
			border-radius: 0.25rem;
		}

		&::-moz-range-track {
			height: 1rem;
			background: var(--primary);
			border: none;
		}

		&::-webkit-slider-thumb {
			appearance: none;
			width: 1.5rem;
			height: 2.5rem;
			background-color: var(--primary-more);
			border: 3px solid var(--primary-less);
			margin-top: -0.75rem;
			border-radius: 0.25rem;
			background: light-dark(var(--grey-100), var(--primary-grey-light));
		}

		&::-moz-range-thumb {
			width: 1.25rem;
			height: 1.25rem;
			background-color: var(--primary-more);
			border: none;
			background: light-dark(var(--grey-100), var(--primary-grey-light));
		}
	}

	.buttons {
		display: flex;
		justify-content: space-between;
		padding: 0 8vw;
		align-items: center;
	}

	.button {
		border: none;
		background: none;
		color: light-dark(var(--primary-grey-dark), var(--primary-black));
		border-radius: 5rem;
		transition:
			box-shadow 0.05s,
			transform 0.05s;
	}

	.button:active {
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
		font-size: 1rem;
		place-self: center;
	}

	.play-pause__circle {
		width: 4rem;
		height: 4rem;
		background-color: var(--primary);
		border-radius: 50%;
	}

	.play-pause__icon {
		color: light-dark(var(--grey-100), var(--primary-grey-light));
		place-self: center;
	}

	.play-pause__icon :global(.play-pause__icon--play) {
		margin-top: 0.35rem;
		margin-left: 0.35rem;
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

	.bottom-nav-spacer {
		height: 5.25rem;
	}
</style>
