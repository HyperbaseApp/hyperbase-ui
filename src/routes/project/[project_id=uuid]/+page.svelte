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
	import Checkbox from '$lib/components/icon/Checkbox.svelte';
	import Square from '$lib/components/icon/Square.svelte';
	import EllipsisHorizontal from '$lib/components/icon/EllipsisHorizontal.svelte';
	import Create from '$lib/components/icon/Create.svelte';
	import Loading from '$lib/components/icon/Loading.svelte';

	const hyperbase = getContext<Hyperbase>('hyperbase');
	let hyperbaseProject: HyperbaseProject;

	let collections: Collection[] = [];

	let selectedCollection: Collection | undefined = undefined;
	let collectionData: CollectionData = {
		id: '',
		name: '',
		schemaFields: []
	};
	let supportedSchemaFields: string[];
	let projectNameRemove = '';
	let collectionNameRemove = '';

	let isInit = true;
	let isLoadingEditProject = false;
	let isLoadingRemoveProject = false;
	let isLoadingRefreshCollection = false;
	let isLoadingRefreshSelectedCollection = false;
	let isLoadingAddEditCollection = false;
	let isLoadingRemoveCollection = false;
	let showModalEditProject = {
		id: '',
		name: ''
	};
	let showModalRemoveProject = false;
	let showModalRemoveCollection = {
		id: '',
		name: ''
	};
	let showModalCollection: 'add' | 'edit' | 'none' = 'none';
	let showProjectOpt = false;
	let showCollectionOpt: {
		id: string;
		position: 'top' | 'bottom';
	} = {
		id: '',
		position: 'bottom'
	};
	let showSchemaFieldOpt: {
		idx: number;
		position: 'top' | 'bottom';
	} = {
		idx: -1,
		position: 'bottom'
	};

	onMount(() => {
		(async () => {
			try {
				const projectId = $page.params.project_id;
				hyperbaseProject = await hyperbase.getProject(projectId);
				refreshCollections();
				supportedSchemaFields = await hyperbase.getAllSupportedSchemaFields();
			} catch (err) {
				errorHandler(err);
			} finally {
				isInit = false;
			}
		})();
	});

	async function editProject() {
		try {
			isLoadingEditProject = true;

			await hyperbaseProject.update(showModalEditProject.name);
			hyperbaseProject = await hyperbase.getProject(showModalEditProject.id);
			unshowModalEditProject();
			toast.success('Successfully updated the project');
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingEditProject = false;
		}
	}

	function unshowModalEditProject() {
		showModalEditProject = {
			id: '',
			name: ''
		};
	}

	async function removeProject() {
		try {
			isLoadingRemoveProject = true;

			await hyperbaseProject.delete();
			toast.success('Successfully removed the project');
			goto(`${base}/projects`);
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingRemoveProject = false;
		}
	}

	function unshowModalRemoveProject() {
		projectNameRemove = '';
		showModalRemoveProject = false;
	}

	async function refreshCollections() {
		try {
			isLoadingRefreshCollection = true;

			const collectionsData: Collection[] = await hyperbaseProject.getAllCollections();
			collectionsData.sort((a, b) => {
				const lowerA = a.name.toLocaleLowerCase();
				const lowerB = b.name.toLocaleLowerCase();
				return lowerA > lowerB ? 1 : lowerA === lowerB ? 0 : -1;
			});
			collections = collectionsData;
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingRefreshCollection = false;
		}
	}

	function copyTextToClipboard(text: string) {
		copyText(text);
		toast.success('Successfully copied to the clipboard');
	}

	function toggleShowCollectionOpt(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		id: string
	) {
		showCollectionOpt.id = showCollectionOpt.id === id ? '' : id;
		if (showCollectionOpt.id.length > 0) {
			if (e.clientY + 125 > document.documentElement.clientHeight) {
				showCollectionOpt.position = 'top';
			} else {
				showCollectionOpt.position = 'bottom';
			}
		}
	}

	async function refreshSelectedCollection() {
		if (!selectedCollection?.id) return;

		try {
			isLoadingRefreshSelectedCollection = true;

			const hyperbaseCollection = await hyperbaseProject.getCollection(selectedCollection.id);
			selectedCollection = hyperbaseCollection.data;
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingRefreshSelectedCollection = false;
		}
	}

	async function addCollection() {
		let schemaFields: {
			[field: string]: {
				kind: string;
				required?: boolean;
				indexed?: boolean;
				auth_column?: boolean;
			};
		} = {};
		for (const field of collectionData.schemaFields) {
			if (field._internal.name_invalid !== 'none') {
				return;
			}
			schemaFields[field.name] = {
				kind: field.kind,
				required: field.required,
				indexed: field.indexed,
				auth_column: field.auth_column
			};
		}

		try {
			isLoadingAddEditCollection = true;

			await hyperbaseProject.createCollection({
				name: collectionData.name,
				schemaFields
			});
			unshowModalCollection();
			toast.success('Successfully added a collection');
			await refreshCollections();
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingAddEditCollection = false;
		}
	}

	async function editCollection() {
		let schemaFields: {
			[field: string]: {
				kind: string;
				required?: boolean;
				indexed?: boolean;
				auth_column?: boolean;
			};
		} = {};
		for (const field of collectionData.schemaFields) {
			if (field._internal.name_invalid !== 'none') {
				return;
			}
			schemaFields[field.name] = {
				kind: field.kind,
				required: field.required,
				indexed: field.indexed,
				auth_column: field.auth_column
			};
		}

		try {
			isLoadingAddEditCollection = true;

			const hyperbaseCollection = await hyperbaseProject.getCollection(collectionData.id);
			await hyperbaseCollection.update({
				name: collectionData.name,
				schemaFields
			});
			unshowModalCollection();
			toast.success('Successfully updated the collection');
			await Promise.all([refreshCollections(), refreshSelectedCollection()]);
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingAddEditCollection = false;
		}
	}

	async function removeCollection(id: string) {
		try {
			isLoadingRemoveCollection = true;

			const hyperbaseCollection = await hyperbaseProject.getCollection(id);
			await hyperbaseCollection.delete();
			unshowModalRemoveCollection();
			toast.success('Successfully removed the collection');
			await refreshCollections();
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingRemoveCollection = false;
		}
	}

	function unshowModalRemoveCollection() {
		collectionNameRemove = '';
		showModalRemoveCollection = { id: '', name: '' };
	}

	function showModalEditCollection(id: string) {
		let editCollection = collections.find((c) => c.id === id);
		if (!editCollection) return;

		let editCollectionData: CollectionData = {
			id: editCollection.id,
			name: editCollection.name,
			schemaFields: []
		};
		for (const [field, props] of Object.entries(editCollection.schema_fields)) {
			editCollectionData.schemaFields.push({
				name: field,
				kind: props.kind,
				required: props.required,
				indexed: props.indexed,
				auth_column: props.auth_column,
				_internal: {
					name_invalid: 'none',
					kind_invalid: false
				}
			});
		}

		collectionData = editCollectionData;
		showCollectionOpt.id = '';
		showModalCollection = 'edit';
	}

	function addSchemaField() {
		let order = collectionData.schemaFields.length;
		let char = String.fromCharCode('a'.charCodeAt(0) + order);

		for (const field of collectionData.schemaFields) {
			if (field.name === `field_${char}`) {
				order++;
				char = String.fromCharCode('a'.charCodeAt(0) + order);
			}
		}

		collectionData.schemaFields = [
			...collectionData.schemaFields,
			{
				name: `field_${char}`,
				kind: '',
				required: false,
				indexed: false,
				auth_column: false,
				_internal: {
					name_invalid: 'none',
					kind_invalid: true
				}
			}
		];
	}

	function validateSchemaField(idx: number) {
		if (collectionData.schemaFields[idx].name.startsWith('_')) {
			collectionData.schemaFields[idx]._internal.name_invalid = 'format';
			return;
		}
		const lastChar = collectionData.schemaFields[idx].name.at(-1);
		if (lastChar && !(lastChar === '_' || (lastChar >= 'a' && lastChar <= 'z'))) {
			collectionData.schemaFields[idx]._internal.name_invalid = 'format';
			return;
		}
		let isExist = false;
		for (const [i, field] of collectionData.schemaFields.entries()) {
			if (i !== idx && field.name === collectionData.schemaFields[idx].name) {
				isExist = true;
				break;
			}
		}
		if (isExist) {
			collectionData.schemaFields[idx]._internal.name_invalid = 'exists';
			return;
		}
		collectionData.schemaFields[idx]._internal.name_invalid = 'none';
	}

	function removeSchemaField(idx: number) {
		showSchemaFieldOpt.idx = -1;
		collectionData.schemaFields.splice(idx, 1);
		collectionData.schemaFields = collectionData.schemaFields;
	}

	function unshowModalCollection() {
		collectionData = {
			id: '',
			name: '',
			schemaFields: []
		};
		showSchemaFieldOpt.idx = -1;
		showModalCollection = 'none';
	}

	function toggleShowSchemaFieldOpt(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		idx: number
	) {
		showSchemaFieldOpt.idx = showSchemaFieldOpt.idx === idx ? -1 : idx;
		if (showSchemaFieldOpt.idx >= 0) {
			if (e.clientY + 275 > document.documentElement.clientHeight) {
				showSchemaFieldOpt.position = 'top';
			} else {
				showSchemaFieldOpt.position = 'bottom';
			}
		}
	}

	function escape() {
		showProjectOpt = false;
		if (showSchemaFieldOpt.idx >= 0) {
			showSchemaFieldOpt.idx = -1;
			return;
		}
		if (showModalCollection !== 'none') {
			unshowModalCollection();
			return;
		}
		if (showModalRemoveProject) {
			unshowModalRemoveProject();
			return;
		}
		if (showCollectionOpt.id.length > 0) {
			showCollectionOpt.id = '';
			return;
		}
		selectedCollection = undefined;
	}

	interface CollectionData {
		id: string;
		name: string;
		schemaFields: {
			name: string;
			kind: string;
			required: boolean;
			indexed: boolean;
			auth_column: boolean;
			_internal: {
				name_invalid: 'none' | 'exists' | 'format';
				kind_invalid: boolean;
			};
		}[];
	}
