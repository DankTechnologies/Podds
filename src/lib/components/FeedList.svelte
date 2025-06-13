<script lang="ts">
	import type { Episode, Feed } from '$lib/types/db';
	import { SvelteMap } from 'svelte/reactivity';
	import { parseOwner, parseTitle } from '$lib/utils/feedParser';
	import { formatEpisodeDate } from '$lib/utils/time';
	import {
		History,
		List,
		ArrowUpLeft,
		CirclePlus,
		CheckCircle,
		LoaderPinwheel,
		Antenna,
		Rss
	} from 'lucide-svelte';
	import { FeedService } from '$lib/service/FeedService.svelte';
	import { goto } from '$app/navigation';
	import { getSettings } from '$lib/stores/db.svelte';
	import type { EpisodeFinderResponse } from '$lib/types/episodeFinder';
	import { convertUrlToBase64 } from '$lib/api/itunes';

	let {
		feeds,
		currentFeedIds,
		currentSubscribedFeedIds,
		feedIconsById
	}: {
		feeds: Feed[];
		currentFeedIds: Set<string>;
		currentSubscribedFeedIds: Set<string>;
		feedIconsById?: Map<string, string | undefined>;
	} = $props();

	let feedDataById = $state(new SvelteMap<string, Feed>());
	let episodeDataByFeedId = $state(new SvelteMap<string, Episode[]>());
	let settings = $derived(getSettings());
	let focusedFeedId = $state<string | null>(null);
	let loadingFeedId = $state<string | null>(null);
	let feedService = new FeedService();
	let feedStates = $state(new SvelteMap<string, 'adding' | 'success' | 'failure'>());

	async function addFeed(feed: Feed) {
		let success = false;

		feedStates.set(feed.id.toString(), 'adding');

		if (feedDataById.has(feed.id.toString()) && episodeDataByFeedId.has(feed.id.toString())) {
			const feedToAdd = feedDataById.get(feed.id.toString())!;
			feedToAdd.iconData = await convertUrlToBase64(feedToAdd.iconData, feedToAdd.title);
			success = await feedService.addFeedAndEpisodes(
				feedToAdd,
				episodeDataByFeedId.get(feed.id.toString())!
			);
		} else {
			const feedToAdd = $state.snapshot(feed);
			feedToAdd.iconData = await convertUrlToBase64(feedToAdd.iconData, feedToAdd.title);
			success = await feedService.addFeed(feedToAdd);
		}

		feedStates.set(feed.id.toString(), success ? 'success' : 'failure');
	}

	function isFeedKnown(feed: Feed) {
		return currentFeedIds.has(feed.id.toString());
	}

	function isFeedSubscribed(feed: Feed) {
		return currentSubscribedFeedIds.has(feed.id.toString());
	}

	async function toggleFeedFocus(feed: Feed) {
		if (!feedDataById.has(feed.id.toString())) {
			loadingFeedId = feed.id.toString();
			const response = await getEpisodes($state.snapshot(feed));
			episodeDataByFeedId.set(feed.id.toString(), response.episodes);
			feedDataById.set(feed.id.toString(), response.feeds[0]);
			loadingFeedId = null;
		}

		focusedFeedId = focusedFeedId === feed.id.toString() ? null : feed.id.toString();

		if (focusedFeedId) {
			// Use requestAnimationFrame to ensure DOM updates are complete
			requestAnimationFrame(() => {
				const card = document.querySelector(`.feed-card__wrapper[data-feed-id="${feed.id}"]`);
				if (card) {
					const cardBottom = card.getBoundingClientRect().bottom;
					if (cardBottom + 300 > window.innerHeight) {
						// Use a more reliable scroll approach
						const scrollOptions: ScrollIntoViewOptions = {
							behavior: 'smooth',
							block: 'center'
						};

						// Try smooth scrolling first, fall back to instant if needed
						try {
							card.scrollIntoView(scrollOptions);
						} catch (e) {
							// Fallback for browsers that don't support smooth scrolling
							scrollOptions.behavior = 'auto';
							card.scrollIntoView(scrollOptions);
						}
					}
				}
			});
		}
	}

	function handleFeedAction(feed: Feed, e: Event) {
		e.stopPropagation();
		if (isFeedSubscribed(feed)) {
			goto(`/podcast/${feed.id}`);
		} else if (isFeedKnown(feed)) {
			feedService.markSubscribed(feed.id.toString());
		} else {
			addFeed(feed);
		}
	}

	async function getEpisodes(feed: Feed): Promise<EpisodeFinderResponse> {
		const finderRequest = {
			feeds: [feed],
			since: undefined,
			corsHelper: settings.corsHelper,
			corsHelper2: settings.corsHelper2,
			force: false
		};

		return await feedService.runEpisodeFinder(finderRequest);
	}

	async function handleFeedClick(feed: Feed, e: Event) {
		e.preventDefault();
		e.stopPropagation();

		if (isFeedKnown(feed)) {
			goto(`/podcast/${feed.id}`);
		} else {
			loadingFeedId = feed.id.toString();
			const feedToAdd = $state.snapshot(feed);
			feedToAdd.isSubscribed = 0;
			feedToAdd.iconData = await convertUrlToBase64(feedToAdd.iconData, feedToAdd.title);
			await feedService.addFeed(feedToAdd);
			loadingFeedId = null;
			goto(`/podcast/${feed.id}`);
		}
	}
