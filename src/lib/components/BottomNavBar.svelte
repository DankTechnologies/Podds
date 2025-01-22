<script lang="ts">
	import { page } from '$app/state';
	import { Home, ListMusic, ScrollText } from 'lucide-svelte';

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
		<div class="nav-item" class:active={isActive(href)}>
			<a {href}>
				<Icon />
				<div>
					{label}
				</div>
			</a>
		</div>
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
		border-top: 3px solid black;
		background-color: white;
	}

	.nav-item {
		text-align: center;
		color: darkslategray;

		a {
			text-decoration: none;
			color: inherit;
		}
	}

	.nav-item.active {
		color: darkorange;
	}
</style>
