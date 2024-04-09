<script lang="ts">
	import Checkbox from '../icon/Checkbox.svelte';
	import Square from '../icon/Square.svelte';

	export let checked: boolean;
	export let label: string;
	export let text: string;
</script>

<div class="py-2 bg-gray-200 rounded">
	<p class="px-4 font-bold text-sm text-gray-600">{label}</p>
	<div class="pt-2 px-4">
		<button type="button" on:click|stopPropagation class="flex items-center gap-x-2 text-sm">
			{#if checked}
				<Checkbox class="w-5 h-5" />
			{:else}
				<Square class="w-5 h-5" />
			{/if}
			<span class="texts-sm text-left">{text}</span>
		</button>
	</div>
</div>
