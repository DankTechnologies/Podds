<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SessionInfo } from '$lib/service/SettingsService.svelte';
	import { Home, ListMusic, ScrollText, Settings } from 'lucide-svelte';

	const ICON_SIZE = '2rem';

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
			icon: Home
		},
		{
			href: '/new-episodes',
			label: 'Episodes',
			icon: ScrollText
		},
		{
			href: '/playlist',
			label: 'Playlist',
			icon: ListMusic
		},
		{
			href: '/settings',
			label: 'Settings',
			icon: Settings
		}
	];
</script>

<nav>
	{#each navItems as { href, label, icon }}
		{@const Icon = icon}
		<button
			class="nav-item"
			class:active={isActive(href)}
			onclick={() => goto(href)}
			aria-label={label}
			disabled={href !== '/settings' && SessionInfo.isFirstVisit}
		>
			<Icon size={ICON_SIZE} />
			<div class="nav-item__label">
				{label}
			</div>
		</button>
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
</style>
