<script lang="ts">
	import { PodcastIndexClient } from '$lib/api/podcast-index';
	import type { PIApiFeed } from '$lib/types/podcast-index';
	import { Search as SearchIcon, Check } from 'lucide-svelte';
	import { SessionInfo, SettingsService } from '$lib/service/SettingsService.svelte';
	import { onMount } from 'svelte';
	import { resizeBase64Image } from '$lib/utils/resizeImage';
	import { SvelteMap } from 'svelte/reactivity';
	import { FeedService } from '$lib/service/FeedService';
	import { Log } from '$lib/service/LogService';
	import { getAllFeeds } from '$lib/stores/db.svelte';

	let query = $state('');
	let feedResults = $state<PIApiFeed[]>([]);
	let resizedImageById = $state<SvelteMap<number, string | null>>(new SvelteMap());
	let isLoading = $state(false);
	let client = $state<PodcastIndexClient | null>(null);
	let feedService = new FeedService();

	const ICON_MAX_WIDTH = 300;
	const ICON_MAX_HEIGHT = 300;

	onMount(async () => {
		const settings = await SettingsService.getSettings();
		if (!settings) return;

		client = new PodcastIndexClient(settings.podcastIndexKey, settings.podcastIndexSecret);
	});

	async function handleSearch() {
		if (!query.trim() || !client) return;

		feedResults = [];
		resizedImageById.clear();
		isLoading = true;

		try {
			const response = await client.searchFeeds(query);

			isLoading = false;
			feedResults = response;
			console.log('Search results loaded:', response.length);

			// TODO: This is a hack to get the images to load after the results are loaded
			setTimeout(() => {
				response.forEach((feed) => {
					const imageUrl = feed.image || feed.artwork;

					if (!imageUrl) {
						resizedImageById.set(feed.id, null);
						return;
					}

					const corsHelperUrl = `${import.meta.env.VITE_CORS_HELPER_URL}?url=${encodeURIComponent(imageUrl)}`;
					resizeBase64Image(corsHelperUrl, ICON_MAX_WIDTH, ICON_MAX_HEIGHT)
						.then((resizedImage) => {
							resizedImageById.set(feed.id, resizedImage);
						})
						.catch((error) => {
							resizedImageById.set(feed.id, null);
						});
				});
			}, 0);
		} catch (error) {
			console.error('Search failed:', error);
			isLoading = false;
		}
	}

	function addFeed(feed: PIApiFeed) {
		Log.info(`Adding feed: ${feed.title}`);
		SessionInfo.isFirstVisit = false;
		feedService.addFeed(feed, resizedImageById.get(feed.id) ?? '');
	}
</script>

<div class="search-container">
	<div class="search-bar">
		<input
			type="search"
			bind:value={query}
			placeholder="Search podcasts..."
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		<button class="search-button" onclick={handleSearch} disabled={isLoading}>
			<SearchIcon size="1.5rem" />
		</button>
	</div>

	{#if isLoading}
		<div class="message">Loading...</div>
	{:else if feedResults.length > 0}
		<div class="grid">
			{#each feedResults as feed (feed.id)}
				<div class="grid-item">
					<button
						onclick={() => addFeed(feed)}
						aria-label={`Add ${feed.title} podcast`}
						disabled={getAllFeeds()?.some((f) => f.id === feed.id.toString())}
					>
						<div class="image-container">
							{#if !resizedImageById.has(feed.id)}
								<div class="skeleton"></div>
							{:else if resizedImageById.get(feed.id) !== null}
								<img src={resizedImageById.get(feed.id)} alt={feed.title} class="fade-in" />
							{:else}
								<div class="fallback">
									<span>{feed.title[0]?.toUpperCase() || '?'}</span>
								</div>
							{/if}
							{#if getAllFeeds()?.some((f) => f.id === feed.id.toString())}
								<div class="added-overlay">
									<Check size="2rem" />
								</div>
							{/if}
						</div>
						<div class="title">{feed.title}</div>
					</button>
				</div>
			{/each}
		</div>
	{:else if query}
		<div class="message">No podcasts found</div>
	{/if}
</div>

<style>
	.search-container {
		padding: 1rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.search-bar {
		display: flex;
		width: 100%;
		gap: 0.5rem;
		margin-bottom: 1rem;
		padding: 1rem;
	}

	input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--primary-less);
		background: var(--bg);
		color: var(--text);
	}

	.search-button {
		padding: 0.75rem;
		background: var(--primary);
		border: none;
		color: var(--neutral);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 2rem;
		width: 100%;
	}

	.grid-item button {
		border: 0;
		padding: 0;
		background: none;
		text-align: left;
	}

	.title {
		margin-top: 1rem;
	}

	.message {
		text-align: center;
		padding: 2rem;
	}

	.image-container {
		position: relative;
		width: 150px;
		height: 150px;
		background: var(--bg-less);
	}

	.fade-in {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		color: var(--text-less);
	}

	.added-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--neutral);
	}

	button:disabled {
		opacity: 0.7;
		cursor: default;
	}
</style>
