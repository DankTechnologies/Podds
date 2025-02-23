<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { Home, ListMusic, ScrollText, Search, Settings } from 'lucide-svelte';
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
			icon: Home,
			hasUpdate: () => false,
			disabled: () => false
		},
		{
			href: '/new-episodes',
			label: 'Episodes',
			icon: ScrollText,
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
			icon: Search,
			hasUpdate: () => false,
			disabled: () => !hasSettings,
			hidden: () => false
		},
		{
			href: '/settings',
			label: 'Settings',
			icon: Settings,
			hasUpdate: () => SessionInfo.hasUpdate,
			disabled: () => false
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
		<Icon
			style={isActive(href) ? 'filter: drop-shadow(0 0 0.5rem var(--accent));' : ''}
			size={ICON_SIZE}
			strokeWidth={isActive(href) ? 2.25 : 1.5}
		/>
		<div class="nav-item__label">{label}</div>
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
		/* transition: color 0.2s ease; */
		border: 0;
		padding: 0.5rem;
		background: none;
	}

	.nav-item__label {
		margin-top: 0.3rem;
		font-size: var(--text-small);
	}

	.nav-item.active {
		color: var(--primary-more);
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
