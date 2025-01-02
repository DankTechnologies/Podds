<script lang="ts">
	import { goto } from '$app/navigation';
	import MinifluxApi from '$lib/api/miniflux';
	import type { Category } from '$lib/api/types/miniflux';
	import { db, type Settings } from '$lib/db/db';
	import { onMount } from 'svelte';

	let host = $state('https://feed.pitpat.me');
	let apiKey = $state('78tRkPYOUcdIl9-0JfwNQ4rKFhLR77hIjHzVTBdCFXI=');
	let categories = $state('5');
	let isUpdate = $state<boolean>(false);
	let tested = $state<boolean>(false);
	let tempCategories = $state<Category[]>([]);

	onMount(async () => {
		let settings = await db.settings.get(1);

		if (settings) {
			host = settings.host;
			apiKey = settings.apiKey;
			categories = settings.categories;
			isUpdate = true;
		}
	});

	async function onSave() {
		const settings: Settings = { host, apiKey, categories };

		if (isUpdate) {
			await db.settings.put({ id: 1, ...settings });
		} else {
			await db.settings.add(settings);
		}

		goto('/');
	}

	async function onTest() {
		const api = new MinifluxApi(host, apiKey);

		try {
			tempCategories = await api.fetchCategories();
			tested = true;
		} catch (error) {
			console.error(error);
		}
	}
</script>

<div>
	<div>
		<label for="host">Host</label>
		<input id="host" name="host" type="url" bind:value={host} />
	</div>

	<div>
		<label for="apiKey">API Key</label>
		<input type="text" bind:value={apiKey} />
	</div>

	<div>
		<label for="categories">Categories</label>
		<input id="categories" name="categories" bind:value={categories} />
	</div>

	<div>
		<button disabled={!tested} onclick={onSave}>{isUpdate ? 'Update' : 'Add'}</button>
		<button onclick={onTest}>Test</button>
	</div>

	<ul>
		{#each tempCategories as category}
			<li>
				ID: {category.id}, Title: {category.title}
			</li>
		{/each}
	</ul>
</div>
