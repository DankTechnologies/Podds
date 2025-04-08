<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { CassetteTape, Hotel, ListMusic, Radar, Settings } from 'lucide-svelte';
	import { onUpdateReady } from '$lib/utils/versionUpdate';
	import { getFeeds, getSettings } from '$lib/stores/db.svelte';

	const ICON_SIZE = '2rem';

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
		},
		{
			href: '/settings',
			label: 'Settings',
			icon: Settings,
			hasUpdate: () => SessionInfo.hasUpdate,
			disabled: () => !hasFeeds
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

<nav>
	{#each navItems as { href, label, icon, hasUpdate, disabled }}
		{@render NavButton(href, label, icon, hasUpdate(), disabled())}
	{/each}
</nav>

<style>
	nav {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 50;
		height: 4rem;
		background-color: var(--bg-less);
		border-top: 0.15rem solid var(--primary);
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-decoration: none;
		color: var(--primary-less);
		border: 0;
		padding: 0.5rem;
		background: none;
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
		color: var(--primary-more);
		transform: rotate(2deg);
	}

	.nav-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-item.has-update {
		position: relative;
	}

	.nav-item.has-update::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: 8px;
		height: 8px;
		background: var(--accent);
		border-radius: 50%;
	}
</style>
