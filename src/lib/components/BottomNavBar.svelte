<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CassetteTape, Hotel, ListMusic, Radar } from 'lucide-svelte';
	import { getFeeds, getSearchHistory, getSettings } from '$lib/stores/db.svelte';
	import { getIsLightMode } from '$lib/utils/themePreference.svelte';
	import type { ActiveEpisode } from '$lib/types/db';
	import { isAppleDevice, isPwa } from '$lib/utils/osCheck';
	import { EpisodeUpdate } from '$lib/service/FeedService.svelte';

	const ICON_SIZE = '2rem';

	let { episode }: { episode: ActiveEpisode | undefined } = $props();

	let hasFeeds = $derived(getFeeds().length > 0);
	let settings = $derived(getSettings());
	let isAppleWeb = $derived(isAppleDevice && !isPwa);
	let canSearch = $derived(settings.corsHelper && !isAppleWeb);

	let isActive = $derived((href: string) => {
		if (href === '/') {
			return page.url.pathname === '/' || page.url.pathname.startsWith('/podcast');
		}
		return page.url.pathname.startsWith(href);
	});

	let hasNewResults = $derived(getSearchHistory().some((search) => search.hasNewResults));

	let showBorderTop = $derived(!episode && getIsLightMode());

	const navItems = [
		{
			href: '/',
			label: 'Podcasts',
			icon: Hotel,
			isUpdating: () => false,
			hasUpdate: () => false,
			disabled: () => false
		},
		{
			href: '/new-episodes',
			label: 'Episodes',
			icon: CassetteTape,
			isUpdating: () => EpisodeUpdate.isUpdating,
			hasUpdate: () => EpisodeUpdate.hasNewEpisodes,
			disabled: () => !hasFeeds
		},
		{
			href: '/playlist',
			label: 'Playlist',
			icon: ListMusic,
			isUpdating: () => false,
			hasUpdate: () => false,
			disabled: () => !hasFeeds
		},
		{
			href: '/search',
			label: 'Search',
			icon: Radar,
			isUpdating: () => false,
			hasUpdate: () => hasNewResults,
			disabled: () => !canSearch,
			hidden: () => false
		}
	];
</script>

{#snippet NavButton(
	href: string,
	label: string,
	icon: any,
	isUpdating: boolean,
	hasUpdate: boolean,
	disabled: boolean
)}
	{@const Icon = icon}
	<button
		class="nav-item"
		class:active={isActive(href)}
		class:has-update={hasUpdate}
		class:is-updating={isUpdating}
		data-nav={href}
		onclick={() => goto(href)}
		aria-label={label}
		{disabled}
	>
		<div class="nav-item__icon-wrapper">
			<Icon size={ICON_SIZE} strokeWidth={isActive(href) ? 2.25 : 1.5} />
		</div>
		<div class="nav-item__label" class:active={isActive(href)}>{label}</div>
	</button>
{/snippet}

<nav class:nav-border={showBorderTop} class:is-apple-device={isAppleDevice}>
	{#each navItems as { href, label, icon, isUpdating, hasUpdate, disabled }}
		{@render NavButton(href, label, icon, isUpdating(), hasUpdate(), disabled())}
	{/each}
</nav>

<style>
	nav {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 50;
		height: 4rem;
		background-color: var(--bg-less);
		view-transition-name: nav;
	}

	.is-apple-device {
		padding-bottom: 1rem;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-decoration: none;
		color: light-dark(var(--primary-grey-dark), var(--primary-grey-light));
		border: 0;
		padding: 0.5rem;
		background: none;
		transition: all 0.2s ease-in-out;
	}

	.nav-item__label {
		margin-top: 0.3rem;
		font-size: var(--text-small);
	}

	.nav-item__label.active {
		font-weight: 600;
		font-size: var(--text-smaller);
		letter-spacing: 0.1rem;
		transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
	}

	.nav-item.active {
		color: light-dark(var(--primary), var(--primary-more));
		transform: rotate(2deg);
	}

	.nav-item:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.nav-border {
		border-top: 0.15rem solid var(--primary-less);
		transition: all 1s ease-in-out;
	}

	.nav-item__icon-wrapper {
		position: relative;
		display: flex;
	}

	/* static lower right  */
	.nav-item.has-update[data-nav='/search'] .nav-item__icon-wrapper::before {
		content: '';
		position: absolute;
		top: 22px;
		right: 14px;
		width: 4px;
		height: 4px;
		background-color: var(--success);
		border-radius: 50%;
		animation: pulse-search 3s ease-in-out infinite;
	}

	/* blinking upper left */
	.nav-item.has-update[data-nav='/search'] .nav-item__icon-wrapper::after {
		content: '';
		position: absolute;
		top: 6px;
		right: 25px;
		width: 4px;
		height: 4px;
		background-color: var(--success);
		border-radius: 50%;
		animation: pulse-search 4s ease-in-out infinite;
	}

	/* left "eye" */
	.nav-item.has-update[data-nav='/new-episodes']:not(.active) .nav-item__icon-wrapper::before {
		z-index: -1;
		content: '';
		position: absolute;
		top: 11px;
		left: 8px;
		right: 19px;
		height: 5px;
		background-color: light-dark(var(--primary-grey-light), var(--primary-more));
		border-radius: 50%;
		transition:
			opacity 0.3s ease-in-out,
			transform 0.3s ease-in-out;
	}

	/* right "eye" */
	.nav-item.has-update[data-nav='/new-episodes']:not(.active) .nav-item__icon-wrapper::after {
		z-index: -1;
		content: '';
		position: absolute;
		top: 11px;
		left: 19px;
		right: 8px;
		height: 5px;
		background-color: light-dark(var(--primary-grey-light), var(--primary-more));
		border-radius: 50%;
		transition:
			opacity 0.3s ease-in-out,
			transform 0.3s ease-in-out;
	}

	/* pulsing left "eye" */
	.nav-item.is-updating[data-nav='/new-episodes'] .nav-item__icon-wrapper::before {
		z-index: -1;
		content: '';
		position: absolute;
		top: 11px;
		left: 8px;
		right: 19px;
		height: 5px;
		background-color: light-dark(var(--primary-grey-light), var(--primary-more));
		border-radius: 50%;
		animation: pulse-new-episodes 2s ease-in-out infinite both;
		transition:
			opacity 0.3s ease-in-out,
			transform 0.3s ease-in-out;
	}

	/* pulsing right "eye" */
	.nav-item.is-updating[data-nav='/new-episodes'] .nav-item__icon-wrapper::after {
		z-index: -1;
		content: '';
		position: absolute;
		top: 11px;
		left: 19px;
		right: 8px;
		height: 5px;
		background-color: light-dark(var(--primary-grey-light), var(--primary-more));
		border-radius: 50%;
		animation: pulse-new-episodes 2s ease-in-out infinite both;
		transition:
			opacity 0.3s ease-in-out,
			transform 0.3s ease-in-out;
	}

	@keyframes pulse-new-episodes {
		0% {
			opacity: 0.2;
			transform: scale(0.2);
		}
		50% {
			opacity: 1;
			transform: scale(0.7);
		}
		100% {
			opacity: 0.2;
			transform: scale(0.2);
		}
	}

	@keyframes pulse-search {
		0% {
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
