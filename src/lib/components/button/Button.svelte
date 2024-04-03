<script lang="ts">
	import Loading from '../icon/Loading.svelte';

	export let type: 'button' | 'submit' | 'reset';
	export let kind: 'primary' | 'secondary' | 'danger' | 'none' = 'primary';
	export let loading = false;
	export let disable = false;
	export let height: 'h-15' | 'h-10' | 'h-8' = 'h-15';

	let className: string | undefined = undefined;
	export { className as class };
</script>

<button
	{type}
	disabled={loading || disable}
	on:click|stopPropagation
	class="w-full h-15 flex items-center justify-center gap-x-2.5 font-bold text-center rounded {kind ===
	'primary'
		? 'bg-black hover:bg-neutral-800 text-white'
		: kind === 'secondary'
			? 'border-2 border-black bg-white hover:bg-neutral-100 text-black'
			: kind === 'danger'
				? 'border-2 border-red-500 bg-white hover:bg-red-500 text-red-500 hover:text-black'
				: ''}{className ? ` ${className}` : ''}"
	class:h-15={height === 'h-15'}
	class:h-10={height === 'h-10'}
	class:h-8={height === 'h-8'}
>
	{#if loading}
		<Loading class="w-5 h-5 animate-spin" />
	{/if}
	<slot />
</button>
