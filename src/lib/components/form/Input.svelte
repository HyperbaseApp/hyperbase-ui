<script lang="ts">
	import type { HTMLInputTypeAttribute } from 'svelte/elements';

	export let id: string;
	export let label: string;
	export let type: HTMLInputTypeAttribute;
	export let required = false;
	export let value: string;
	export let pattern: string | undefined = undefined;
</script>

<div class="py-1 px-4 bg-gray-200 rounded">
	<label for={id} class="font-bold text-sm text-gray-600">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</label>
	<input
		{id}
		{type}
		{required}
		{pattern}
		on:change={(e) => (value = e.currentTarget.value)}
		class="block w-full my-1 bg-transparent text-sm outline-none"
	/>
</div>
