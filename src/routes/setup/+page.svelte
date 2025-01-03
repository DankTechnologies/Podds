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

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	<div class="max-w-md w-full space-y-6 bg-white p-8 rounded-lg shadow-md">
		<h1 class="text-2xl font-bold text-gray-900 text-center mb-6">Miniflux Setup</h1>

		<div class="space-y-4">
			<div class="flex flex-col">
				<label for="host" class="text-sm font-medium text-gray-700 mb-1">Host</label>
				<input 
					id="host" 
					name="host" 
					type="url" 
					bind:value={host}
					class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			<div class="flex flex-col">
				<label for="apiKey" class="text-sm font-medium text-gray-700 mb-1">API Key</label>
				<input 
					type="text" 
					bind:value={apiKey}
					class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			<div class="flex flex-col">
				<label for="categories" class="text-sm font-medium text-gray-700 mb-1">Categories</label>
				<input 
					id="categories" 
					name="categories" 
					bind:value={categories}
					class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				/>
			</div>

			<div class="flex space-x-4 pt-4">
				<button 
					disabled={!tested} 
					onclick={onSave}
					class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isUpdate ? 'Update' : 'Add'}
				</button>
				<button 
					onclick={onTest}
					class="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
				>
					Test
				</button>
			</div>
		</div>

		{#if tempCategories.length > 0}
			<div class="mt-6">
				<h2 class="text-lg font-medium text-gray-900 mb-2">Available Categories</h2>
				<ul class="space-y-2">
					{#each tempCategories as category}
						<li class="p-2 bg-gray-50 rounded-md">
							ID: {category.id}, Title: {category.title}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</div>
