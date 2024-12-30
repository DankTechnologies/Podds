<script lang="ts">
	let { name } = $props();
</script>

<header class="flex justify-between items-center w-full p-4 bg-gray-800 text-white">
	<div class="left">
	  <span>DankTech</span>
	</div>
	<div class="right">
	  <span>{name}</span>
	</div>
  </header>