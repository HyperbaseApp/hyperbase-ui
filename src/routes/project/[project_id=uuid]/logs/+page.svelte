<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import Button from '$lib/components/button/Button.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import InputCheckbox from '$lib/components/form/InputCheckbox.svelte';
	import Archive from '$lib/components/icon/Archive.svelte';
	import Copy from '$lib/components/icon/Copy.svelte';
	import Create from '$lib/components/icon/Create.svelte';
	import DocumentLock from '$lib/components/icon/DocumentLock.svelte';
	import DocumentText from '$lib/components/icon/DocumentText.svelte';
	import Folder from '$lib/components/icon/Folder.svelte';
	import Loading from '$lib/components/icon/Loading.svelte';
	import Send from '$lib/components/icon/Send.svelte';
	import Settings from '$lib/components/icon/Settings.svelte';
	import Trash from '$lib/components/icon/Trash.svelte';
	import Warning from '$lib/components/icon/Warning.svelte';
	import type { HyperbaseProject } from '$lib/hyperbase/hyperbase';
	import type Hyperbase from '$lib/hyperbase/hyperbase';
	import type { Log } from '$lib/types/log';
	import type { Pagination } from '$lib/types/pagination';
	import copyText from '$lib/utils/copyText';
	import errorHandler from '$lib/utils/errorHandler';
	import { getContext, onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	const hyperbase = getContext<Hyperbase>('hyperbase');
	let hyperbaseProject: HyperbaseProject;

	let logs: {
		pagination: Pagination;
		data: Log[];
	} = {
		pagination: {
			count: 0,
			total: 0
		},
		data: []
	};
	let projectNameRemove = '';

	let isLoadingInit = true;
	let isLoadingEditProject = false;
	let isLoadingTransferProject = false;
	let isLoadingDuplicateProject = false;
	let isLoadingRemoveProject = false;
	let isLoadingRefreshLogs = false;
	let isLoadingLoadMoreLogs = false;
	let showModalEditProject = {
		id: '',
		name: ''
	};
	let showModalTransferProject = {
		id: '',
		email: ''
	};
	let showModalDuplicateProject = {
		show: false,
		withRecords: false,
		withFiles: false
	};
	let showModalRemoveProject = false;
	let showProjectOpt = false;

	onMount(() => {
		(async () => {
			try {
				const projectId = $page.params.project_id;
				hyperbaseProject = await hyperbase.getProject(projectId);
				await refreshLogs();

				isLoadingInit = false;
			} catch (err) {
				const code = errorHandler(err);
				if (code === 0) {
					isLoadingInit = false;
				}
			}
		})();
	});

	async function editProject() {
		try {
			isLoadingEditProject = true;

			await hyperbaseProject.update(showModalEditProject.name);
			hyperbaseProject = await hyperbase.getProject(showModalEditProject.id);
			unshowModalEditProject(true);
			toast.success('Successfully updated the project');

			isLoadingEditProject = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingEditProject = false;
			}
		}
	}

	function unshowModalEditProject(force?: boolean) {
		if (!force && isLoadingEditProject) return;

		showModalEditProject = {
			id: '',
			name: ''
		};
	}

	async function transferProject() {
		try {
			isLoadingTransferProject = true;

			await hyperbaseProject.transfer(showModalTransferProject.email.toLowerCase().trim());
			unshowModalTransferProject(true);
			toast.success('Successfully transfer the project');
			goto(`${base}/projects`, { replaceState: true });

			isLoadingTransferProject = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingTransferProject = false;
			}
		}
	}

	function unshowModalTransferProject(force?: boolean) {
		if (!force && isLoadingTransferProject) return;

		showModalTransferProject = {
			id: '',
			email: ''
		};
	}

	async function duplicateProject() {
		try {
			isLoadingDuplicateProject = true;

			await hyperbaseProject.duplicate(
				showModalDuplicateProject.withFiles,
				showModalDuplicateProject.withRecords
			);
			unshowModalDuplicateProject(true);
			toast.success('Successfully duplicate the project');
			goto(`${base}/projects`, { replaceState: true });

			isLoadingDuplicateProject = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingDuplicateProject = false;
			}
		}
	}

	function unshowModalDuplicateProject(force?: boolean) {
		if (!force && isLoadingDuplicateProject) return;

		showModalDuplicateProject = {
			show: false,
			withRecords: false,
			withFiles: false
		};
	}

	async function removeProject() {
		try {
			isLoadingRemoveProject = true;

			await hyperbaseProject.delete();
			toast.success('Successfully removed the project');
			goto(`${base}/projects`);

			isLoadingRemoveProject = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRemoveProject = false;
			}
		}
	}

	function unshowModalRemoveProject(force?: boolean) {
		if (!force && isLoadingRemoveProject) return;

		projectNameRemove = '';
		showModalRemoveProject = false;
	}

	async function refreshLogs() {
		try {
			isLoadingRefreshLogs = true;

			const logsData: {
				pagination: Pagination;
				data: Log[];
			} = await hyperbaseProject.getManyLogs(undefined, 50);
			logs = logsData;

			isLoadingRefreshLogs = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRefreshLogs = false;
			}
		}
	}

	async function loadMoreLogs() {
		try {
			isLoadingLoadMoreLogs = true;

			const logsData: {
				pagination: Pagination;
				data: Log[];
			} = await hyperbaseProject.getManyLogs(logs.data.at(-1)?.id, 50);

			logs = {
				pagination: {
					...logs.pagination,
					count: logs.pagination.count + logsData.pagination.count
				},
				data: [...logs.data, ...logsData.data]
			};

			isLoadingLoadMoreLogs = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingLoadMoreLogs = false;
			}
		}
	}

	function copyTextToClipboard(text: string) {
		copyText(text);
		toast.success('Successfully copied to the clipboard');
	}
