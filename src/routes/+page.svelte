<script lang="ts">
	import { dankStore } from '$lib/DankStore.svelte';
	import Header from './Header.svelte';

	let formState = $state({
		name: '',
		birthday: '',
		step: 0,
		error: ''
	});
</script>

<main>
	<Header name="Dan"></Header>
	<p>Step: {formState.step + 1}</p>
	<button class="rounded bg-green-200 p-7 hover:bg-green-700" onclick={() => dankStore.up()}
		>{dankStore.count}</button
	>

	{#if formState.error}
		<p class="error">Error: {formState.error}</p>
	{/if}

	{#if formState.step === 0}
		<div>
			<label for="name">Your Name</label>
			<input type="text" id="name" bind:value={formState.name} />
		</div>
		<button
			class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-700"
			onclick={() => {
				if (formState.name) {
					formState.step += 1;
					formState.error = '';
				} else {
					formState.error = 'Name empty';
				}
			}}
		>
			Next
		</button>
	{:else if formState.step === 1}
		<div>
			<label for="birthday">B-Day</label>
			<input type="date" id="birthday" bind:value={formState.birthday} />
		</div>
		<button
			class="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-700"
			onclick={() => {
				if (formState.birthday) {
					formState.step += 1;
					formState.error = '';
				} else {
					formState.error = 'Birthday empty';
				}
			}}
		>
			Next
		</button>
	{/if}
</main>

<style>
	.error {
		color: red;
	}
</style>
