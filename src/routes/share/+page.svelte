<script lang="ts">
	import { onMount } from 'svelte';
	import { PodcastIndexClient } from '$lib/api/podcast-index';
	import { resizeBase64Image } from '$lib/utils/resizeImage';
	import { FeedService } from '$lib/service/FeedService.svelte';
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import type { Episode, Feed } from '$lib/types/db';
	import { getActiveEpisodes, getFeeds, getSettings } from '$lib/stores/db.svelte';
	import { goto } from '$app/navigation';
	import { Podcast, Play, Download, Dot, Package, PackageCheck, PackageOpen } from 'lucide-svelte';
	import { decodeShareLink, type ShareConfig } from '$lib/utils/share';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { parseOwner } from '$lib/utils/feedParser';
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';

	let shareDataCopied = $state(false);
	let feedExists = $state(false);
	let config = $state<ShareConfig | null>(null);
	let error = $state<string | null>(null);
	let feed = $state.raw<Feed | null>(null);
	let episodes = $state<Episode[]>([]);
	let iconData = $state<string | null>(null);
	let feedService = new FeedService();
	let downloadProgress = $state<number>(-1);
	let feeds = $derived(getFeeds());
	let activeEpisodes = $derived(getActiveEpisodes());
	let settings = $derived(getSettings());

	let targetEpisode = $derived(
		episodes.find((e) => e.publishedAt.getTime() / 1000 === config?.episodePublishedAt)
	);

	const ICON_MAX_WIDTH = 300;
	const ICON_MAX_HEIGHT = 300;

	let isAppleWeb = $derived(isAppleDevice && !isPwa);

	onMount(async () => {
		try {
			const shareData = getShareData();
			if (!shareData) {
				throw new Error('No share data found');
			}

			config = decodeShareLink(shareData);

			// iOS safari and PWA are isolated and iOS sends all links to safari even when PWA installed
			// thus, avoid steps in safari that make the app feel installed.  it's just a showroom...
			if (!isAppleWeb) {
				SettingsService.saveSettings({
					id: '1',
					podcastIndexKey: config!.podcastIndexKey,
					podcastIndexSecret: config!.podcastIndexSecret,
					corsHelper: config!.corsHelper,
					corsHelper2: config?.corsHelper2,
					syncIntervalMinutes: settings?.syncIntervalMinutes ?? 15,
					searchTermSyncIntervalHours: settings?.searchTermSyncIntervalHours ?? 24,
					lastSyncAt: settings?.lastSyncAt ?? new Date(),
					logLevel: settings?.logLevel ?? 'info',
					isAdvanced: settings?.isAdvanced ?? false,
					playbackSpeed: settings?.playbackSpeed ?? 1.0,
					skipForwardButtonSeconds: settings?.skipForwardButtonSeconds ?? 30,
					skipBackwardButtonSeconds: settings?.skipBackwardButtonSeconds ?? 10,
					completedEpisodeRetentionDays: settings?.completedEpisodeRetentionDays ?? 7,
					inProgressEpisodeRetentionDays: settings?.inProgressEpisodeRetentionDays ?? 14,
					goBackOnResumeSeconds: settings?.goBackOnResumeSeconds ?? 10,
					isPwaInstalled: settings?.isPwaInstalled ?? isPwa
				});
			}

			feed = feeds.find((f) => f.id === config?.feedId) ?? null;
			feedExists = feed !== null;

			if (feedExists) {
				iconData = feed?.iconData ?? null;
			} else {
				const { feed: newFeed, iconData: newIconData } = await getFeedFromPodcastIndex();
				feed = newFeed;
				iconData = newIconData;
			}

			episodes = await getEpisodes(feed!);

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
		if (!feed || !iconData || feedExists) return;
		feedService.addFeedAndEpisodes(feed, episodes);
		goto(`/podcast/${feed.id}`);
	}

	async function getEpisodes(feed: Feed): Promise<Episode[]> {
		const finderRequest = {
			feeds: [feed],
			since: undefined,
			corsHelper: config!.corsHelper,
			corsHelper2: config?.corsHelper2
		};

		const finderResponse = await feedService.runEpisodeFinder(finderRequest);
		return finderResponse.episodes;
	}

	async function getFeedFromPodcastIndex(): Promise<{ feed: Feed; iconData: string }> {
		const api = new PodcastIndexClient(config!.podcastIndexKey, config!.podcastIndexSecret);

		const feedResponse = await api.podcastById(Number(config!.feedId));
		if (!feedResponse) {
			throw new Error('Feed not found');
		}

		// Resize and store icon
		const imageUrl = feedResponse.feed.image || feedResponse.feed.artwork;
		const iconData = await resizeBase64Image(
			imageUrl,
			ICON_MAX_WIDTH,
			ICON_MAX_HEIGHT,
			config!.corsHelper,
			config!.corsHelper2,
			feedResponse.feed.title
		);

		const feed = {
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

		return { feed, iconData };
	}

	function playEpisode(feed: Feed, episode: Episode) {
		if (!feedExists) {
			feedService.addFeedAndEpisodes(feed, episodes);
		}

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
		if (!feedExists) {
			feedService.addFeedAndEpisodes(feed, episodes);
		}

		downloadProgress = 0;

		downloadAudio(
			episode.url,
			() => EpisodeService.markDownloaded(episode),
			() => alert('failed to download episode'),
			(progress) => (downloadProgress = progress)
		);
	}

	function getShareData(): string | null {
		const url = new URL(window.location.href);
		return url.hash.slice(1) ?? null;
	}

	function copyShareData() {
		const shareData = getShareData();
		navigator.clipboard.writeText(shareData!);
		shareDataCopied = true;
	}
</script>

<div class="share-container">
	{#if error}
		<div class="error">{error}</div>
	{:else if feed}
		<header class="podcast-header">
			<div class="podcast-header__main">
				<img
					class="podcast-header__image"
					src={`data:${iconData}`}
					alt={feed.title}
					loading={isAppleDevice ? 'eager' : 'lazy'}
					decoding={isAppleDevice ? 'auto' : 'async'}
				/>
				<div class="podcast-header__content">
					<div class="podcast-header__owner">{parseOwner(feed.author, feed.ownerName)}</div>
					<div class="podcast-header__description">{feed.description}</div>
				</div>
			</div>
		</header>

		{#if targetEpisode}
			<div class="podcast-episode-container">
				<time class="podcast-episode-meta">
					{#if downloadProgress >= 0 && downloadProgress < 100}
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
				<div class="action-buttons">
					{#if isAppleWeb}
						<button
							class="action-button"
							class:copied={shareDataCopied}
							disabled={shareDataCopied}
							onclick={copyShareData}
						>
							{#if shareDataCopied}
								<PackageCheck size="24" />
							{:else}
								<Package size="24" />
							{/if}
							Share with app
						</button>
					{:else}
						<button class="action-button" onclick={() => playEpisode(feed!, targetEpisode)}>
							<Play size="24" />
							Play Now
						</button>
						<button
							class="action-button action-button--secondary"
							onclick={() => downloadEpisode(feed!, targetEpisode)}
						>
							<Download size="24" />
							Play Later
						</button>
					{/if}
				</div>
				{#if shareDataCopied}
					<div class="share-data-copied">
						Open <img src="/podds.svg" alt="Podds" class="share-data-icon" /> app and tap the
						<span class="share-data-icon"><PackageOpen size="24" /></span> button
					</div>
				{/if}
				<p class="podcast-episode-description">{@html targetEpisode.content}</p>
			</div>
		{:else}
			<div class="action-buttons">
				{#if isAppleWeb}
					<button
						class="action-button"
						class:copied={shareDataCopied}
						disabled={shareDataCopied}
						onclick={copyShareData}
					>
						{#if shareDataCopied}
							<PackageCheck size="24" />
						{:else}
							<Package size="24" />
						{/if}
						Share with app
					</button>
				{:else if feedExists}
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
			</div>
			{#if shareDataCopied}
				<div class="share-data-copied">
					Open <img src="/podds.svg" alt="Podds" class="share-data-icon" /> app and tap the
					<span class="share-data-icon"><PackageOpen size="24" /></span> button
				</div>
			{/if}
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
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background-color: var(--bg-less);
	}

	.podcast-header__main {
		display: flex;
		gap: 1rem;
	}

	.podcast-header__image {
		width: 150px;
		height: 150px;
		border-radius: 0.5rem;
		object-fit: cover;
	}

	.podcast-header__content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-top: 0.25rem;
	}

	.podcast-header__owner {
		font-weight: 600;
	}

	.podcast-header__description {
		font-size: var(--text-smaller);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 5;
		line-clamp: 5;
		-webkit-box-orient: vertical;
		word-break: break-word;
	}

	.action-buttons {
		display: flex;
		gap: 1.5rem;
		padding: 1rem;
	}

	.podcast-episode-container .action-buttons {
		padding: 1rem 0;
	}

	.action-button {
		display: flex;
		align-items: center;
		font-size: var(--text-large);
		font-weight: 600;
		background: light-dark(var(--primary), var(--primary-more));
		color: var(--neutral);
		gap: 0.5rem;
		border: none;
		padding: 0.75rem 1.5rem;
		cursor: pointer;
		border-radius: 0.25rem;
		stroke-width: 2.5;
		flex: 1;
		justify-content: center;
		box-shadow: 0 0 0 1px light-dark(var(--grey-100), var(--grey-750));
	}

	.action-button--secondary {
		background: light-dark(var(--grey-100), var(--grey-850));
		color: light-dark(var(--grey-700), var(--neutral));
		box-shadow: 0 0 0 1px light-dark(var(--grey-500), var(--grey-700));
	}

	.action-button.copied {
		opacity: 0.5;
	}

	.share-data-copied {
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-large);
	}

	.share-data-icon {
		height: 1.5rem;
		border: 1px solid light-dark(var(--grey), var(--grey-700));
		padding: 0.25rem;
		margin: 0 0.25rem;
		border-radius: 0.25rem;
		vertical-align: middle;
		background: light-dark(var(--grey-100), var(--grey-850));
	}

	.podcast-episode-container {
		padding: 1rem;
	}

	.podcast-episode-meta {
		font-size: var(--text-medium);
		font-family: monospace;
		color: light-dark(var(--primary), var(--primary-more));
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-bottom: 0.5rem;
	}

	.download-progress {
		color: light-dark(var(--primary), var(--primary-more));
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
		text-wrap-style: pretty;
	}
</style>
