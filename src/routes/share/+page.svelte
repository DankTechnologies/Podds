<script lang="ts">
	import { onMount } from 'svelte';
	import { FeedService } from '$lib/service/FeedService.svelte';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import type { Episode, Feed } from '$lib/types/db';
	import { db, getActiveEpisodes, getFeeds, getSettings } from '$lib/stores/db.svelte';
	import { goto } from '$app/navigation';
	import { Podcast, Play, Download, Dot, Package, PackageCheck, PackageOpen } from 'lucide-svelte';
	import { decodeShareLink, getShareData, type ShareConfig } from '$lib/utils/share';
	import { formatEpisodeDate, formatEpisodeDuration } from '$lib/utils/time';
	import { EpisodeService } from '$lib/service/EpisodeService.svelte';
	import { downloadAudio } from '$lib/utils/downloadAudio';
	import { AudioService } from '$lib/service/AudioService.svelte';
	import { parseOwner } from '$lib/utils/feedParser';
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';
	import { searchPodcasts } from '$lib/api/itunes';
	import type { EpisodeFinderResponse } from '$lib/types/episodeFinder';

	let shareDataCopied = $state(false);
	let config = $state<ShareConfig | null>(null);
	let error = $state<string | null>(null);
	let feed = $state.raw<Feed | null>(null);
	let episodes = $state<Episode[]>([]);
	let feedService = new FeedService();
	let downloadProgress = $state<number>(-1);
	let feeds = $derived(getFeeds());
	let feedExists = $derived(feeds.find((f) => f.id === config?.feedId) !== undefined);
	let activeEpisodes = $derived(getActiveEpisodes());
	let settings = $derived(getSettings());
	let shareData = $state<string | null>(null);

	let targetEpisode = $derived(
		episodes.find((e) => e.publishedAt.getTime() / 1000 === config?.episodePublishedAt)
	);

	let isAppleWeb = $derived(isAppleDevice && !isPwa);

	onMount(initialize);

	// Add hashchange event listener
	$effect(() => {
		window.addEventListener('hashchange', initialize);
		return () => window.removeEventListener('hashchange', initialize);
	});

	async function initialize() {
		try {
			shareDataCopied = false;
			shareData = getShareData();
			if (!shareData) {
				throw new Error('No share data found');
			}

			config = decodeShareLink(shareData);
			await getFeedAndEpisodes(config!.feedId);

			const loadingScreen = document.getElementById('appLoading');
			if (loadingScreen) {
				loadingScreen.remove();
			}
		} catch (err) {
			error =
				err instanceof Error ? `${err.message} - ${err.stack}` : 'Failed to load shared content';
			alert(error);
		}
	}

	function addFeed() {
		if (!feed || feedExists) return;
		feedService.addFeedAndEpisodes(feed, episodes);
		goto(`/podcast/${feed.id}`);
	}

	async function getFeedAndEpisodes(feedId: string) {
		feed = feeds.find((f) => f.id === feedId) ?? null;

		if (feedExists) {
			episodes = db.episodes.find({ feedId: feedId }).fetch();
		} else {
			const newFeed = await searchPodcasts(feedId, { limit: 1 });
			if (newFeed.length === 1) {
				feed = newFeed[0];
			} else {
				throw new Error('Feed not found');
			}

			const finderResponse = await getEpisodes($state.snapshot(feed!));
			episodes = finderResponse.episodes;

			feed = {
				...feed!,
				lastCheckedAt: finderResponse.feeds[0].lastCheckedAt ?? new Date(),
				lastSyncedAt: finderResponse.feeds[0].lastSyncedAt ?? new Date(),
				lastModified: finderResponse.feeds[0].lastModified ?? new Date(),
				ttlMinutes: finderResponse.feeds[0].ttlMinutes ?? 0,
				description: finderResponse.feeds[0].description ?? '',
				link: finderResponse.feeds[0].link ?? '',
				author: finderResponse.feeds[0].author ?? '',
				ownerName: finderResponse.feeds[0].ownerName ?? ''
			};
		}
	}

	async function getEpisodes(feed: Feed): Promise<EpisodeFinderResponse> {
		const finderRequest = {
			feeds: [feed],
			since: undefined,
			corsHelper: settings.corsHelper,
			corsHelper2: settings.corsHelper2
		};

		return await feedService.runEpisodeFinder(finderRequest);
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

	function copyShareData() {
		if (!shareData) return;
		navigator.clipboard.writeText(shareData);
		shareDataCopied = true;
	}
</script>

<div class="share-container">
	{#if error}
		<div class="error">{error}</div>
	{:else if feed}
		<header class="podcast-header">
			<div class="podcast-header__main">
				<img class="podcast-header__image" src={`data:${feed.iconData}`} alt={feed.title} />
				<div class="podcast-header__content">
					<div class="podcast-header__owner">{parseOwner(feed.author, feed.ownerName)}</div>
					<div class="podcast-header__description">{@html feed.description}</div>
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
		font-size: var(--text-xl);
		font-weight: 600;
		margin: 0;
		padding-bottom: 1rem;
	}

	.podcast-episode-description {
		line-height: var(--line-height-slack);
		text-wrap-style: pretty;
	}
</style>