</script>

<ul class="feed-list" role="list">
	{#each feeds as feed (feed.id)}
		<li
			class="feed-card fade-in"
			class:feed-card--focused={focusedFeedId === feed.id.toString()}
			class:feed-card--subscribed={isFeedSubscribed(feed)}
		>
			<div
				class="feed-card__wrapper"
				data-feed-id={feed.id}
				onclick={() => toggleFeedFocus(feed)}
				onkeydown={(e) => e.key === 'Enter' && toggleFeedFocus(feed)}
				role="button"
				tabindex="0"
			>
				{#if loadingFeedId === feed.id.toString()}
					<LoaderPinwheel class="feed-card__loading" />
				{/if}
				<div class="feed-card__content">
					<div
						class="feed-card__image-container"
						onclick={(e) => handleFeedAction(feed, e)}
						onkeydown={(e) => e.key === 'Enter' && handleFeedAction(feed, e)}
						aria-label="Add {parseTitle(feed.title)}"
						role="button"
						tabindex="0"
					>
						{#if feedIconsById?.has(feed.id.toString())}
							<img
								src={feedIconsById.get(feed.id.toString())}
								alt={feed.title}
								class="feed-card__image fade-in"
							/>
						{:else}
							<div class="feed-card__image">
								<div class="fallback">
									<span>{feed.title[0]?.toUpperCase() || '?'}</span>
								</div>
							</div>
						{/if}
						{#if isFeedSubscribed(feed)}
							<div class="added-overlay">
								<CheckCircle class="added-overlay-icon circle-icon" size="28" />
							</div>
						{:else if feedStates.get(feed.id.toString()) === 'adding'}
							<div class="added-overlay">
								<LoaderPinwheel class="added-overlay-icon plus-icon pulse-icon" size="28" />
							</div>
						{:else}
							<button class="added-overlay">
								<CirclePlus class="added-overlay-icon plus-icon" size="28" />
							</button>
						{/if}
					</div>
					<div class="feed-card__heading">
						<div class="feed-card__title">
							{#if isFeedSubscribed(feed)}
								<button
									class="feed-link"
									onclick={(e) => {
										e.stopPropagation();
										goto(`/podcast/${feed.id}`);
									}}
								>
									<span><Rss size="0.9rem" class="feed-card__title-icon" /></span>
									<span>{parseTitle(feed.title)}</span>
								</button>
							{:else}
								<a href="/" class="feed-link" onclick={(e) => handleFeedClick(feed, e)}>
									{parseTitle(feed.title)}
								</a>
							{/if}
						</div>
						<div class="feed-card__meta">
							<div class="meta-with-icon">
								<List size="0.75rem" />
								<span>{feed.episodeCount} episodes</span>
							</div>
						</div>
						<div class="feed-card__meta">
							<div class="meta-with-icon">
								<History size="0.75rem" />
								<span>{formatEpisodeDate(feed.newestItemPubdate)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="feed-details" class:feed-details--hidden={focusedFeedId !== feed.id.toString()}>
				{#if feedDataById.has(feed.id.toString())}
					<div class="feed-details__description-wrapper">
						<div class="feed-details__owner">
							<div class="feed-details__owner-icon">
								<Antenna size="0.9rem" />
							</div>
							<div class="feed-details__owner-text">
								{parseOwner(
									feedDataById.get(feed.id.toString())?.author,
									feedDataById.get(feed.id.toString())?.ownerName
								)}
							</div>
						</div>
						<div class="feed-details__description">
							{@html feedDataById.get(feed.id.toString())?.description}
						</div>
					</div>
				{/if}
				{#if feedStates.get(feed.id.toString()) === 'failure'}
					<div class="feed-details__error-message">
						couldn't get episodes <ArrowUpLeft size="16" /> try later
					</div>
				{/if}
			</div>
		</li>
	{/each}
</ul>

<style>
	.feed-list {
		display: flex;
		flex-direction: column;
		padding-bottom: 10rem;
		overflow-y: hidden;
	}

	.feed-card {
		transition: background 150ms ease-out;
		position: relative;
		border-bottom: 1px solid light-dark(var(--primary-less), var(--primary-grey-light));
	}

	.feed-card--focused {
		background: var(--bg-less);
		border-bottom: 0.1rem solid light-dark(var(--primary), var(--primary-more));
		transition: border-bottom 150ms ease-in-out;
	}

	.feed-card--focused.feed-card--subscribed {
		border-bottom-color: var(--success);
	}

	:global(.feed-card__loading) {
		position: absolute;
		right: 0.5rem;
		top: 1rem;
		width: 5rem;
		height: 5rem;
		pointer-events: none;
		color: var(--bg-less);
		opacity: 0.5;
		animation: spin 1.25s linear infinite;
		z-index: 1;
	}

	.feed-card__wrapper {
		width: 100%;
		background: none;
		border: none;
		padding: 1rem;
		text-align: left;
		color: var(--text);
		box-sizing: border-box;
	}

	.feed-card--focused .feed-card__wrapper {
		border-bottom: none;
	}

	.feed-card__content {
		display: flex;
		gap: 1rem;
	}

	.feed-card__image-container {
		position: relative;
		width: 5rem;
		height: 5rem;
		background: var(--bg-less);
	}

	.feed-card__image {
		width: 5rem;
		height: 5rem;
		object-fit: cover;
		aspect-ratio: 1;
		border-radius: 0.25rem;
	}

	.feed-card__image .fallback {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		color: var(--text-less);
	}

	.feed-card__heading {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 0.25rem;
	}

	.feed-card__title {
		line-height: var(--line-height-normal);
		font-size: var(--text-medium);
		text-wrap-style: pretty;
		z-index: 2;
	}

	.feed-card--subscribed .feed-card__title {
		gap: 0.5rem;
		box-shadow: 0.5rem 0.5rem 0 0 var(--success);
		margin-bottom: 0.75rem;
		padding: 0.25rem 0.5rem;
		letter-spacing: 0.02rem;
		border: 1px solid light-dark(var(--grey-400), var(--grey-800));
		border-radius: 0.25rem;
		transition: all 0.6s ease-in-out;
		background: var(--bg-less);

		button {
			font-weight: bold;
			color: light-dark(var(--grey-700), var(--grey-300));
			display: flex;
			align-items: center;
			gap: 0.75rem;
			text-decoration: none;
			outline: none;
			-webkit-tap-highlight-color: transparent;
			-webkit-touch-callout: none;
			-webkit-user-select: none;
			user-select: none;
			background: none;
			border: none;
			padding: 0;
		}

		button:focus {
			outline: none;
		}

		button:active {
			background: none;
		}

		:global(.feed-card__title-icon) {
			background: var(--success);
			color: light-dark(var(--bg-less), var(--grey-100));
			stroke-width: 3.5;
			border-radius: 50%;
			padding: 0.25rem;
			scale: 1.05;
		}
	}

	.feed-card__meta {
		font-size: var(--text-small);
		font-family: monospace;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-bottom: 0.1rem;
	}

	.feed-card--subscribed .feed-card__meta {
		font-size: var(--text-xs);
	}

	.feed-card--focused .feed-card__meta {
		color: light-dark(var(--primary), var(--primary-more));
	}

	.feed-card--subscribed .feed-card__meta {
		color: var(--success);
		transition: color 150ms ease-in-out;
	}

	.meta-with-icon {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.added-overlay {
		position: absolute;
		bottom: 0.25rem;
		right: 0.25rem;
		padding: 0;
		border-radius: 50%;
		color: light-dark(var(--primary), var(--primary-more));
		background: light-dark(var(--grey-100), var(--grey-750));
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}

	:global(.added-overlay-icon) {
		stroke-width: 1.5;
	}

	:global(.circle-icon) {
		color: var(--success);
		transition: color 150ms ease-in-out;
	}

	:global(.pulse-icon) {
		scale: 1.1;
		animation: spin 1.25s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
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

	.feed-details {
		transform: scaleY(0);
		transform-origin: top;
		opacity: 0;
		overflow: hidden;
		height: 0;
	}

	.feed-details--hidden {
		background: var(--bg);
		pointer-events: none;
	}

	.feed-details:not(.feed-details--hidden) {
		transform: scaleY(1);
		opacity: 1;
		height: auto;
		transition:
			transform 150ms ease-in-out,
			opacity 150ms ease-in-out;
	}

	.feed-details__owner {
		color: light-dark(var(--primary), var(--primary-more));
		display: flex;
		gap: 0.75rem;
		margin-left: -0.25rem;
		margin-bottom: 0.5rem;
	}

	.feed-card--subscribed .feed-details__owner {
		color: var(--success);
	}

	.feed-details__owner-icon {
		margin-top: 0.2rem;
	}

	.feed-details__owner-text {
		font-family: monospace;
		font-size: var(--text-smaller);
		margin-top: 0.2rem;
		letter-spacing: 0.08rem;
		text-overflow: ellipsis;
		text-wrap-style: pretty;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		word-break: break-word;
	}

	.feed-details__description-wrapper {
		padding: 1rem;
	}

	.feed-details__description {
		font-size: var(--text-small);
		line-height: var(--line-height-normal);
		text-wrap-style: pretty;
		overflow: hidden;
		border-left: 0.5rem solid light-dark(var(--primary), var(--primary-more));
		padding: 0 1rem;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 10;
		line-clamp: 10;
		-webkit-box-orient: vertical;
		word-break: break-word;

		:global(p) {
			margin: 0;
		}
	}

	.feed-card--subscribed .feed-details__description {
		border-left-color: var(--success);
	}

	.feed-details__error-message {
		display: flex;
		align-items: center;
		padding: 1rem;
		gap: 0.5rem;
		opacity: 0.8;
		font-size: var(--text-small);
		font-family: monospace;
		color: var(--error);
	}

	.feed-link {
		font-weight: bold;
		text-decoration: none;
	}
</style>
