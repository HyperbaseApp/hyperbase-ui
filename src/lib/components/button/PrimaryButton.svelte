<script lang="ts">
	import Loading from '../icon/Loading.svelte';

	export let type: 'button' | 'submit' | 'reset';
	export let loading = false;
</script>

<button
	{type}
	disabled={loading}
	class="w-full h-15 flex items-center justify-center gap-x-2.5 bg-black font-bold text-center text-white rounded"
>
	{#if loading}
		<Loading class="w-5 h-5 animate-spin" />
	{/if}
	<slot />
</button>
