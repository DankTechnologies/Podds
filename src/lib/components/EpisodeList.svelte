<script lang="ts">
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import type { Episode, ActiveEpisode } from '$lib/types/db';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { Log } from '$lib/service/LogService';
	import { Play, Dot, ArrowUp, Download, Check, Plus, Trash2, Share2 } from 'lucide-svelte';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { FeedService } from '$lib/service/FeedService';
	import { getFeeds, getSettings } from '$lib/stores/db.svelte';
	import { encodeShareLink } from '$lib/utils/shareLink';

	let {
		episodes,
		activeEpisodes,
		feedIconsById,
		isPlaylist = false,
		isSearch = false,
		isShare = false
	}: {
		episodes: Episode[];
		activeEpisodes: ActiveEpisode[];
		feedIconsById?: Map<string, string>;
		isPlaylist?: boolean;
		isSearch?: boolean;
		isShare?: boolean;
	} = $props();

	let downloadProgress = $state(new SvelteMap<string, number>());
	let focusedEpisodeId = $state<string | null>(null);
	let isReordering = $state(false);
	let feedService = new FeedService();

	let feeds = $derived(getFeeds());

	function getActiveEpisode(episode: Episode): ActiveEpisode | undefined {
		return activeEpisodes.find((x) => x.id === episode.id);
	}

	function playEpisode(episode: Episode) {
		toggleEpisodeFocus(episode);

		if (!feeds.find((x) => x.id === episode.feedId)) {
			feedService.addFeedById(episode.feedId, feedIconsById?.get(episode.feedId) ?? '');
		}

		EpisodeService.setPlayingEpisode(episode);

		const activeEpisode = getActiveEpisode(episode);
		if (activeEpisode?.isDownloaded) {
			const playbackPosition = activeEpisode.isCompleted
				? 0
				: (activeEpisode.playbackPosition ?? 0);

			AudioService.play(episode.url, playbackPosition);
		} else {
			downloadProgress.set(episode.id, 0);
			downloadAudio(
				episode.url,
				() => {
					handleDownloadComplete(episode);
					AudioService.play(episode.url, 0);
				},
				(err) => handleDownloadError(episode.id!, err),
				(progress) => downloadProgress.set(episode.id!, progress)
			);
		}
	}

	function downloadEpisode(episode: Episode) {
		toggleEpisodeFocus(episode);

		if (!feeds.find((x) => x.id === episode.feedId)) {
			feedService.addFeedById(episode.feedId, feedIconsById?.get(episode.feedId) ?? '');
		}

		downloadProgress.set(episode.id, 0);
		downloadAudio(
			episode.url,
			() => handleDownloadComplete(episode),
			(err) => handleDownloadError(episode.id!, err),
			(progress) => downloadProgress.set(episode.id!, progress)
		);
	}

	function removeEpisode(episode: Episode) {
		toggleEpisodeFocus(episode);

		if (getActiveEpisode(episode)?.isPlaying) {
			AudioService.stop();
			EpisodeService.clearPlayingEpisodes();
		}

		EpisodeService.removeActiveEpisode(episode.id, episode.url);
	}

	function addFeed(feedId: string) {
		if (feeds.find((x) => x.id === feedId)) {
			return;
		}

		feedService.addFeedById(feedId, feedIconsById?.get(feedId) ?? '');
	}

	function handleDownloadComplete(episode: Episode) {
		EpisodeService.markDownloaded(episode);
		downloadProgress.delete(episode.id);
	}

	function handleDownloadError(episodeId: string, err: Error | ErrorEvent) {
		EpisodeService.clearDownloaded(episodeId);
		Log.error(`Download failed for episode ${episodeId}: ${err.message ?? err.toString()}`);
	}

	function toggleEpisodeFocus(episode: Episode) {
		if (isShare) return;

		focusedEpisodeId = focusedEpisodeId === episode.id ? null : episode.id;

		if (focusedEpisodeId) {
			// Wait for next tick to allow the controls to expand
			setTimeout(() => {
				const card = document.querySelector(`.episode-card[data-episode-id="${episode.id}"]`);
				if (card) {
					const cardBottom = card.getBoundingClientRect().bottom;
					if (cardBottom + 350 > window.innerHeight) {
						card.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			}, 0);
		}
	}

	function handlePlayNext(episode: Episode) {
		isReordering = true;
		const episodeIds = episodes.map((e) => e.id);

		const targetIndex = episodeIds.indexOf(episode.id);
		episodeIds.splice(targetIndex, 1);
		episodeIds.splice(0, 0, episode.id);

		toggleEpisodeFocus(episode);
		EpisodeService.reorderEpisodes(episodeIds);

		// Reset after a short delay to allow the reorder to complete
		setTimeout(() => {
			isReordering = false;
		}, 50);
	}

	function getEpisodeDurationDisplay(episode: Episode): string {
		const activeEpisode = getActiveEpisode(episode);

		return !activeEpisode || activeEpisode.isCompleted || activeEpisode.playbackPosition === 0
			? formatEpisodeDuration(episode.durationMin)
			: `${formatEpisodeDuration(activeEpisode.minutesLeft)} left`;
	}

	function shareEpisode(episode: Episode) {
		const settings = getSettings();
		if (!settings) {
			Log.error('Settings not found, skipping share link');
			return;
		}

		const url = encodeShareLink({
			podcastIndexKey: settings.podcastIndexKey,
			podcastIndexSecret: settings.podcastIndexSecret,
			corsHelperUrl: import.meta.env.VITE_CORS_HELPER_URL,
			feedId: episode.feedId,
			episodeGuid: episode.id
		});

		navigator.clipboard.writeText(url);
		alert('Share link copied to clipboard!');
	}
</script>

<ul class="episode-list" role="list">
	{#each episodes as episode, index (episode.id)}
		<li
			class="episode-card fade-in"
			class:episode-card--playing={getActiveEpisode(episode)?.isPlaying}
			class:episode-card--focused={focusedEpisodeId === episode.id}
			data-episode-id={episode.id}
		>
			<button
				class="episode-card__wrapper"
				type="button"
				style:anchor-name={`--episode-${episode.id}`}
				onclick={() => toggleEpisodeFocus(episode)}
			>
				<div class="episode-card__content">
					{#if feedIconsById}
						{#if feedIconsById.has(episode.feedId)}
							<img
								src={feedIconsById.get(episode.feedId)}
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
					{/if}
					<div class="episode-card__heading">
						<time class="episode-card__time">
							{#if getActiveEpisode(episode)?.isCompleted}
								<div>
									<Check size="14" />
								</div>
							{/if}
							{#if getActiveEpisode(episode)?.isDownloaded}
								<div>
									<Download size="14" />
								</div>
							{:else if downloadProgress.has(episode.id)}
								<div class="download-progress">
									{Math.round(downloadProgress.get(episode.id) ?? 0)}%
								</div>
							{/if}
							<div>
								{formatEpisodeDate(episode.publishedAt)}
							</div>
							<div>
								<Dot size="14" />
							</div>
							<div>
								{getEpisodeDurationDisplay(episode)}
							</div>
						</time>
						<div class="episode-card__title">{episode.title}</div>
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
						<button class="episode-controls__button" onclick={() => playEpisode(episode)}>
							<Play size="16" /> Play
						</button>
					{/if}
					{#if !getActiveEpisode(episode)?.isDownloaded}
						<button class="episode-controls__button" onclick={() => downloadEpisode(episode)}>
							<Download size="16" /> Later
						</button>
					{/if}
					{#if isPlaylist && index > 0}
						<button class="episode-controls__button" onclick={() => handlePlayNext(episode)}>
							<ArrowUp size="16" /> Next
						</button>
					{/if}
					{#if getActiveEpisode(episode)?.isDownloaded}
						<button class="episode-controls__button" onclick={() => removeEpisode(episode)}>
							<Trash2 size="16" /> Remove
						</button>
					{/if}
					{#if isSearch && !feeds.find((x) => x.id === episode.feedId)}
						<button class="episode-controls__button" onclick={() => addFeed(episode.feedId)}>
							<Plus size="16" /> Add Feed
						</button>
					{/if}
					{#if !isShare}
						<button class="episode-controls__button" onclick={() => shareEpisode(episode)}>
							<Share2 size="16" /> Share
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
		transition: background 150ms ease-out;
	}

	.episode-card--playing {
		background: radial-gradient(
			ellipse at bottom left,
			var(--bg-less) 0%,
			var(--bg-less) 70%,
			var(--primary) 100%
		);
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
		border-bottom: 1px solid var(--primary-less);
	}

	.episode-card--focused .episode-card__wrapper {
		border-bottom: none;
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
	}

	.episode-card__description {
		color: var(--text-less);
		font-size: var(--text-smaller);
		line-height: var(--line-height-slack);
		overflow: hidden;
		border-left: 0.5rem solid var(--primary-less);
		padding: 0 1rem;
		margin: 0.5rem 0;
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

	.episode-card__time {
		font-size: var(--text-small);
		font-family: monospace;
		color: var(--primary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-bottom: 0.1rem;
	}

	.download-progress {
		color: var(--primary);
		font-size: var(--text-small);
		min-width: 3ch;
		padding-right: 0.5rem;
	}

	.episode-controls {
		max-height: 0;
		opacity: 0;
		overflow: hidden;
		transition: all 150ms ease-in-out;
		background: var(--bg-less);
		border-bottom: 1px solid var(--primary-less);
	}

	.episode-controls--visible {
		max-height: 600px;
		opacity: 1;
	}

	.episode-controls__description-wrapper {
		padding: 0 1rem 2rem 1rem;
	}

	.episode-controls__description-wrapper--no-image {
		padding-left: 1.5rem;
	}

	.episode-controls__description {
		font-size: var(--text-small);
		line-height: var(--line-height-normal);
		overflow: hidden;
		border-left: 0.5rem solid var(--primary-less);
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

	.episode-controls__buttons {
		display: flex;
		gap: 2rem;
		margin-top: -1px;
		background: var(--bg-less);
		width: fit-content;
		padding: 0 2rem 2rem 2rem;
	}

	.episode-controls__button {
		display: flex;
		font-size: var(--text-small);
		font-weight: 600;
		align-items: center;
		background: var(--primary-less);
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		color: var(--neutral);
		cursor: pointer;
		border-radius: 0.25rem;
	}

	.episode-controls--no-transition {
		transition: none !important;
	}

	.fade-in {
		animation: fadeIn 0.2s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
