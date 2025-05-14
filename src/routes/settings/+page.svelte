<script lang="ts">
	import { SettingsService } from '$lib/service/SettingsService.svelte';
	import { getSettings } from '$lib/stores/db.svelte';
	import type { Settings } from '$lib/types/db';
	import { isPwa } from '$lib/utils/osCheck';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import GeneralSettings from '$lib/components/GeneralSettings.svelte';
	import ApiSettings from '$lib/components/ApiSettings.svelte';
	import AdvancedSettings from '$lib/components/AdvancedSettings.svelte';
	import Love from '$lib/components/Love.svelte';
	import Help from '$lib/components/Help.svelte';

	let settings = $state<Settings>(
		getSettings() || {
			id: '1',
			podcastIndexKey: import.meta.env.VITE_PODCAST_INDEX_KEY || '',
			podcastIndexSecret: import.meta.env.VITE_PODCAST_INDEX_SECRET || '',
			corsHelper: import.meta.env.VITE_CORS_HELPER_URL || '',
			corsHelper2: import.meta.env.VITE_CORS_HELPER_BACKUP_URL || '',
			syncIntervalMinutes: 15,
			searchTermSyncIntervalHours: 24,
			lastSyncAt: new Date(),
			isAdvanced: true,
			logLevel: 'info',
			playbackSpeed: 1.0,
			isPwaInstalled: isPwa,
			skipForwardButtonSeconds: 30,
			skipBackwardButtonSeconds: 10,
			completedEpisodeRetentionDays: 7,
			inProgressEpisodeRetentionDays: 14,
			goBackOnResumeSeconds: 10,
			hugged: false
		}
	);

	let isConfigured = $derived(
		settings?.podcastIndexKey && settings?.podcastIndexSecret && settings?.corsHelper
	);

	// Default to 'general', will be updated in onMount from URL
	let activeSection = $state<'general' | 'api' | 'advanced' | 'love' | 'help'>('general');

	// Update active section when page URL changes
	$effect(() => {
		const section = page.url.searchParams.get('section');
		if (section === 'api' || section === 'advanced' || section === 'love' || section === 'help') {
			activeSection = section;
		} else {
			activeSection = 'general';
		}
	});

	function setActiveSection(section: 'general' | 'api' | 'advanced' | 'love' | 'help') {
		if (section === 'love') {
			SettingsService.markHugged();
		}

		goto(`?section=${section}`, { replaceState: true });
	}

	function onSave() {
		SettingsService.saveSettings(settings);
	}
</script>

<nav class="settings-nav">
	<button
		class="nav-item"
		class:active={activeSection === 'general'}
		onclick={() => setActiveSection('general')}>General</button
	>
	{#if settings.isAdvanced}
		<button
			class="nav-item"
			class:active={activeSection === 'api'}
			onclick={() => setActiveSection('api')}>API</button
		>
		<button
			class="nav-item"
			class:active={activeSection === 'advanced'}
			onclick={() => setActiveSection('advanced')}>Advanced</button
		>
	{/if}
	<button
		class="nav-item"
		class:active={activeSection === 'help'}
		onclick={() => setActiveSection('help')}>Help</button
	>
	{#if isConfigured && !settings.hugged}
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

	{#if activeSection === 'api'}
		<ApiSettings bind:settings {onSave} />
	{/if}

	{#if activeSection === 'advanced'}
		<AdvancedSettings bind:settings {onSave} />
	{/if}

	{#if activeSection === 'love'}
		<Love />
	{/if}

	{#if activeSection === 'help'}
		<Help />
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
		padding: 0.5rem;
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
