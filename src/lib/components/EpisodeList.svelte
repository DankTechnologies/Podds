<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import type { Episode, ActiveEpisode } from '$lib/types/db';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { Log } from '$lib/service/LogService';
	import {
		Play,
		Dot,
		ArrowUp,
		Download,
		Check,
		Trash2,
		Gift,
		AudioLines,
		Frown,
		Antenna,
		LoaderPinwheel
	} from 'lucide-svelte';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { FeedService } from '$lib/service/FeedService.svelte';
	import { getActiveEpisodes, getFeeds, getSettings } from '$lib/stores/db.svelte';
	import { shareEpisode as shareEpisodeUtil } from '$lib/utils/share';
	import { page } from '$app/state';
	import { findPodcastByEpisode } from '$lib/api/itunes';
	import { goto } from '$app/navigation';
	import { SettingsService } from '$lib/service/SettingsService.svelte';

	let {
		episodes,
		activeEpisodes,
		feedIconsById,
		isPlaylist = false,
		isSearch = false,
		isShare = false,
		hideImages = false,
		onPlayNext = undefined
	}: {
		episodes: Episode[];
		activeEpisodes: ActiveEpisode[];
		feedIconsById?: Map<string, string | undefined>;
		isPlaylist?: boolean;
		isSearch?: boolean;
		isShare?: boolean;
		hideImages?: boolean;
		onPlayNext?: (episode: Episode) => void;
	} = $props();

	let downloadProgress = $state(new SvelteMap<string, number>());
	let loadingFeedId = $state<string | null>(null);
	let focusedEpisodeId = $state<string | null>(null);
	let isReordering = $state(false);
	let feedService = new FeedService();

	let playingEpisode = $derived(getActiveEpisodes().find((episode) => episode.isPlaying));

	const playerHeight = 4 * parseFloat(getComputedStyle(document.documentElement).fontSize); // 4rem

	let isPodcastPage = $derived(page.url.pathname.startsWith('/podcast'));

	let feeds = $derived(getFeeds());
	let settings = $derived(getSettings());

	function getActiveEpisode(episode: Episode): ActiveEpisode | undefined {
		return activeEpisodes.find((x) => x.id === episode.id);
	}

	function isFeedKnown(episode: Episode): boolean {
		return feeds.find((x) => x.id === episode.feedId) !== undefined;
	}

	function isFeedSubscribed(episode: Episode): boolean {
		return feeds.find((x) => x.id === episode.feedId && x.isSubscribed === 1) !== undefined;
	}

	async function playEpisode(episode: Episode) {
		toggleEpisodeFocus(episode);

		if (!isFeedKnown(episode)) {
			const feed = await findPodcastByEpisode(episode);
			if (feed) {
				await feedService.addFeed(feed);
			} else {
				Log.error(`Failed to add feed for episode ${episode.title}`);
			}
		}

		EpisodeService.setPlayingEpisode(episode);

		const activeEpisode = getActiveEpisode(episode);
		if (activeEpisode?.isDownloaded) {
			const playbackPosition = activeEpisode.isCompleted
				? 0
				: (activeEpisode.playbackPosition ?? 0);

			if (settings.goBackOnResumeSeconds) {
				AudioService.play(
					episode.url,
					Math.max(0, playbackPosition - settings.goBackOnResumeSeconds)
				);
			} else {
				AudioService.play(episode.url, playbackPosition);
			}
		} else {
			downloadProgress.set(episode.id, 0);
			downloadAudio(
				episode.url,
				() => {
					handleDownloadComplete(episode);
					AudioService.play(episode.url, 0);
				},
				(err) => handleDownloadError(episode, err),
				(progress) => downloadProgress.set(episode.id!, progress)
			);
		}
	}

	async function downloadEpisode(episode: Episode) {
		toggleEpisodeFocus(episode);

		if (!isFeedKnown(episode)) {
			const feed = await findPodcastByEpisode(episode);
			if (feed) {
				await feedService.addFeed(feed);
			} else {
				Log.error(`Failed to add feed for episode ${episode.title}`);
			}
		}

		if (!isPlaylist) {
			SettingsService.updatePlaylistView('upNext');
		}

		downloadProgress.set(episode.id, 0);
		downloadAudio(
			episode.url,
			() => handleDownloadComplete(episode),
			(err) => handleDownloadError(episode, err),
			(progress) => downloadProgress.set(episode.id!, progress === 100 ? 99 : progress) // avoid brief 100% flash
		);
	}

	function removeDownload(episode: Episode) {
		toggleEpisodeFocus(episode);

		if (getActiveEpisode(episode)?.isPlaying) {
			AudioService.stop();
			EpisodeService.clearPlayingEpisodes();
		}

		EpisodeService.clearDownloaded(episode);
	}

	function handleDownloadComplete(episode: Episode) {
		EpisodeService.markDownloaded(episode);
		downloadProgress.delete(episode.id);
	}

	function handleDownloadError(episode: Episode, err: Error | ErrorEvent) {
		downloadProgress.set(episode.id, -1);
		EpisodeService.clearDownloaded(episode);
		Log.error(`Download failed for episode ${episode.id}: ${err.message ?? err.toString()}`);
	}

	function toggleEpisodeFocus(episode: Episode) {
		if (isShare) return;

		focusedEpisodeId = focusedEpisodeId === episode.id ? null : episode.id;

		if (focusedEpisodeId) {
			// Wait for any collapse animations to complete
			setTimeout(() => {
				const card = document.querySelector(`.episode-card[data-episode-id="${episode.id}"]`);
				if (!card) return;

				const cardBottom = card.getBoundingClientRect().bottom;
				const detectPadding = playingEpisode ? playerHeight + 60 : 60;
				const scrollPadding = playingEpisode ? 40 : 120;

				if (cardBottom + detectPadding > window.innerHeight) {
					// Calculate the scroll position
					const targetScroll =
						window.scrollY +
						card.getBoundingClientRect().top -
						window.innerHeight / 2 +
						card.getBoundingClientRect().height / 2 -
						scrollPadding;

					const startScroll = window.scrollY;
					const distance = targetScroll - startScroll;
					const duration = 350;
					const startTime = performance.now();

					// Ease in for a more relaxed start
					function easeInCubic(t: number): number {
						return t * t * t;
					}

					function scroll() {
						const currentTime = performance.now();
						const elapsed = currentTime - startTime;
						const progress = Math.min(elapsed / duration, 1);

						window.scrollTo(0, startScroll + distance * easeInCubic(progress));

						if (progress < 1) {
							requestAnimationFrame(scroll);
						}
					}

					requestAnimationFrame(scroll);
				}
			}, 250); // Match the transition duration
		}
	}

	function handlePlayNext(episode: Episode) {
		isReordering = true;

		toggleEpisodeFocus(episode);
		if (onPlayNext) {
			onPlayNext(episode);
		}

		isReordering = false;
	}

	function getEpisodeDurationDisplay(episode: Episode): string {
		const activeEpisode = getActiveEpisode(episode);

		return !activeEpisode ||
			activeEpisode.isCompleted ||
			(activeEpisode.playbackPosition === 0 && !activeEpisode.isPlaying)
			? formatEpisodeDuration(episode.durationMin)
			: `${formatEpisodeDuration(activeEpisode.minutesLeft)} left`;
	}

	function shareEpisode(episode: Episode) {
		const feed = feeds.find((f) => f.id === episode.feedId);
		if (!feed) {
			Log.error('Feed not found for episode, skipping share link');
			return;
		}

		shareEpisodeUtil(episode, feed);
	}

	async function handleFeedClick(e: Event, episode: Episode) {
		e.preventDefault();
		e.stopPropagation();

		if (isFeedKnown(episode)) {
			goto(`/podcast/${episode.feedId}`);
		} else {
			loadingFeedId = episode.feedId;
			const feed = await findPodcastByEpisode(episode);

			if (feed) {
				feed.isSubscribed = 0;
				await feedService.addFeed(feed);
				loadingFeedId = null;
				goto(`/podcast/${feed.id}`);
			}
		}
	}
