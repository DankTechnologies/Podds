<script lang="ts">
	import { page } from '$app/state';
	import { Home, ListMusic, ScrollText } from 'lucide-svelte';

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
		}
	];
</script>

<nav>
	{#each navItems as { href, label, icon }}
		{@const Icon = icon}
		<a {href} class="nav-item" class:active={isActive(href)}>
			<Icon size={ICON_SIZE} />
			<div class="nav-item__label">
				{label}
			</div>
		</a>
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
	}

	.nav-item__label {
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.nav-item.active {
		color: darkorange;
	}
</style>
