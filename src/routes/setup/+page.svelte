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

<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
	<div class="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
		<h1 class="mb-6 text-center text-2xl font-bold text-gray-900">Miniflux Setup</h1>

		<div class="space-y-4">
			<div class="flex flex-col">
				<label for="host" class="mb-1 text-sm font-medium text-gray-700">Host</label>
				<input
					id="host"
					name="host"
					type="url"
					bind:value={host}
					class="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div class="flex flex-col">
				<label for="apiKey" class="mb-1 text-sm font-medium text-gray-700">API Key</label>
				<input
					id="apiKey"
					name="apiKey"
					type="text"
					bind:value={apiKey}
					class="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div class="flex flex-col">
				<label for="categories" class="mb-1 text-sm font-medium text-gray-700">Categories</label>
				<input
					id="categories"
					name="categories"
					bind:value={categories}
					class="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div class="flex space-x-4 pt-4">
				<button
					disabled={!tested}
					onclick={onSave}
					class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isUpdate ? 'Update' : 'Add'}
				</button>
				<button
					onclick={onTest}
					class="flex-1 rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
				>
					Test
				</button>
			</div>
		</div>

		{#if tempCategories.length > 0}
			<div class="mt-6">
				<h2 class="mb-2 text-lg font-medium text-gray-900">Available Categories</h2>
				<ul class="space-y-2">
					{#each tempCategories as category}
						<li class="rounded-md bg-gray-50 p-2">
							ID: {category.id}, Title: {category.title}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>
