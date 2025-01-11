<script lang="ts">
	import { goto } from '$app/navigation';
	import MinifluxApi from '$lib/api/MinifluxApi';
	import { type Settings } from '$lib/types/db';
	import { SettingsService } from '$lib/service/SettingsService';
	import type { Category } from '$lib/types/miniflux';
	import { onMount } from 'svelte';

	let host = $state('https://feed.pitpat.me');
	let apiKey = $state('78tRkPYOUcdIl9-0JfwNQ4rKFhLR77hIjHzVTBdCFXI=');
	let categories = $state('5');
	let isUpdate = $state<boolean>(false);
	let tested = $state<boolean>(false);
	let tempCategories = $state<Category[]>([]);

	onMount(async () => {
		const settings = await SettingsService.getSettings();

		if (settings) {
			host = settings.host;
			apiKey = settings.apiKey;
			categories = settings.categories;
			isUpdate = true;
		}
	});

	async function onSave() {
		const settings: Settings = { host, apiKey, categories };
		await SettingsService.saveSettings(settings, isUpdate);
		goto('/sync');
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
		<h1>Miniflux Setup</h1>

		<div>
			<div>
				<label for="host">Host</label>
				<input id="host" name="host" type="url" bind:value={host} />
			</div>

			<div>
				<label for="apiKey">API Key</label>
				<input id="apiKey" name="apiKey" type="text" bind:value={apiKey} />
			</div>

			<div>
				<label for="categories">Categories</label>
				<input id="categories" name="categories" bind:value={categories} />
			</div>

			<div>
				<button disabled={!tested} onclick={onSave}>
					{isUpdate ? 'Update' : 'Add'}
				</button>
				<button onclick={onTest}> Test </button>
			</div>
		</div>

		{#if tempCategories.length > 0}
			<div>
				<h2>Available Categories</h2>
				<ul>
					{#each tempCategories as category}
						<li>
							ID: {category.id}, Title: {category.title}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>
