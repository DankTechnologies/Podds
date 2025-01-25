<script lang="ts">
	import { goto } from '$app/navigation';
	import MinifluxApi from '$lib/api/MinifluxApi';
	import { type OptionalId, type Settings } from '$lib/types/db';
	import { SettingsService } from '$lib/service/SettingsService';
	import type { Category } from '$lib/types/miniflux';
	import { onMount } from 'svelte';

	let settings = $state<OptionalId<Settings>>({
		host: 'https://feed.pitpat.me',
		apiKey: '78tRkPYOUcdIl9-0JfwNQ4rKFhLR77hIjHzVTBdCFXI=',
		categories: '',
		syncIntervalHours: 24
	});
	let isUpdate = $state<boolean>(false);

	let isApiTested = $state<boolean>(false);
	let tempCategories = $state<Category[]>([]);
	let isValid = $derived(
		isApiTested &&
			(settings.categories ?? '')
				.split(',')
				.every((id) => !isNaN(Number(id)) && tempCategories.some((cat) => cat.id === Number(id)))
	);

	onMount(async () => {
		const savedSettings = await SettingsService.getSettings();

		if (savedSettings) {
			settings = savedSettings;
			isUpdate = true;
		}
	});

	async function onSave() {
		await SettingsService.saveSettings(settings, isUpdate);
		goto('/sync');
	}

	async function onTest() {
		const api = new MinifluxApi(settings.host, settings.apiKey);

		try {
			tempCategories = (await api.fetchCategories()).toSorted((a, b) => a.id - b.id);
			isApiTested = true;
		} catch (error) {
			console.error(error);
			tempCategories = [];
		}
	}
</script>

<header>
	<h1>Miniflux Setup</h1>
</header>
<form class="grid">
	<div>
		<label for="host">Host</label>
		<input id="host" name="host" type="url" bind:value={settings.host} />
	</div>
	<div>
		<label for="apiKey">API Key</label>
		<input id="apiKey" name="apiKey" type="text" bind:value={settings.apiKey} />
	</div>
	<div>
		<label for="categories">Categories</label>
		<input
			id="categories"
			name="categories"
			placeholder="click Test to see categories"
			bind:value={settings.categories}
		/>
	</div>
	<div>
		<button type="button" onclick={onTest}> Test </button>
	</div>
	<div>
		<button type="button" disabled={!isValid} onclick={onSave}>
			{isUpdate ? 'Update' : 'Add'}
		</button>
	</div>
</form>
<section class="results">
	{#if tempCategories.length > 0}
		<h2>Available Categories</h2>
		<table>
			<thead>
				<tr>
					<th>ID</th>
					<th>Title</th>
				</tr>
			</thead>
			<tbody>
				{#each tempCategories as category}
					<tr>
						<td>{category.id}</td>
						<td>{category.title}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#if isApiTested && tempCategories.length === 0}
		<h2>Connection Failed</h2>
	{/if}
</section>

<style>
	header {
		padding: 0 1.25rem;
	}

	form {
		display: grid;
	}

	form > div {
		display: flex;
		flex-direction: column;
		padding: 1.25rem;
	}
	label {
		font-weight: bold;
		font-size: larger;
		padding-bottom: 1rem;
	}
	input,
	button {
		padding: 0.5em;
	}

	.results {
		padding: 0 1.25rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid lightgrey;
	}

	th {
		font-weight: bold;
	}
</style>
