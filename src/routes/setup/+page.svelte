<script lang="ts">
	import { goto } from '$app/navigation';
	import MinifluxApi from '$lib/api/MinifluxApi';
	import { type Settings } from '$lib/types/db';
	import { SettingsService } from '$lib/service/SettingsService';
	import type { Category } from '$lib/types/miniflux';
	import { onMount } from 'svelte';

	let host = $state('https://feed.pitpat.me');
	let apiKey = $state('78tRkPYOUcdIl9-0JfwNQ4rKFhLR77hIjHzVTBdCFXI=');
	let categories = $state<string>('');
	let isUpdate = $state<boolean>(false);

	let isApiTested = $state<boolean>(false);
	let tempCategories = $state<Category[]>([]);
	let isValid = $derived(
		isApiTested &&
			categories
				.split(',')
				.every((id) => !isNaN(Number(id)) && tempCategories.some((cat) => cat.id === Number(id)))
	);

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
			isApiTested = true;
		} catch (error) {
			console.error(error);
			tempCategories = [];
		}
	}
</script>

<form>
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
			<input
				id="categories"
				name="categories"
				placeholder="click Test to see categories"
				bind:value={categories}
			/>
		</div>

		<button type="button" disabled={!isValid} onclick={onSave}>
			{isUpdate ? 'Update' : 'Add'}
		</button>
		<button type="button" onclick={onTest}> Test </button>
	</div>
</form>
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
{#if isApiTested && tempCategories.length === 0}
	<h2>Connection Failed</h2>
{/if}