</script>

<svelte:head>
	{#if hyperbaseProject}
		<title>{hyperbaseProject.data.name} - Hyperbase UI</title>
	{/if}
</svelte:head>

{#if !isLoadingInit}
	<div class="mt-1 min-h-0 flex-1 flex items-stretch">
		<div class="w-60 flex flex-col border-r">
			{#if hyperbaseProject}
				<div class="px-2 mb-2">
					<div class="flex items-center justify-between gap-x-2">
						<h1 class="font-bold">{hyperbaseProject.data.name}</h1>
						<div class="py-1 relative flex items-center">
							<button
								type="button"
								on:click|stopPropagation={() => (showProjectOpt = !showProjectOpt)}
							>
								<Settings class="w-5 h-5" />
							</button>
							{#if showProjectOpt}
								<div
									class="p-2 absolute z-10 top-full right-0 border bg-white rounded-xl shadow-sm text-sm"
								>
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
											showModalTransferProject = {
												id: hyperbaseProject.data.id,
												email: ''
											};
										}}
										class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
									>
										<Send class="w-5 h-5" />
										<span>Transfer</span>
									</button>
									<button
										type="button"
										on:click|stopPropagation={() => {
											showProjectOpt = false;
											showModalDuplicateProject = {
												show: true,
												withFiles: false,
												withRecords: false
											};
										}}
										class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
									>
										<Copy class="w-5 h-5" />
										<span>Duplicate</span>
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
				<div class="border-b" />
				<div class="min-h-0 flex-1 flex items-stretch">
					<div class="border-r">
						<div>
							<a
								href="{base}/project/{$page.params.project_id}/collections"
								class="block py-2.5 px-1 hover:bg-neutral-100"
							>
								<DocumentText class="w-8 h-8" />
							</a>
							<a
								href="{base}/project/{$page.params.project_id}/buckets"
								class="block py-2.5 px-1 hover:bg-neutral-100"
							>
								<Folder class="w-8 h-8" />
							</a>
							<a
								href="{base}/project/{$page.params.project_id}/tokens"
								class="block py-2.5 px-1 hover:bg-neutral-100"
							>
								<DocumentLock class="w-8 h-8" />
							</a>
							<a
								href="{base}/project/{$page.params.project_id}/logs"
								class="block py-2.5 px-1 bg-neutral-200"
							>
								<Archive class="w-8 h-8" />
							</a>
						</div>
					</div>
				</div>
			{/if}
		</div>
		<div class="min-w-0 flex-1 flex flex-col">
			<h2 class="px-2 font-bold">Log</h2>
			{#if !isLoadingRefreshLogs}
				<div class="mt-2 flex-1 overflow-x-auto">
					<table>
						<thead>
							<tr>
								<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Timestamp</th>
								<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Kind</th>
								<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Message</th>
							</tr>
						</thead>
						<tbody>
							{#each logs.data as log}
								<tr class="hover:bg-neutral-100">
									<td class="py-1 px-2 text-sm">
										{new Date(log.created_at).toLocaleString()}
									</td>
									<td class="py-1 px-2 text-sm">
										{log.kind}
									</td>
									<td class="py-1 px-2 text-sm">
										{log.message}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if logs.pagination.count < logs.pagination.total}
						<button
							type="button"
							on:click|stopPropagation={loadMoreLogs}
							disabled={isLoadingLoadMoreLogs}
							class="block w-fit my-4 py-2 px-4 flex items-center gap-x-2 mx-auto border border-black rounded text-sm"
						>
							{#if isLoadingLoadMoreLogs}
								<Loading class="w-5 h-5 animate-spin" />
							{/if}
							Load more
						</button>
					{/if}
				</div>
			{:else}
				<div class="flex-1 flex flex-col items-center justify-center">
					<Loading class="w-12 h-12 animate-spin" />
				</div>
			{/if}
		</div>
	</div>

	{#if showModalEditProject.id.length > 0}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalEditProject()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
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
								on:click={() => unshowModalEditProject()}
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

	{#if showModalTransferProject.id.length > 0}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalTransferProject()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<form on:submit|preventDefault={transferProject}>
					<div>
						<p class="font-bold text-center text-2xl">Transfer Project</p>
					</div>
					<div class="mt-8 space-y-6">
						<Input
							id="project_admin_email"
							label="Admin email"
							type="text"
							required
							autocomplete={false}
							bind:value={showModalTransferProject.email}
						/>
						<div class="flex gap-x-2">
							<Button
								type="button"
								kind="secondary"
								disable={isLoadingTransferProject}
								height="h-10"
								on:click={() => unshowModalTransferProject()}
							>
								Cancel
							</Button>
							<Button type="submit" loading={isLoadingTransferProject} height="h-10">
								Transfer
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showModalDuplicateProject.show}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalDuplicateProject()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<form on:submit|preventDefault={duplicateProject}>
					<div>
						<p class="font-bold text-center text-2xl">Duplicate Project</p>
					</div>
					<div class="mt-8 space-y-6">
						<InputCheckbox
							on:click={() =>
								(showModalDuplicateProject.withRecords = !showModalDuplicateProject.withRecords)}
							checked={showModalDuplicateProject.withRecords}
							label="Duplicate records"
							text="Copy all records to a new collection in a new project"
						/>
						<InputCheckbox
							on:click={() =>
								(showModalDuplicateProject.withFiles = !showModalDuplicateProject.withFiles)}
							checked={showModalDuplicateProject.withFiles}
							label="Duplicate files"
							text="Copy all files to a new bucket in a new project"
						/>
						<div class="flex gap-x-2">
							<Button
								type="button"
								kind="secondary"
								disable={isLoadingDuplicateProject}
								height="h-10"
								on:click={() => unshowModalDuplicateProject()}
							>
								Cancel
							</Button>
							<Button type="submit" loading={isLoadingDuplicateProject} height="h-10">
								Duplicate
							</Button>
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
			on:click|stopPropagation={() => unshowModalRemoveProject()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
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
							on:click={() => unshowModalRemoveProject()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveProject}
							height="h-10"
							disable={projectNameRemove !== hyperbaseProject.data.name}
							on:click={() => removeProject()}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div class="flex-1 flex flex-col items-center justify-center">
		<Loading class="w-12 h-12 animate-spin" />
	</div>
{/if}