</script>

<svelte:head>
	{#if hyperbaseProject}
		<title>{hyperbaseProject.data.name} - Hyperbase UI</title>
	{/if}
</svelte:head>

<svelte:window on:keydown={(e) => (e.code === 'Escape' ? escape() : undefined)} />

{#if !isInit}
	<div class="mt-1 min-h-0 flex-1 flex items-stretch">
		<div class="w-48 flex flex-col border-r">
			{#if hyperbaseProject}
				<div class="px-2">
					<div class="flex items-center justify-between gap-x-2">
						<h1 class="font-bold">{hyperbaseProject.data.name}</h1>
						<div class="relative">
							<button
								type="button"
								on:click|stopPropagation={() => (showProjectOpt = !showProjectOpt)}
							>
								<Settings class="w-5 h-5" />
							</button>
							{#if showProjectOpt}
								<div class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm text-sm">
									<button
										type="button"
										on:click|stopPropagation={() => {
											showProjectOpt = false;
											showModalEditProject = {
												id: hyperbaseProject.data.id,
												name: hyperbaseProject.data.name
											};
										}}
										class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
									>
										<Create class="w-5 h-5" />
										<span>Edit</span>
									</button>
									<button
										type="button"
										on:click|stopPropagation={() => {
											showProjectOpt = false;
											showModalRemoveProject = true;
										}}
										class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
									>
										<Trash class="w-5 h-5" />
										<span>Remove</span>
									</button>
								</div>
							{/if}
						</div>
					</div>
					<div class="mt-2 flex items-center justify-between gap-x-2">
						<p class="text-xs truncate">{hyperbaseProject.data.id}</p>
						<button
							type="button"
							on:click|stopPropagation={() => copyTextToClipboard(hyperbaseProject.data.id)}
						>
							<Copy class="w-5 h-5" />
						</button>
					</div>
				</div>
				<div class="my-2 border-b" />
			{/if}
			{#if !isLoadingRefreshCollection}
				<div class="px-2 min-h-0 flex-1 flex flex-col">
					<Button
						type="button"
						height="h-8"
						class="text-sm"
						on:click={(e) => {
							e.stopPropagation();
							showModalCollection = 'add';
						}}
					>
						New Collection
					</Button>
					<div class="mt-2 min-h-0 flex-1 rounded overflow-hidden">
						<div class="h-full overflow-y-auto">
							{#each collections as collection}
								<div class="relative">
									<button
										type="button"
										on:click|stopPropagation={() => (selectedCollection = collection)}
										title={collection.name}
										class="w-full py-1 px-2 flex items-center justify-between {selectedCollection?.id ===
										collection.id
											? 'bg-neutral-200'
											: 'hover:bg-neutral-100'} text-sm text-left rounded"
									>
										<span class="truncate">{collection.name}</span>
										<button
											type="button"
											on:click|stopPropagation={(e) => toggleShowCollectionOpt(e, collection.id)}
											><EllipsisHorizontal class="w-4 h-4" /></button
										>
									</button>
									{#if showCollectionOpt.id === collection.id}
										<div
											class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm text-sm"
											class:top-full={showCollectionOpt.position === 'bottom'}
											class:bottom-full={showCollectionOpt.position === 'top'}
										>
											<button
												type="button"
												on:click|stopPropagation={() => showModalEditCollection(collection.id)}
												class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
											>
												<Create class="w-5 h-5" />
												<span>Edit</span>
											</button>
											<button
												type="button"
												on:click|stopPropagation={() => {
													showCollectionOpt.id = '';
													showModalRemoveCollection = { id: collection.id, name: collection.name };
												}}
												class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
											>
												<Trash class="w-5 h-5" />
												<span>Remove</span>
											</button>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
		{#if !isLoadingRefreshCollection}
			{#if selectedCollection}
				<div class="min-w-0 flex-1 flex flex-col">
					<div class="px-2 flex items-center gap-x-2">
						<h2>ID: {selectedCollection.id}</h2>
						<button
							type="button"
							on:click|stopPropagation={() => copyTextToClipboard(selectedCollection?.id ?? '')}
						>
							<Copy class="w-5 h-5" />
						</button>
					</div>
					<div class="min-h-0 mt-2 flex-1 overflow-x-auto">
						<table>
							<thead>
								<tr>
									<th class="px-2">
										<div class="flex items-center gap-x-2">
											<span>_id</span>
											<span class="font-normal text-sm text-gray-500">uuid</span>
										</div>
									</th>
									<th class="px-2">
										<div class="flex items-center gap-x-2">
											<span>_created_by</span>
											<span class="font-normal text-sm text-gray-500">uuid</span>
										</div>
									</th>
									{#each Object.entries(selectedCollection.schema_fields) as [field, props]}
										<th class="px-2">
											<div class="flex items-center gap-x-2">
												<span>{field}</span>
												<span class="font-normal text-sm text-gray-500">{props.kind}</span>
											</div>
										</th>
									{/each}
								</tr>
							</thead>
						</table>
					</div>
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<div class="max-w-96 p-4 border rounded">
						<p class="font-bold text-lg">Collection Editor</p>
						<p class="mt-2.5">
							{#if collections.length > 0}
								Select a collection from the navigation panel on the left to views its data, or
								create a new one.
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
									showModalCollection = 'add';
								}}
							>
								Create a new collection
							</Button>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	{#if showModalEditProject.id.length > 0}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={unshowModalEditProject}
			class="fixed z-10 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<form on:submit|preventDefault={editProject}>
					<div>
						<p class="font-bold text-center text-2xl">Edit Project</p>
					</div>
					<div class="mt-8 space-y-6">
						<Input
							id="project_name"
							label="Project Name"
							type="text"
							required
							autocomplete={false}
							bind:value={showModalEditProject.name}
						/>
						<div class="flex gap-x-2">
							<Button
								type="button"
								kind="secondary"
								disable={isLoadingEditProject}
								height="h-10"
								on:click={(e) => {
									e.stopPropagation();
									unshowModalEditProject();
								}}
							>
								Cancel
							</Button>
							<Button type="submit" loading={isLoadingEditProject} height="h-10">Edit</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showModalRemoveProject}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={unshowModalRemoveProject}
			class="fixed z-10 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
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
						bind:value={projectNameRemove}
					/>
					<div class="flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingRemoveProject}
							height="h-10"
							on:click={(e) => {
								e.stopPropagation();
								unshowModalRemoveProject();
							}}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveProject}
							height="h-10"
							disable={projectNameRemove !== hyperbaseProject.data.name}
							on:click={(e) => {
								e.stopPropagation();
								removeProject();
							}}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showModalRemoveCollection.id.length > 0}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={unshowModalRemoveCollection}
			class="fixed z-10 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<div>
					<p class="font-bold text-center text-2xl">Remove Collection</p>
				</div>
				<div class="mt-6 space-y-6">
					<div class="flex items-center gap-x-2">
						<Warning class="w-8 h-8 text-red-500" />
						<p class="text-red-500">This action cannot be undone.</p>
					</div>
					<p>
						This will permanently delete the {showModalRemoveCollection.name} collection and all of its
						data.
					</p>
					<Input
						id="collection_name_delete"
						label="Type '{showModalRemoveCollection.name}' to confirm"
						type="text"
						required
						autocomplete={false}
						bind:value={collectionNameRemove}
					/>
					<div class="flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingRemoveCollection}
							height="h-10"
							on:click={(e) => {
								e.stopPropagation();
								unshowModalRemoveCollection();
							}}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveCollection}
							height="h-10"
							disable={collectionNameRemove !== showModalRemoveCollection.name}
							on:click={(e) => {
								e.stopPropagation();
								removeCollection(showModalRemoveCollection.id);
							}}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showModalCollection !== 'none'}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div
			on:click|stopPropagation={unshowModalCollection}
			class="fixed z-10 w-screen h-screen bg-black/20"
		>
			<form
				on:submit|preventDefault={collectionData.id.length > 0 ? editCollection : addCollection}
				on:click={(e) => e.stopPropagation()}
				class="absolute right-0 w-full h-full max-h-full max-w-2xl py-4 flex flex-col bg-white"
			>
				<div class="px-4">
					<p class="font-bold text-center text-2xl">
						{collectionData.id.length === 0 ? 'Create' : 'Edit'} Collection
					</p>
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
								bind:value={collectionData.name}
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
											<td class="p-1">
												<Settings class="w-5 h-5 mx-auto text-black/30" />
											</td>
										</tr>
										<tr>
											<td class="p-1">_created_by</td>
											<td class="p-1">uuid</td>
											<td class="p-1">
												<Settings class="w-5 h-5 mx-auto text-black/30" />
											</td>
										</tr>
										{#each collectionData.schemaFields as _, i}
											<tr>
												<td class="p-1">
													<input
														type="text"
														bind:value={collectionData.schemaFields[i].name}
														on:input={() => validateSchemaField(i)}
														title={collectionData.schemaFields[i]._internal.name_invalid ===
														'exists'
															? 'The schema field already exists.'
															: collectionData.schemaFields[i]._internal.name_invalid === 'format'
																? 'Incorrect schema field format.'
																: undefined}
														class="w-full px-1 border bg-transparent outline-none {collectionData
															.schemaFields[i]._internal.name_invalid === 'none'
															? 'border-black'
															: 'border-red-500 text-red-500'}"
													/>
												</td>
												<td class="p-1">
													<select
														bind:value={collectionData.schemaFields[i].kind}
														on:change={() =>
															(collectionData.schemaFields[i]._internal.kind_invalid = false)}
														title={collectionData.schemaFields[i]._internal.kind_invalid
															? 'Incorrect schema field type'
															: undefined}
														class="border bg-transparent outline-none {collectionData.schemaFields[
															i
														]._internal.kind_invalid
															? 'border-red-500'
															: 'border-black'}"
													>
														{#each supportedSchemaFields as ssf}
															<option>{ssf}</option>
														{/each}
													</select>
												</td>
												<td class="p-1 relative">
													<button
														type="button"
														on:click|stopPropagation={(e) => toggleShowSchemaFieldOpt(e, i)}
														class="block w-fit mx-auto"
													>
														<Settings class="w-5 h-5" />
													</button>
													{#if showSchemaFieldOpt.idx === i}
														<div
															class="w-40 p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm"
															class:top-full={showSchemaFieldOpt.position === 'bottom'}
															class:bottom-full={showSchemaFieldOpt.position === 'top'}
														>
															<button
																type="button"
																on:click|stopPropagation={() =>
																	(collectionData.schemaFields[i].required =
																		!collectionData.schemaFields[i].required)}
																class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
															>
																{#if collectionData.schemaFields[i].required}
																	<Checkbox class="w-5 h-5" />
																{:else}
																	<Square class="w-5 h-5" />
																{/if}
																<span>Required</span>
															</button>
															<button
																type="button"
																on:click|stopPropagation={() =>
																	(collectionData.schemaFields[i].indexed =
																		!collectionData.schemaFields[i].indexed)}
																class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
															>
																{#if collectionData.schemaFields[i].indexed}
																	<Checkbox class="w-5 h-5" />
																{:else}
																	<Square class="w-5 h-5" />
																{/if} <span>Indexed</span>
															</button>
															<button
																type="button"
																on:click|stopPropagation={() =>
																	(collectionData.schemaFields[i].auth_column =
																		!collectionData.schemaFields[i].auth_column)}
																class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
															>
																{#if collectionData.schemaFields[i].auth_column}
																	<Checkbox class="w-5 h-5" />
																{:else}
																	<Square class="w-5 h-5" />
																{/if} <span>Auth Column</span>
															</button>
															<button
																type="button"
																on:click|stopPropagation={() => removeSchemaField(i)}
																class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
															>
																<Trash class="w-5 h-5" />
																<span>Remove</span>
															</button>
														</div>
													{/if}
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
							disable={isLoadingAddEditCollection}
							height="h-10"
							on:click={(e) => {
								e.stopPropagation();
								unshowModalCollection();
							}}
							class="py-2 px-12"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							loading={isLoadingAddEditCollection}
							height="h-10"
							class="py-2 px-12"
						>
							{collectionData.id?.length === 0 ? 'Create' : 'Edit'}
						</Button>
					</div>
				</div>
			</form>
		</div>
	{/if}
{:else}
	<div class="flex-1 flex flex-col items-center justify-center">
		<Loading class="w-12 h-12 animate-spin" />
	</div>
{/if}
