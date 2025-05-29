<script lang="ts">
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import type { Settings } from '$lib/types/db';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import GeneralSettings from '$lib/components/GeneralSettings.svelte';
	import ApiSettings from '$lib/components/ApiSettings.svelte';
	import SystemSettings from '$lib/components/SystemSettings.svelte';
	import Love from '$lib/components/Love.svelte';
	import { getActiveEpisodes, getSettings } from '$lib/stores/db.svelte';

	type Section = 'general' | 'advanced' | 'system' | 'love';

	let tenPlays = $derived(getActiveEpisodes().length >= 10);
	let settings = $state<Settings>(getSettings());

	// Default to 'general', will be updated in onMount from URL
	let activeSection = $state<Section>('general');

	// Update active section when page URL changes
	$effect(() => {
		const section = page.url.searchParams.get('section');
		if (section === 'advanced' || section === 'system' || section === 'love') {
			activeSection = section;
		} else {
			activeSection = 'general';
		}
	});

	function setActiveSection(section: Section) {
		if (section === 'love') {
			SettingsService.markHugged();
		}

		goto(`?section=${section}`, { replaceState: true });
	}

	function onSave() {
		SettingsService.saveSettings(settings!);
	}
</script>

<nav class="settings-nav">
	<button
		class="nav-item"
		class:active={activeSection === 'general'}
		onclick={() => setActiveSection('general')}>General</button
	>
	<button
		class="nav-item"
		class:active={activeSection === 'system'}
		onclick={() => setActiveSection('system')}>System</button
	>
	<button
		class="nav-item"
		class:active={activeSection === 'advanced'}
		onclick={() => setActiveSection('advanced')}>Advanced</button
	>
	{#if tenPlays && !settings.hugged}
		<button
			class="nav-item"
			class:active={activeSection === 'love'}
			onclick={() => setActiveSection('love')}
			><img src="/gpa-smiley.svg" alt="Podds" class="smiley-nav-icon" /></button
		>
	{/if}
</nav>

<div class="settings-content">
	{#if activeSection === 'general'}
		<GeneralSettings bind:settings {onSave} />
	{/if}

	{#if activeSection === 'advanced'}
		<ApiSettings bind:settings {onSave} />
	{/if}

	{#if activeSection === 'system'}
		<SystemSettings bind:settings {onSave} />
	{/if}

	{#if activeSection === 'love'}
		<Love />
	{/if}
</div>

<style>
	.settings-nav {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background-color: var(--bg-less);
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 4px solid var(--primary-less);
	}

	.settings-content {
		padding: 2rem;
		position: relative;
		z-index: 1;
	}

	.nav-item {
		padding: 0.5rem 0.75rem;
		border-radius: 0.25rem;
		border: none;
		background: var(--bg);
		color: var(--text);
		box-shadow: 0 0 0 1px light-dark(var(--grey), var(--grey-700));
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-item.active {
		opacity: 1;
	}

	.nav-item:not(.active) {
		opacity: 0.5;
	}

	.smiley-nav-icon {
		height: 1rem;
	}
</style>
