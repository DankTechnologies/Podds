<script lang="ts">
	import '../app.css';
	import BottomNavBar from '$lib/components/BottomNavBar.svelte';
	import Player from '$lib/components/Player.svelte';

	let isPlaying = $state(false);
	let { children } = $props();
</script>

<main>
	{@render children()}
	{#if isPlaying}
		<Player />
	{/if}

	<BottomNavBar />
</main>
