<script lang="ts">
	import { Search as SearchIcon } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let query = $state('');

	$effect(() => {
		// Update search input when URL changes
		if ($page.params.term) {
			query = decodeURIComponent($page.params.term);
		}
	});

	function handleSearch() {
		if (!query.trim()) return;
		goto(`/search/${encodeURIComponent(query.trim())}`);
	}
</script>

<div class="search-container">
	<div class="search-bar">
		<input
			type="search"
			bind:value={query}
			spellcheck="false"
			placeholder="Search podcasts..."
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		<button class="search-button" onclick={handleSearch}>
			<SearchIcon size="1.5rem" />
		</button>
	</div>
</div>

{@render children()}

<style>
	.search-container {
		padding: 1rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		background-color: var(--bg-less);
	}

	.search-bar {
		display: flex;
		width: 100%;
		gap: 1rem;
		padding: 1rem;
	}

	input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--primary-less);
		border-radius: 0.25rem;
		background: var(--bg);
		color: var(--text);
	}

	input[type='search']::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
		-webkit-tap-highlight-color: transparent;
		height: 1.5rem;
		width: 1.5rem;
		border-radius: 50%;
		background: light-dark(var(--grey-500), var(--grey-600));
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fff'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E");
		background-size: 1em;
		background-position: center;
		background-repeat: no-repeat;
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	.search-button {
		padding: 0.75rem;
		background: var(--primary);
		border: none;
		color: var(--neutral);
		border-radius: 0.25rem;
	}

	input[type='search']::placeholder {
		opacity: 0.5;
	}
</style>
