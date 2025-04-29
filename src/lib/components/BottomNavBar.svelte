<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { CassetteTape, Hotel, ListMusic, Radar } from 'lucide-svelte';
	import { onUpdateReady } from '$lib/utils/versionUpdate';
	import { getFeeds, getSettings } from '$lib/stores/db.svelte';
	import { getIsLightMode } from '$lib/utils/themePreference.svelte';
	import type { ActiveEpisode } from '$lib/types/db';

	const ICON_SIZE = '2rem';

	let { episode }: { episode: ActiveEpisode | undefined } = $props();

	onUpdateReady(() => {
		SessionInfo.hasUpdate = true;
	});

	let hasFeeds = $derived(getFeeds().length > 0);
	let hasSettings = $derived(getSettings() !== undefined);

	const isActive = $derived((href: string) => {
		if (href === '/') {
			return page.url.pathname === '/' || page.url.pathname.startsWith('/podcast');
		}
		return page.url.pathname === href;
	});

	const showBorderTop = $derived(!episode && getIsLightMode());

	const navItems = [
		{
			href: '/',
			label: 'Podcasts',
			icon: Hotel,
			hasUpdate: () => false,
			disabled: () => !hasFeeds
		},
		{
			href: '/new-episodes',
			label: 'Episodes',
			icon: CassetteTape,
			hasUpdate: () => false,
			disabled: () => !hasFeeds
		},
		{
			href: '/playlist',
			label: 'Playlist',
			icon: ListMusic,
			hasUpdate: () => false,
			disabled: () => !hasFeeds
		},
		{
			href: '/search',
			label: 'Search',
			icon: Radar,
			hasUpdate: () => false,
			disabled: () => !hasSettings,
			hidden: () => false
		}
	];
</script>

{#snippet NavButton(href: string, label: string, icon: any, hasUpdate: boolean, disabled: boolean)}
	{@const Icon = icon}
	<button
		class="nav-item"
		class:active={isActive(href)}
		class:has-update={hasUpdate}
		onclick={() => goto(href)}
		aria-label={label}
		{disabled}
	>
		<Icon size={ICON_SIZE} strokeWidth={isActive(href) ? 2.25 : 1.5} />
		<div class="nav-item__label" class:active={isActive(href)}>{label}</div>
	</button>
{/snippet}

<nav class:nav-border={showBorderTop}>
	{#each navItems as { href, label, icon, hasUpdate, disabled }}
		{@render NavButton(href, label, icon, hasUpdate(), disabled())}
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
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-border {
		border-top: 0.15rem solid light-dark(var(--primary-less), var(--primary-grey-light));
		transition: all 1s ease-in-out;
	}
</style>
