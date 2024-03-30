<script lang="ts">
	import type { HTMLInputTypeAttribute } from 'svelte/elements';

	export let id: string;
	export let label: string | undefined = undefined;
	export let type: HTMLInputTypeAttribute;
	export let required = false;
	export let hideAsterisk = false;
	export let value: string;
	export let pattern: string | undefined = undefined;
	export let inputTitle: string | undefined = undefined;
	export let autocomplete = true;
</script>

<div class="bg-gray-200 focus-within:bg-gray-300 rounded">
	{#if label}
		<label for={id} class="block pt-2 px-4 font-bold text-sm text-gray-600">
			{label}
			{#if required && !hideAsterisk}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}
	<input
		{id}
		{type}
		{required}
		{pattern}
		title={inputTitle}
		autocomplete={autocomplete ? 'on' : 'off'}
		on:change={(e) => (value = e.currentTarget.value)}
		{value}
		class="block w-full pt-1 pb-2 px-4 bg-transparent text-sm outline-none"
	/>
</div>
