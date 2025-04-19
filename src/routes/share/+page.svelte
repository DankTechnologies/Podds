<script lang="ts">
	import { onMount } from 'svelte';
	import { PodcastIndexClient } from '$lib/api/podcast-index';
	import { resizeBase64Image } from '$lib/utils/resizeImage';
	import { FeedService } from '$lib/service/FeedService';
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { parseTitle } from '$lib/utils/feedParser';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import type { Episode, Feed } from '$lib/types/db';
	import { getActiveEpisodes, getFeeds } from '$lib/stores/db.svelte';
	import { goto } from '$app/navigation';
	import { List, Podcast, Play, Download, Dot } from 'lucide-svelte';
	import { decodeShareLink, type ShareConfig } from '$lib/utils/share';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { AudioService } from '$lib/service/AudioService.svelte';

	let isFeedAdded = $state(false);
	let config = $state<ShareConfig | null>(null);
	let error = $state<string | null>(null);
	let feed = $state.raw<Feed | null>(null);
	let episodes = $state<Episode[]>([]);
	let iconData = $state<string | null>(null);
	let feedService = new FeedService();
	let downloadProgress = $state<number>(0);
	let feeds = $derived(getFeeds());
	let activeEpisodes = $derived(getActiveEpisodes());

	let targetEpisode = $derived(
		episodes.find((e) => e.publishedAt.getTime() / 1000 === config?.episodePublishedAt)
	);

	const ICON_MAX_WIDTH = 300;
	const ICON_MAX_HEIGHT = 300;

	onMount(async () => {
		try {
			const hash = window.location.hash.slice(1);
			if (!hash) {
				throw new Error('No share data found');
			}

			config = decodeShareLink(hash);

			// Update settings with shared config
			SettingsService.saveSettings({
				id: '1',
				podcastIndexKey: config.podcastIndexKey,
				podcastIndexSecret: config.podcastIndexSecret,
				corsHelperUrl: import.meta.env.VITE_CORS_HELPER_URL,
				syncIntervalMinutes: 15,
				lastSyncAt: new Date(),
				logLevel: 'info',
				isAdvanced: false
			});

			// Initialize API client
			const api = new PodcastIndexClient(config.podcastIndexKey, config.podcastIndexSecret);

			// Get feed details
			const feedResponse = await api.podcastById(Number(config.feedId));
			if (!feedResponse) {
				throw new Error('Feed not found');
			}

			// Resize and store icon
			const imageUrl = feedResponse.feed.image || feedResponse.feed.artwork;
			const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(imageUrl)}`;
			iconData = await resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT);

			feed = {
				id: feedResponse.feed.id.toString(),
				url: feedResponse.feed.url,
				title: feedResponse.feed.title,
				iconData: iconData || '',
				description: feedResponse.feed.description,
				author: feedResponse.feed.author,
				ownerName: feedResponse.feed.ownerName,
				link: feedResponse.feed.link,
				categories: Object.values(feedResponse.feed.categories || {})
			};

			isFeedAdded = feeds.find((f) => f.id === config?.feedId) !== undefined;

			// Get episodes
			const finderRequest = {
				feeds: [feed],
				since: undefined
			};

			const finderResponse = await feedService.runEpisodeFinder(finderRequest);
			episodes = finderResponse.episodes;

			const loadingScreen = document.getElementById('appLoading');
			if (loadingScreen) {
				loadingScreen.remove();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load shared content';
			alert(error);
		}
	});

	function addFeed() {
		if (!feed || !iconData || isFeedAdded) return;
		feedService.addFeedAndEpisodes(feed, episodes);
		goto(`/podcast/${feed.id}`);
	}

	function playEpisode(feed: Feed, episode: Episode) {
		feedService.addFeedAndEpisodes(feed, episodes);

		EpisodeService.setPlayingEpisode(episode);

		downloadProgress = 0;
		downloadAudio(
			episode.url,
			() => {
				EpisodeService.markDownloaded(episode);
				AudioService.play(episode.url, 0);
			},
			() => alert('failed to download episode'),
			(progress) => (downloadProgress = progress)
		);
	}

	function downloadEpisode(feed: Feed, episode: Episode) {
		feedService.addFeedAndEpisodes(feed, episodes);

		downloadProgress = 0;

		downloadAudio(
			episode.url,
			() => {
				EpisodeService.markDownloaded(episode);
				goto('/playlist');
			},
			() => alert('failed to download episode'),
			(progress) => (downloadProgress = progress)
		);
	}
</script>

<div class="share-container">
	{#if error}
		<div class="error">{error}</div>
	{:else if feed}
		<header class="podcast-header">
			{#if iconData}
				<img class="podcast-header__image" src={`data:${iconData}`} alt={feed.title} />
			{/if}
			<div class="podcast-header__content">
				<h1 class="podcast-header__title">{parseTitle(feed.title)}</h1>
				<div class="podcast-header__meta">
					<div class="meta-with-icon">
						<List size="1rem" />
						{episodes.length} episodes
					</div>
				</div>
			</div>
		</header>

		<div class="action-buttons">
			{#if targetEpisode}
				<!-- Episode-specific buttons -->
				<button class="action-button" onclick={() => playEpisode(feed!, targetEpisode)}>
					<Play size="24" />
					Play Now
				</button>
				<button class="action-button" onclick={() => downloadEpisode(feed!, targetEpisode)}>
					<Download size="24" />
					Play Later
				</button>
			{:else}
				<!-- Feed-specific buttons -->
				{#if isFeedAdded}
					<button class="action-button" onclick={() => goto(`/podcast/${config?.feedId}`)}>
						<Podcast size="24" />
						Go to podcast
					</button>
				{:else}
					<button class="action-button" onclick={addFeed}>
						<Podcast size="24" />
						Subscribe
					</button>
				{/if}
			{/if}
		</div>

		{#if targetEpisode}
			<div class="podcast-episode-container">
				<time class="podcast-episode-meta">
					{#if downloadProgress > 0 && downloadProgress < 100}
						<div class="download-progress">
							{Math.round(downloadProgress)}%
						</div>
					{:else if downloadProgress === 100}
						<div>
							<Download size="14" />
						</div>
					{/if}
					<div>
						{formatEpisodeDate(targetEpisode.publishedAt)}
					</div>
					<div>
						<Dot size="14" />
					</div>
					<div>
						{formatEpisodeDuration(targetEpisode.durationMin)}
					</div>
				</time>
				<h2 class="podcast-episode-title">{targetEpisode.title}</h2>
				<p class="podcast-episode-description">{@html targetEpisode.content}</p>
			</div>
		{:else}
			<EpisodeList {episodes} {activeEpisodes} isShare={true} />
		{/if}
	{/if}
</div>

<style>
	.error {
		color: var(--error);
		text-align: center;
		padding: 2rem;
	}

	.podcast-header {
		display: flex;
		gap: 1.5rem;
		padding: 1rem;
	}

	.podcast-header__image {
		width: 200px;
		height: 200px;
		border-radius: 0.5rem;
		object-fit: cover;
	}

	.podcast-header__content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.podcast-header__title {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0;
	}

	.podcast-header__meta {
		font-size: var(--text-medium);
		font-family: monospace;
		color: var(--primary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.meta-with-icon {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		padding: 1rem;
	}

	.action-button {
		display: flex;
		align-items: center;
		font-size: var(--text-large);
		font-weight: 600;
		background: var(--primary-less);
		gap: 0.5rem;
		border: none;
		padding: 0.75rem 1.5rem;
		color: var(--neutral);
		cursor: pointer;
		border-radius: 0.25rem;
		stroke-width: 2.5;
		flex: 1;
		justify-content: center;
	}

	.podcast-episode-container {
		padding: 1rem;
	}

	.podcast-episode-meta {
		font-size: var(--text-medium);
		font-family: monospace;
		color: var(--primary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-bottom: 0.5rem;
	}

	.download-progress {
		color: var(--primary);
		min-width: 3ch;
		padding-right: 0.5rem;
	}

	.podcast-episode-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
	}

	.podcast-episode-description {
		line-height: var(--line-height-slack);
	}
</style>
