<script lang="ts">
	import { RotateCcw, RotateCw, Play, Pause, Loader2, Antenna, X, Gauge } from 'lucide-svelte';
	import { formatPlaybackPosition } from '$lib/utils/time';
	import { BottomSheet } from 'svelte-bottom-sheet';
	import type { ActiveEpisode, Chapter } from '$lib/types/db';
	import { isAppleDevice } from '$lib/utils/osCheck';

	let {
		episode,
		onBack,
		onPlayPause,
		onForward,
		onSeek,
		onFeedClick,
		onStop,
		currentTime,
		duration,
		remainingTime,
		paused,
		onClose,
		isOpen,
		currentChapter,
		onSpeedChange,
		playbackSpeed,
		skipForwardButtonSeconds,
		skipBackwardButtonSeconds
	} = $props<{
		episode: ActiveEpisode;
		onBack: (e: Event) => void;
		onPlayPause: (e: Event) => void;
		onForward: (e: Event) => void;
		onSeek: (e: Event) => void;
		onFeedClick: (e: Event) => void;
		onStop: (e: Event) => void;
		currentTime: number;
		duration: number;
		remainingTime: number;
		paused: boolean;
		onClose: () => void;
		isOpen: boolean;
		currentChapter: Chapter | null;
		onSpeedChange: (e: Event) => void;
		playbackSpeed: number;
		skipForwardButtonSeconds?: number;
		skipBackwardButtonSeconds?: number;
	}>();

	let previousChapterTitle = $state<string>('');

	$effect(() => {
		if (
			isOpen &&
			currentChapter &&
			(currentChapter.title !== previousChapterTitle || previousChapterTitle === '')
		) {
			previousChapterTitle = currentChapter.title;
			scrollToCurrentChapter();
		}
	});

	function scrollToCurrentChapter() {
		if (currentChapter) {
			const currentItem = document.querySelector('.chapter-item.current');
			if (currentItem) {
				currentItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			}
		}
	}

	function formatChapterTime(time: number): string {
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	function handleChapterClick(e: Event, chapter: Chapter) {
		e.preventDefault();
		onSeek({ target: { value: chapter.startTime } } as unknown as Event);
	}

	function handleStop(e: Event) {
		onClose();
		onStop(e);
	}
</script>

<div class="bottom-sheet" class:is-apple-device={isAppleDevice}>
	<BottomSheet settings={{ maxHeight: 0.85 }} bind:isSheetOpen={isOpen} onclose={onClose}>
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
						</div>
						{#if episode.chapters?.length}
							<div class="chapters">
								<ol class="chapters-list">
									{#each episode.chapters as chapter, i}
										<li
											class="chapter-item {currentChapter?.title === chapter.title
												? 'current'
												: ''}"
										>
											<button
												class="chapter-button"
												onclick={(e) => handleChapterClick(e, chapter)}
											>
												<span class="chapter-number">{i + 1}.</span>
												<span class="chapter-title">{chapter.title}</span>
												<span class="chapter-time">{formatChapterTime(chapter.startTime)}</span>
											</button>
										</li>
									{/each}
								</ol>
							</div>
						{:else}
							<div class="description">
								{@html episode.content}
							</div>
						{/if}
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
						<div class="controls">
							<div class="buttons">
								<button class="button playback-speed" onclick={onSpeedChange}>
									<div>
										<Gauge size="1.5rem" />
									</div>
									<div class="playback-speed-text">{playbackSpeed}x</div>
								</button>
								<button class="button" onclick={onBack}>
									<div class="stack-cell">
										<div>
											<RotateCcw size="2.5rem" />
										</div>
										<div class="time-text">{skipBackwardButtonSeconds ?? 10}</div>
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
										<div class="time-text">{skipForwardButtonSeconds ?? 30}</div>
									</div>
								</button>
								<button class="button stop" onclick={handleStop}>
									<X size="1.5rem" />
								</button>
							</div>
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
		padding: 1rem;
		max-height: calc(100% - 7rem);
		box-sizing: border-box;
		grid-template-rows: auto 1fr auto auto;
	}

	.is-apple-device .content {
		max-height: calc(100% - 8rem);
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

	.chapters {
		font-size: var(--text-smaller);
		overflow-y: scroll;
		min-height: 0;
		padding: 0 1.5rem;
	}

	.chapters-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.chapter-item {
		margin-bottom: 1rem;
	}

	.chapter-item.current {
		color: var(--primary);
	}

	.chapter-item.current .chapter-title,
	.chapter-item.current .chapter-time,
	.chapter-item.current .chapter-number {
		font-weight: bold;
	}

	.chapter-button {
		display: flex;
		align-items: baseline;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		width: 100%;
	}

	.chapter-number {
		text-align: right;
		padding-right: 0.5rem;
		min-width: 1.25rem;
	}

	.chapter-title {
		flex: 1;
		text-align: left;
	}

	.chapter-time {
		font-size: var(--text-small);
		font-family: monospace;
		text-align: right;
		padding-right: 0.5rem;
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
		padding: 0 1rem;
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
		-webkit-appearance: none;
		background: none;

		&::-webkit-slider-runnable-track {
			height: 1.5rem;
			background: var(--primary);
			border: none;
			border-radius: 0.25rem;
		}

		&::-moz-range-track {
			height: 1.5rem;
			background: var(--primary);
			border: none;
			border-radius: 0.25rem;
		}

		&::-webkit-slider-thumb {
			-webkit-appearance: none;
			appearance: none;
			width: 1.5rem;
			height: 1.5rem;
			background-color: var(--primary-more);
			border-radius: 0.25rem;
			background: light-dark(var(--grey-100), var(--primary-grey-light));
			position: relative;
			box-shadow: none;
			z-index: 1;
		}

		&::-moz-range-thumb {
			width: 1.5rem;
			height: 1.5rem;
			background-color: var(--primary-more);
			border-radius: 0.25rem;
			background: light-dark(var(--grey-100), var(--primary-grey-light));
			position: relative;
			z-index: 1;
		}

		@media (prefers-color-scheme: light) {
			&::-webkit-slider-runnable-track {
				height: 1.75rem;
			}

			&::-moz-range-track {
				height: 1.75rem;
			}

			&::-webkit-slider-thumb {
				margin-top: 2px;
				width: 1.5rem;
				height: 1.5rem;
			}

			&::-moz-range-thumb {
				width: 1.5rem;
				height: 1.5rem;
			}
		}
	}

	.buttons {
		display: flex;
		justify-content: space-between;
		padding: 1rem 0.5rem;
		margin: -1rem 0;
		border-radius: 1rem;
		align-items: center;
		background: light-dark(var(--grey-150), var(--bg-less));
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

	.playback-speed {
		width: 3rem;
		opacity: 0.8;
	}

	.playback-speed-text {
		font-size: var(--text-smaller);
		font-weight: bold;
		margin-top: -0.5rem;
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
</style>
