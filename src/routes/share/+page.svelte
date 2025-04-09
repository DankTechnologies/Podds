<script lang="ts">
	import { onMount } from 'svelte';
	import { decodeShareLink, type ShareConfig } from '$lib/utils/shareLink';
	import { PodcastIndexClient } from '$lib/api/podcast-index';
	import { resizeBase64Image } from '$lib/utils/resizeImage';
	import { FeedService } from '$lib/service/FeedService';
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { parseTitle } from '$lib/utils/feedParser';
	import EpisodeList from '$lib/components/EpisodeList.svelte';
	import type { Episode, Feed } from '$lib/types/db';
	import { getActiveEpisodes, getFeeds } from '$lib/stores/db.svelte';
	import { goto } from '$app/navigation';
	import { List, History, Podcast } from 'lucide-svelte';
	import { formatEpisodeDate } from '$lib/utils/time';

	let isLoading = $state(true);
	let config = $state<ShareConfig | null>(null);
	let error = $state<string | null>(null);
	let feed = $state.raw<Feed | null>(null);
	let episodes = $state<Episode[]>([]);
	let iconData = $state<string | null>(null);
	let feedService = new FeedService();

	let feeds = $derived(getFeeds());
	let activeEpisodes = $derived(getActiveEpisodes());

	let targetEpisode = $derived(episodes.find((e) => e.url === config?.episodeUrl));
	let isFeedAdded = $derived(feeds.find((f) => f.id === config?.feedId));

	let oldestEpisode = $derived(
		[...episodes].sort(
			(a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
		)[0]
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
				syncIntervalMinutes: 15,
				logLevel: 'info'
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
			const corsHelperUrl = `${config.corsHelperUrl}?url=${encodeURIComponent(imageUrl)}`;
			iconData = await resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT);

			feed = {
				id: feedResponse.feed.id.toString(),
				url: feedResponse.feed.url,
				title: feedResponse.feed.title,
				iconData: iconData || '',
				lastUpdatedAt: new Date()
			};

			// Get episodes
			const finderRequest = {
				feeds: [feed],
				since: undefined
			};

			const finderResponse = await feedService.runEpisodeFinder(finderRequest);
			episodes = finderResponse.episodes;
			isLoading = false;

			const loadingScreen = document.getElementById('appLoading');
			if (loadingScreen) {
				loadingScreen.remove();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load shared content';
			isLoading = false;
		}
	});

	async function addFeed() {
		if (!feed || !iconData || isFeedAdded) return;
		feedService.addFeedAndEpisodes(feed, episodes);
		goto(`/podcast/${feed.id}`);
	}
</script>

<div class="share-container">
	{#if isLoading}
		<div class="loading">
			<div class="spinner"></div>
			<div>Loading...</div>
		</div>
	{:else if error}
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
				<div class="podcast-header__meta">
					<div class="meta-with-icon">
						<History size="1rem" />
						{formatEpisodeDate(oldestEpisode.publishedAt)}
					</div>
				</div>
				<div class="podcast-header__buttons">
					{#if !isFeedAdded}
						<button class="podcast-header__button" onclick={addFeed}>
							<Podcast size="24" />
							Subscribe
						</button>
					{/if}
				</div>
			</div>
		</header>

		<EpisodeList {episodes} {activeEpisodes} isShare={true} />
	{/if}
</div>

<style>
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		gap: 1rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--primary-less);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

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
		padding-top: 1rem;
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

	.podcast-header__buttons {
		display: flex;
		gap: 2rem;
		margin-top: 0.5rem;
		width: fit-content;
	}

	.podcast-header__button {
		display: flex;
		align-items: center;
		font-size: var(--text-large);
		font-weight: 600;
		background: var(--primary-less);
		gap: 0.5rem;
		border: none;
		padding: 0.5rem 1rem;
		color: var(--neutral);
		cursor: pointer;
		border-radius: 0.25rem;
		stroke-width: 2.5;
	}
</style>