</script>

<ul class="episode-list" role="list">
	{#each episodes as episode, index (episode.id)}
		<li
			class="episode-card"
			class:episode-card--playing={getActiveEpisode(episode)?.isPlaying}
			class:episode-card--focused={focusedEpisodeId === episode.id}
			class:episode-card--known-feed={isSearch && isFeedKnown(episode)}
			class:is-podcast-page={isPodcastPage}
			data-episode-id={episode.id}
		>
			{#if getActiveEpisode(episode)?.isPlaying}
				<AudioLines strokeWidth="2" class="background-play" />
			{/if}
			{#if loadingFeedId === episode.feedId}
				<LoaderPinwheel class="feed-card__loading" />
			{/if}

			<button
				class="episode-card__wrapper"
				type="button"
				onclick={() => toggleEpisodeFocus(episode)}
			>
				<div class="episode-card__content">
					{#if !hideImages}
						{#if feedIconsById}
							{#if feedIconsById.has(episode.feedId)}
								<img
									src={feedIconsById.get(episode.feedId)}
									loading="lazy"
									alt={episode.title}
									class="episode-card__image"
								/>
							{:else}
								<div class="episode-card__image">
									<div class="fallback">
										<span>{episode.title[0]?.toUpperCase() || '?'}</span>
									</div>
								</div>
							{/if}
						{:else}
							<img
								src={`/icon/${episode.feedId}.png`}
								alt={episode.title}
								class="episode-card__image"
							/>
						{/if}
					{/if}
					<div class="episode-card__heading">
						<time class="episode-card__time">
							{#if getActiveEpisode(episode)?.isCompleted}
								<div>
									<Check size="14" />
								</div>
							{:else if downloadProgress.has(episode.id) && downloadProgress.get(episode.id) !== -1}
								<div class="download-progress">
									{Math.round(downloadProgress.get(episode.id) ?? 0)}%
								</div>
							{:else if downloadProgress.has(episode.id) && downloadProgress.get(episode.id) === -1}
								<div class="download-progress error">
									<Frown size="14" />
								</div>
							{:else if (getActiveEpisode(episode)?.playbackPosition ?? 0) > 0 || getActiveEpisode(episode)?.isPlaying}
								<div>
									<Play size="14" />
								</div>
							{:else if isSearch && isFeedSubscribed(episode)}
								<div>
									<Antenna size="14" />
								</div>
							{/if}
							{#if getActiveEpisode(episode)?.isDownloaded}
								<div>
									<Download size="14" />
								</div>
							{/if}
							<div>
								{formatEpisodeDate(episode.publishedAt)}
							</div>
							{#if episode.durationMin > 0}
								<div>
									<Dot size="14" />
								</div>
								<div>
									{getEpisodeDurationDisplay(episode)}
								</div>
							{/if}
						</time>
						<div class="episode-card__title">
							{#if isSearch && episode.title.startsWith('[')}
								{@const feedTitle = episode.title.match(/^\[(.+?)\]/)?.[1]}
								{@const episodeTitle = episode.title.replace(/^\[.+?\]\s/, '')}
								<div class="episode-title">
									<a href="/" onclick={(e) => handleFeedClick(e, episode)}>
										{feedTitle}
									</a>
									<div>
										{episodeTitle}
									</div>
								</div>
							{:else}
								{episode.title}
							{/if}
						</div>
						{#if isShare}
							<div class="episode-card__description">{@html episode.content}</div>
						{/if}
					</div>
				</div>
			</button>

			<div
				class="episode-controls"
				class:episode-controls--visible={focusedEpisodeId === episode.id}
				class:episode-controls--playing={getActiveEpisode(episode)?.isPlaying}
				class:episode-controls--no-transition={isReordering}
			>
				<div
					class="episode-controls__description-wrapper"
					class:episode-controls__description-wrapper--no-image={!feedIconsById}
				>
					<div class="episode-controls__description">{@html episode.content}</div>
				</div>
				<div class="episode-controls__buttons">
					{#if !getActiveEpisode(episode)?.isPlaying}
						<button class="episode-controls__button action" onclick={() => playEpisode(episode)}>
							<Play size="16" /> Play
						</button>
					{/if}
					{#if !getActiveEpisode(episode)?.isDownloaded}
						<button class="episode-controls__button" onclick={() => downloadEpisode(episode)}>
							<Download size="16" /> Later
						</button>
					{/if}
					{#if isPlaylist && (index > 0 || (getActiveEpisode(episode)?.playbackPosition ?? 0) > 0)}
						<button class="episode-controls__button" onclick={() => handlePlayNext(episode)}>
							<ArrowUp size="16" /> Next
						</button>
					{/if}
					{#if !isShare && !isSearch}
						<button class="episode-controls__button" onclick={() => shareEpisode(episode)}>
							<Gift size="16" /> Share
						</button>
					{/if}
					{#if getActiveEpisode(episode)?.isDownloaded}
						<button
							class="episode-controls__button episode-controls__button--delete"
							onclick={() => removeDownload(episode)}
						>
							<Trash2 size="16" />
						</button>
					{/if}
				</div>
			</div>
		</li>
	{/each}
</ul>

<style>
	.episode-list {
		display: flex;
		flex-direction: column;
		padding-bottom: 10rem;
	}

	.episode-card {
		transition: background 250ms cubic-bezier(0, 0, 0.2, 1);
		position: relative;
		border-bottom: 1px solid var(--primary);
	}

	.episode-card--focused {
		border-bottom: 0.4rem solid light-dark(var(--primary), var(--primary-more));
		transition: border-bottom 250ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.episode-card--focused.episode-card--known-feed {
		border-bottom: 0.4rem solid var(--success);
	}

	.episode-card--playing {
		background: var(--bg-less);
	}

	.episode-card--playing :global(.background-play) {
		position: absolute;
		right: 0;
		top: 0;
		width: 7rem;
		height: 7rem;
		pointer-events: none;
		color: var(--primary);
		animation: shimmer 5s ease-in-out infinite;
	}

	.episode-card--playing.is-podcast-page :global(.background-play) {
		width: 6.5rem;
		height: 6.5rem;
	}

	@keyframes shimmer {
		0% {
			opacity: 0.08;
		}
		50% {
			opacity: 0.15;
			filter: brightness(1.3);
			transform: scale(0.92);
		}
		100% {
			opacity: 0.08;
		}
	}

	:global(.feed-card__loading) {
		position: absolute;
		right: 0.5rem;
		top: 1rem;
		width: 7rem;
		height: 7rem;
		pointer-events: none;
		color: var(--bg-less);
		opacity: 0.5;
		animation: spin 1.25s linear infinite;
		z-index: 1;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.episode-card--focused:not(.episode-card--playing):not(.episode-card--playing-no-image) {
		background: var(--bg-less);
	}

	.episode-card__wrapper {
		width: 100%;
		background: none;
		border: none;
		padding: 1.5rem;
		text-align: left;
		color: var(--text);
		transition: background-color 300ms cubic-bezier(0, 0, 0.2, 1);
	}

	.episode-card__content {
		display: flex;
	}

	/* less padding needed when using image */
	.episode-card__wrapper:has(.episode-card__image) {
		padding: 1rem;
	}

	.episode-card__image {
		width: 5rem;
		height: 5rem;
		margin-right: 1rem;
		aspect-ratio: 1;
		border-radius: 0.25rem;
		object-fit: cover;
		background: var(--bg-less);
	}

	.episode-card__image .fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		color: var(--text-less);
	}

	.episode-card__heading {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 0.25rem;
	}

	.episode-card__title {
		font-weight: 600;
		margin-right: 2rem;
		line-height: var(--line-height-normal);
		font-size: var(--text-medium);
		text-wrap-style: pretty;
	}

	.episode-card__description,
	.episode-controls__description {
		color: var(--text-less);
		font-size: var(--text-smaller);
		line-height: var(--line-height-slack);
		text-wrap-style: pretty;
		overflow: hidden;
		border-left: 0.5rem solid light-dark(var(--primary), var(--primary-more));
		padding: 0 1rem;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 6;
		line-clamp: 6;
		-webkit-box-orient: vertical;
		word-break: break-word;

		:global(p) {
			margin: 0;
		}
	}

	.episode-card--known-feed .episode-card__description,
	.episode-card--known-feed .episode-controls__description {
		border-left-color: var(--success);
	}

	.episode-card__description {
		margin: 0.5rem 0;
	}

	.episode-controls__description {
		margin: 0;
	}

	.episode-card__time {
		font-size: var(--text-small);
		font-family: monospace;
		color: var(--primary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-bottom: 0.1rem;
	}

	@media (prefers-color-scheme: dark) {
		.episode-card__time {
			font-weight: bold;
		}
	}

	.episode-card--focused .episode-card__time {
		color: var(--primary-more);
	}

	.episode-card--focused.episode-card--known-feed .episode-card__time {
		color: var(--success);
	}

	.download-progress {
		font-size: var(--text-small);
		min-width: 3ch;
		padding-right: 0.5rem;
	}

	.download-progress.error {
		color: var(--error);
		min-width: 2.5ch;
		padding-right: 0;
	}

	.episode-controls {
		transform: scaleY(0);
		transform-origin: top;
		opacity: 0;
		overflow: hidden;
		height: 0;
	}

	.episode-controls--visible {
		transform: scaleY(1);
		opacity: 1;
		height: auto;
		transition:
			transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
			opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.episode-controls__description-wrapper {
		padding: 1rem;
	}

	.episode-controls__description-wrapper--no-image {
		padding-left: 1.5rem;
	}

	.episode-controls__buttons {
		display: flex;
		padding: 1rem;
		gap: 1rem;
	}

	.episode-controls__button {
		display: flex;
		font-size: var(--text-small);
		font-weight: 600;
		align-items: center;
		gap: 0.5rem;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 0.25rem;
		background: var(--bg);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
	}

	.episode-controls__button--delete {
		margin-left: auto;
		color: var(--error);
		opacity: 0.7;
	}

	.episode-controls--no-transition {
		transition: none !important;
	}

	.episode-title {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;

		a {
			width: fit-content;
		}
	}
</style>
