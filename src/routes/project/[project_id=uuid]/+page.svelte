<script lang="ts">
	import type { HyperbaseProject } from '$lib/hyperbase/hyperbase';
	import type Hyperbase from '$lib/hyperbase/hyperbase';
	import type { Collection } from '$lib/types/collection';
	import { getContext, onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Copy from '$lib/components/icon/Copy.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import copyText from '$lib/utils/copyText';
	import errorHandler from '$lib/utils/errorHandler';
	import Input from '$lib/components/form/Input.svelte';
	import Trash from '$lib/components/icon/Trash.svelte';
	import Warning from '$lib/components/icon/Warning.svelte';
	import Settings from '$lib/components/icon/Settings.svelte';

	const hyperbase = getContext<Hyperbase>('hyperbase');
	let hyperbaseProject: HyperbaseProject;

	let collections: Collection[] = [];

	let selectedCollection: Collection;
	let addCollectionData: AddCollectionData = {
		name: '',
		schemaFields: []
	};
	let supportedSchemaFields: string[];
	let projectNameDelete = '';

	let isLoading = true;
	let isLoadingAddCollection = false;
	let showModalRemoveProject = false;
	let showModalAddCollection = false;

	onMount(() => {
		(async () => {
			try {
				const projectId = $page.params.project_id;
				hyperbaseProject = await hyperbase.getProject(projectId);
				refreshCollections();
				supportedSchemaFields = await hyperbase.getAllSupportedSchemaFields();
			} catch (err) {
				errorHandler(err);
			}
		})();
	});

	async function removeProject() {
		try {
			await hyperbaseProject.delete();
			goto(`${base}/projects`);
		} catch (err) {
			errorHandler(err);
		}
	}

	async function refreshCollections() {
		try {
			isLoading = true;

			collections = await hyperbaseProject.getAllCollections();
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoading = false;
		}
	}

	function copyTextToClipboard() {
		copyText(hyperbaseProject.data.name);
		toast.success('Successfully copied to the clipboard');
	}

	async function addCollection() {
		try {
			isLoadingAddCollection = true;

			let schemaFields: { [field: string]: { kind: string; required: boolean } } = {};
			for (const field of addCollectionData.schemaFields) {
				schemaFields[field.name] = {
					kind: field.kind,
					required: field.required
				};
			}

			await hyperbaseProject.createCollection({
				name: addCollectionData.name,
				schemaFields
			});
			await refreshCollections();
			unshowModalAddCollection();
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingAddCollection = false;
		}
	}

	function addSchemaField() {
		let order = addCollectionData.schemaFields.length + 3;

		for (const field of addCollectionData.schemaFields) {
			if (field.name === `Field${order}`) {
				order++;
			}
		}

		addCollectionData.schemaFields = [
			...addCollectionData.schemaFields,
			{
				name: `Field${order}`,
				kind: '',
				required: false,
				indexed: false,
				auth_column: false
			}
		];
	}

	function removeSchemaField(idx: number) {
		addCollectionData.schemaFields.splice(idx, 1);
		addCollectionData.schemaFields = addCollectionData.schemaFields;
	}

	function unshowModalAddCollection() {
		addCollectionData.schemaFields = [];
		showModalAddCollection = false;
	}

	interface AddCollectionData {
		name: string;
		schemaFields: {
			name: string;
			kind: string;
			required: boolean;
			indexed: boolean;
			auth_column: boolean;
		}[];
		indexes?: string[];
		authColumns?: string[];
	}
</script>

<svelte:head>
	{#if hyperbaseProject}
		<title>{hyperbaseProject.data.name} - Hyperbase UI</title>
	{/if}
</svelte:head>

<div class="flex-1 flex items-stretch">
	<div class="w-40 flex flex-col border-r">
		{#if hyperbaseProject}
			<div class="px-2">
				<h1>{hyperbaseProject.data.name}</h1>
				<div class="flex items-center gap-x-2">
					<p class="text-xs truncate">{hyperbaseProject.data.id}</p>
					<button type="button" on:click|stopPropagation={copyTextToClipboard}>
						<Copy class="w-5 h-5" />
					</button>
					<button type="button" on:click|stopPropagation={() => (showModalRemoveProject = true)}>
						<Trash class="w-5 h-5" />
					</button>
				</div>
			</div>
			<div class="my-2 border-b" />
		{/if}
		{#if !isLoading}
			<div class="px-2">
				<Button
					type="button"
					height="h-8"
					class="text-sm"
					on:click={(e) => {
						e.stopPropagation();
						showModalAddCollection = true;
					}}
				>
					New Collection
				</Button>
				<div class="mt-2">
					{#each collections as collection}
						<button
							type="button"
							class="w-full py-1 px-2 block hover:bg-gray-100 text-sm text-left rounded"
						>
							{collection.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	{#if !isLoading && !selectedCollection}
		<div class="flex-1 flex items-center justify-center">
			<div class="max-w-96 p-4 border rounded">
				<p class="font-bold text-lg">Collection Editor</p>
				<p class="mt-2.5">
					{#if collections.length > 0}
						Select a collection from the navigation panel on the left to views its data, or create a
						new one.
					{:else}
						There are no collections available in this project
					{/if}
				</p>
				<div class="mt-4">
					<Button
						type="button"
						height="h-10"
						on:click={(e) => {
							e.stopPropagation();
							showModalAddCollection = true;
						}}
					>
						Create a new collection
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if showModalRemoveProject}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		on:click={() => (showModalRemoveProject = false)}
		class="fixed w-screen h-screen p-4 flex items-center justify-center bg-black/20"
	>
		<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
			<div>
				<p class="font-bold text-center text-2xl">Remove Project</p>
			</div>
			<div class="mt-6 space-y-6">
				<div class="flex items-center gap-x-2">
					<Warning class="w-8 h-8 text-red-500" />
					<p class="text-red-500">This action cannot be undone.</p>
				</div>
				<p>
					This will permanently delete the {hyperbaseProject.data.name} project and all of its data.
				</p>
				<Input
					id="project_name_delete"
					label="Type '{hyperbaseProject.data.name}' to confirm"
					type="text"
					required
					autocomplete={false}
					bind:value={projectNameDelete}
				/>
				<div class="flex gap-x-2">
					<Button type="button" kind="secondary" loading={isLoading} height="h-10">Cancel</Button>
					<Button
						type="button"
						kind="danger"
						loading={isLoading}
						height="h-10"
						disable={projectNameDelete !== hyperbaseProject.data.name}
						on:click={removeProject}
					>
						Remove
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showModalAddCollection}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		on:click|stopPropagation={unshowModalAddCollection}
		class="fixed w-screen h-screen bg-black/20"
	>
		<form
			on:submit|preventDefault={addCollection}
			on:click={(e) => e.stopPropagation()}
			class="absolute right-0 w-full h-full max-h-full max-w-2xl py-4 flex flex-col bg-white"
		>
			<div class="px-4">
				<p class="font-bold text-center text-2xl">Create Collection</p>
			</div>
			<div class="min-h-0 flex-1 flex flex-col mt-8">
				<div class="min-h-0 h-full px-4 overflow-y-auto">
					<div>
						<Input
							id="collection_name"
							label="Name"
							type="text"
							required
							autocomplete={false}
							bind:value={addCollectionData.name}
						/>
					</div>
					<div class="mt-6 bg-gray-200 rounded">
						<p class="pt-2 px-4 font-bold text-sm text-gray-600">
							Schema Fields
							<span class="text-red-500">*</span>
						</p>
						<div class="pt-2 px-4 space-y-2">
							<table class="w-full text-sm">
								<thead>
									<tr>
										<th class="p-1 text-left">Name</th>
										<th class="w-28 p-1 text-left">Type</th>
										<th class="w-20 p-1">Options</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td class="p-1">_id</td>
										<td class="p-1">uuid</td>
										<td class="p-1 flex">
											<Settings class="w-5 h-5 mx-auto text-black/30" />
											<Trash class="w-5 h-5 mx-auto text-black/30" />
										</td>
									</tr>
									<tr>
										<td class="p-1">_created_by</td>
										<td class="p-1">uuid</td>
										<td class="p-1 flex">
											<Settings class="w-5 h-5 mx-auto text-black/30" />
											<Trash class="w-5 h-5 mx-auto text-black/30" />
										</td>
									</tr>
									{#each addCollectionData.schemaFields as _, i}
										<tr>
											<td class="p-1">
												<input
													type="text"
													bind:value={addCollectionData.schemaFields[i].name}
													class="w-full px-1 border border-black bg-transparent outline-none"
												/>
											</td>
											<td class="p-1">
												<select
													class="border border-black bg-transparent outline-none"
													bind:value={addCollectionData.schemaFields[i].kind}
												>
													{#each supportedSchemaFields as ssf}
														<option>{ssf}</option>
													{/each}
												</select>
											</td>
											<td class="p-1 flex">
												<button type="button" class="block w-fit mx-auto">
													<Settings class="w-5 h-5" />
												</button>
												<button
													type="button"
													on:click|stopPropagation={() => removeSchemaField(i)}
													class="block w-fit mx-auto"
												>
													<Trash class="w-5 h-5" />
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="pt-4 pb-2 px-4">
							<button
								type="button"
								on:click|stopPropagation={addSchemaField}
								class="block w-fit mx-auto px-4 py-1 border-2 border-black hover:bg-gray-300 rounded font-bold text-sm"
							>
								Add field
							</button>
						</div>
					</div>
				</div>
				<div class="w-fit mt-auto ml-auto pt-4 px-4 flex gap-x-2">
					<Button
						type="button"
						kind="secondary"
						loading={isLoadingAddCollection}
						height="h-10"
						on:click={unshowModalAddCollection}
						class="py-2 px-12"
					>
						Cancel
					</Button>
					<Button type="submit" loading={isLoadingAddCollection} height="h-10" class="py-2 px-12">
						Create
					</Button>
				</div>
			</div>
		</form>
	</div>
{/if}
