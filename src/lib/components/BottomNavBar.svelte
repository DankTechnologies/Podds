<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { Home, ListMusic, ScrollText, Settings } from 'lucide-svelte';
	import { onUpdateReady } from '$lib/utils/versionUpdate';

	const ICON_SIZE = '2rem';

	onUpdateReady(() => {
		SessionInfo.hasUpdate = true;
	});

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
			disabled: () => SessionInfo.isFirstVisit
		},
		{
			href: '/new-episodes',
			label: 'Episodes',
			icon: ScrollText,
			hasUpdate: () => false,
			disabled: () => SessionInfo.isFirstVisit
		},
		{
			href: '/playlist',
			label: 'Playlist',
			icon: ListMusic,
			hasUpdate: () => false,
			disabled: () => SessionInfo.isFirstVisit
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
		<Icon size={ICON_SIZE} />
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
		display: flex;
		justify-content: space-between;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 50;
		height: 3.25rem;
		padding: 0.5rem 1rem;
		border-top: 3px solid darkorange;
		background-color: white;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-decoration: none;
		color: slategray;
		transition: color 0.2s ease;
		border: 0;
		padding: 0;
		background: none;
	}

	.nav-item__label {
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.nav-item.active {
		color: darkorange;
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
		background: darkorange;
		border-radius: 50%;
	}
</style>
