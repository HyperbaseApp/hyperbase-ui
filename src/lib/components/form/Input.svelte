<script lang="ts">
	import type { HTMLInputTypeAttribute } from 'svelte/elements';

	export let id: string;
	export let label: string;
	export let type: HTMLInputTypeAttribute;
	export let required = false;
	export let hideAsterisk = false;
	export let value: string;
	export let pattern: string | undefined = undefined;
	export let inputTitle: string | undefined = undefined;
	export let autocomplete = true;
	export let suffix: string | undefined = undefined;
	export let validateInput: ((val: string) => boolean) | undefined = undefined;
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
	<div class="pt-1 pb-2 px-4 flex items-center gap-x-1 text-sm">
		<input
			{id}
			{type}
			{required}
			{pattern}
			title={inputTitle}
			autocomplete={autocomplete ? 'on' : 'off'}
			on:input={(e) => {
				if (validateInput && !validateInput(e.currentTarget.value)) {
					e.currentTarget.value = value;
					return;
				}
				value = e.currentTarget.value;
			}}
			{value}
			class="block w-full bg-transparent outline-none"
		/>
		{#if suffix}
			<span>{suffix}</span>
		{/if}
	</div>
</div>
