<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import type { HyperbaseBucket, HyperbaseProject } from '$lib/hyperbase/hyperbase';
	import type Hyperbase from '$lib/hyperbase/hyperbase';
	import type { Bucket } from '$lib/types/bucket';
	import type { File as TFile } from '$lib/types/file';
	import type { Pagination } from '$lib/types/pagination';
	import Copy from '$lib/components/icon/Copy.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import copyText from '$lib/utils/copyText';
	import errorHandler from '$lib/utils/errorHandler';
	import Input from '$lib/components/form/Input.svelte';
	import Trash from '$lib/components/icon/Trash.svelte';
	import Warning from '$lib/components/icon/Warning.svelte';
	import Settings from '$lib/components/icon/Settings.svelte';
	import EllipsisHorizontal from '$lib/components/icon/EllipsisHorizontal.svelte';
	import Create from '$lib/components/icon/Create.svelte';
	import Loading from '$lib/components/icon/Loading.svelte';
	import Save from '$lib/components/icon/Save.svelte';
	import CloseCircle from '$lib/components/icon/CloseCircle.svelte';
	import DocumentText from '$lib/components/icon/DocumentText.svelte';
	import DocumentLock from '$lib/components/icon/DocumentLock.svelte';
	import Folder from '$lib/components/icon/Folder.svelte';
	import formatFileSize from '$lib/utils/formatFileSize';
	import CloudDownload from '$lib/components/icon/CloudDownload.svelte';
	import Send from '$lib/components/icon/Send.svelte';
	import InputCheckbox from '$lib/components/form/InputCheckbox.svelte';
	import Archive from '$lib/components/icon/Archive.svelte';
	import Checkbox from '$lib/components/icon/Checkbox.svelte';
	import Square from '$lib/components/icon/Square.svelte';

	const hyperbase = getContext<Hyperbase>('hyperbase');
	let hyperbaseProject: HyperbaseProject;

	let abortRefreshSelectedBucketController: AbortController;
	let abortUploadFileController: AbortController;

	let buckets: Bucket[] = [];
	let files: {
		pagination: Pagination;
		data: TFile[];
	} = {
		pagination: {
			count: 0,
			total: 0
		},
		data: []
	};

	let selectedBucketData = {
		id: '',
		name: ''
	};
	let selectedBucket: HyperbaseBucket | undefined = undefined;
	let bucketData: BucketData = {
		id: '',
		name: '',
		optTTL: ''
	};
	let inputFile: HTMLInputElement;
	let projectNameRemove = '';
	let bucketNameRemove = '';

	let isLoadingInit = true;
	let isLoadingEditProject = false;
	let isLoadingTransferProject = false;
	let isLoadingDuplicateProject = false;
	let isLoadingRemoveProject = false;
	let isLoadingRefreshBuckets = false;
	let isLoadingRefreshFiles = false;
	let isLoadingRefreshSelectedBucket = false;
	let isLoadingAddEditBucket = false;
	let isLoadingRemoveBucket = false;
	let isLoadingAddFile = false;
	let isLoadingEditFile = false;
	let isLoadingRemoveFile = false;
	let isLoadingLoadMoreFiles = false;
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
	let showModalRemoveBucket = {
		id: '',
		name: ''
	};
	let showModalBucket: 'add' | 'edit' | 'none' = 'none';
	let showProjectOpt = false;
	let showBucketOpt: {
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
	let showFileOpt: {
		id: string;
		action: 'none' | 'option' | 'remove' | 'edit';
		optPosition: 'top' | 'bottom';
		editData: {
			createdBy: string;
			name: string;
			public: boolean;
		};
	} = {
		id: '',
		action: 'none',
		optPosition: 'top',
		editData: {
			createdBy: '',
			name: '',
			public: false
		}
	};
	let showAddFileData: {
		show: boolean;
		data: { file: File; fileName: string };
	} = {
		show: false,
		data: {
			file: new File([], ''),
			fileName: ''
		}
	};

	onMount(() => {
		(async () => {
			try {
				const projectId = $page.params.project_id;
				hyperbaseProject = await hyperbase.getProject({ id: projectId });
				refreshBuckets();

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

			await hyperbaseProject.update({ name: showModalEditProject.name.trim() });
			hyperbaseProject = await hyperbase.getProject({ id: showModalEditProject.id });
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

			await hyperbaseProject.transfer({
				adminEmail: showModalTransferProject.email.toLowerCase().trim()
			});
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

			await hyperbaseProject.duplicate({
				withRecords: showModalDuplicateProject.withRecords,
				withFiles: showModalDuplicateProject.withFiles
			});
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

	async function refreshBuckets() {
		try {
			isLoadingRefreshBuckets = true;

			const bucketsData: Bucket[] = await hyperbaseProject.getAllBuckets();
			bucketsData.sort((a, b) => {
				const lowerA = a.name.toLocaleLowerCase();
				const lowerB = b.name.toLocaleLowerCase();
				return lowerA > lowerB ? 1 : lowerA === lowerB ? 0 : -1;
			});
			buckets = bucketsData;

			isLoadingRefreshBuckets = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRefreshBuckets = false;
			}
		}
	}

	function copyTextToClipboard(text: string) {
		copyText(text);
		toast.success('Successfully copied to the clipboard');
	}

	async function uploadFile() {
		if (!selectedBucket) return;

		if (inputFile.files) {
			isLoadingAddFile = true;
			try {
				if (abortUploadFileController) {
					abortUploadFileController.abort();
				}

				abortUploadFileController = new AbortController();

				const uploadPromises = [];
				for (const file of inputFile.files) {
					uploadPromises.push(
						selectedBucket.insertOneFile(abortUploadFileController.signal, {
							file: file,
							fileName: file.name.trim()
						})
					);
				}
				await Promise.all(uploadPromises);
			} catch (err) {
				errorHandler(err);
			}
			refreshFiles(null);
			isLoadingAddFile = false;
		}
		inputFile.value = '';
	}

	function toggleShowBucketOpt(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		id: string
	) {
		showBucketOpt.id = showBucketOpt.id === id ? '' : id;
		if (showBucketOpt.id.length > 0) {
			if (e.clientY + 125 > document.documentElement.clientHeight) {
				showBucketOpt.position = 'top';
			} else {
				showBucketOpt.position = 'bottom';
			}
		}
	}

	async function selectBucket(bucket: Bucket) {
		selectedBucketData = {
			id: bucket.id,
			name: bucket.name
		};

		showProjectOpt = false;
		showBucketOpt.id = '';
		showFileOpt.id = '';
		showFileOpt.action = 'none';
		showAddFileData = {
			show: false,
			data: {
				file: new File([], ''),
				fileName: ''
			}
		};

		try {
			isLoadingRefreshSelectedBucket = true;

			if (abortRefreshSelectedBucketController) {
				abortRefreshSelectedBucketController.abort();
			}

			abortRefreshSelectedBucketController = new AbortController();
			const hyperbaseBucket = await hyperbaseProject.getBucket(
				abortRefreshSelectedBucketController.signal,
				{ id: bucket.id }
			);

			selectedBucket = hyperbaseBucket;
			await refreshFiles(abortRefreshSelectedBucketController.signal);

			isLoadingRefreshSelectedBucket = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRefreshSelectedBucket = false;
			}
		}
	}

	async function addBucket() {
		try {
			isLoadingAddEditBucket = true;

			await hyperbaseProject.createBucket({
				name: bucketData.name.trim(),
				optTTL: bucketData.optTTL ? Number(bucketData.optTTL) : null
			});
			unshowModalBucket(true);
			toast.success('Successfully added a bucket');
			await refreshBuckets();

			isLoadingAddEditBucket = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddEditBucket = false;
			}
		}
	}

	async function editBucket() {
		try {
			isLoadingAddEditBucket = true;

			const hyperbaseBucket = await hyperbaseProject.getBucket(null, { id: bucketData.id });
			await hyperbaseBucket.update({
				name: bucketData.name.trim(),
				optTTL: bucketData.optTTL ? Number(bucketData.optTTL) : null
			});
			if (bucketData.id === selectedBucketData.id) {
				selectedBucketData = {
					id: selectedBucketData.id,
					name: bucketData.name.trim()
				};
			}
			unshowModalBucket(true);
			toast.success('Successfully updated the bucket');
			refreshBuckets();
			if (bucketData.id === selectedBucket?.data.id) {
				selectedBucket = await hyperbaseProject.getBucket(null, { id: selectedBucket.data.id });
			}

			isLoadingAddEditBucket = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddEditBucket = false;
			}
		}
	}

	async function removeBucket(id: string) {
		try {
			isLoadingRemoveBucket = true;

			const hyperbaseBucket = await hyperbaseProject.getBucket(null, { id: id });
			await hyperbaseBucket.delete();
			selectedBucket = undefined;
			unshowModalRemoveBucket(true);
			toast.success('Successfully removed the bucket');
			selectedBucketData = {
				id: '',
				name: ''
			};
			selectedBucket = undefined;
			refreshBuckets();

			isLoadingRemoveBucket = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRemoveBucket = false;
			}
		}
	}

	function unshowModalRemoveBucket(force?: boolean) {
		if (!force && isLoadingRemoveBucket) return;

		bucketNameRemove = '';
		showModalRemoveBucket = { id: '', name: '' };
	}

	function showModalEditBucket(id: string) {
		let editBucket = buckets.find((b) => b.id === id);
		if (!editBucket) return;

		let editBucketData: BucketData = {
			id: editBucket.id,
			name: editBucket.name,
			optTTL: editBucket.opt_ttl ? editBucket.opt_ttl.toString() : ''
		};

		bucketData = editBucketData;
		showBucketOpt.id = '';
		showModalBucket = 'edit';
		unshowAddFile(true);
	}

	function unshowModalBucket(force?: boolean) {
		if (!force && isLoadingAddEditBucket) return;

		bucketData = {
			id: '',
			name: '',
			optTTL: ''
		};
		showSchemaFieldOpt.idx = -1;
		showModalBucket = 'none';
	}

	async function refreshFiles(abortSignal: AbortSignal | null) {
		if (selectedBucket) {
			try {
				isLoadingRefreshFiles = true;

				const filesData: {
					pagination: Pagination;
					data: TFile[];
				} = await selectedBucket.findManyFiles(abortSignal, { beforeId: undefined, limit: 15 });
				files = filesData;

				isLoadingRefreshFiles = false;
			} catch (err) {
				const code = errorHandler(err);
				if (code === 0) {
					isLoadingRefreshFiles = false;
				}
			}
		} else {
			files = {
				pagination: {
					count: 0,
					total: 0
				},
				data: []
			};
		}
	}

	async function loadMoreFiles() {
		if (!selectedBucket) return;
		try {
			isLoadingLoadMoreFiles = true;

			const filesData: {
				pagination: Pagination;
				data: TFile[];
			} = await selectedBucket.findManyFiles(null, { beforeId: files.data.at(-1)?.id, limit: 15 });

			files = {
				pagination: {
					...files.pagination,
					count: files.pagination.count + filesData.pagination.count
				},
				data: [...files.data, ...filesData.data]
			};

			isLoadingLoadMoreFiles = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingLoadMoreFiles = false;
			}
		}
	}

	function toggleShowFileOpt(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		file: {
			id: string;
			createdBy: string;
			name: string;
			public: boolean;
		}
	) {
		if (isLoadingEditFile) return;

		showFileOpt.id = showFileOpt.id === file.id ? '' : file.id;
		if (showFileOpt.id.length > 0) {
			showFileOpt.action = 'option';
			showFileOpt.editData = file;
			if (e.clientY + 125 > document.documentElement.clientHeight) {
				showFileOpt.optPosition = 'top';
			} else {
				showFileOpt.optPosition = 'bottom';
			}
		} else {
			showFileOpt.action = 'none';
			showFileOpt.editData = {
				createdBy: '',
				name: '',
				public: false
			};
		}
	}

	function unshowAddFile(force?: boolean) {
		if (!force && isLoadingAddFile) return;

		showAddFileData = {
			show: false,
			data: {
				file: new File([], ''),
				fileName: ''
			}
		};
	}

	function unshowFileOpt(force?: boolean) {
		if (!force && isLoadingRemoveFile) return;

		showFileOpt = {
			id: '',
			action: 'none',
			optPosition: 'top',
			editData: {
				createdBy: '',
				name: '',
				public: false
			}
		};
	}

	async function editFile() {
		if (!selectedBucket || isLoadingEditFile) return;

		try {
			isLoadingEditFile = true;

			await selectedBucket.updateOneFile({
				id: showFileOpt.id,
				createdBy: showFileOpt.editData.createdBy.trim(),
				fileName: showFileOpt.editData.name.trim(),
				public: showFileOpt.editData.public
			});
			unshowFileOpt(true);
			toast.success('Successfully updated the file');
			refreshFiles(null);

			isLoadingEditFile = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingEditFile = false;
			}
		}
	}

	async function removeFile() {
		if (!selectedBucket) return;

		try {
			isLoadingRemoveFile = true;

			await selectedBucket.deleteOneFile({ id: showFileOpt.id });
			unshowFileOpt(true);
			toast.success('Successfully removed the file');
			refreshFiles(null);

			isLoadingRemoveFile = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRemoveFile = false;
			}
		}
	}

	function escape() {
		showProjectOpt = false;
		if (showSchemaFieldOpt.idx >= 0) {
			showSchemaFieldOpt.idx = -1;
			return;
		}
		if (showModalBucket !== 'none') {
			unshowModalBucket();
			return;
		}
		if (showModalRemoveProject) {
			unshowModalRemoveProject();
			return;
		}
		if (showModalEditProject.id.length > 0) {
			unshowModalEditProject();
			return;
		}
		if (showModalRemoveBucket.id.length > 0) {
			unshowModalRemoveBucket();
			return;
		}
		{
			let escaped = false;
			if (showBucketOpt.id.length > 0) {
				showBucketOpt.id = '';
				escaped = true;
			}
			if (showFileOpt.id.length > 0) {
				showFileOpt.id = '';
				showFileOpt.action = 'none';
				escaped = true;
			}
			if (showAddFileData.show) {
				showAddFileData = {
					show: false,
					data: {
						file: new File([], ''),
						fileName: ''
					}
				};
			}
			if (escaped) {
				return;
			}
		}
		selectedBucketData = {
			id: '',
			name: ''
		};
		selectedBucket = undefined;
	}

	interface BucketData {
		id: string;
		name: string;
		optTTL: string;
	}
</script>

<svelte:head>
	{#if hyperbaseProject}
		<title>{hyperbaseProject.data.name} - Hyperbase UI</title>
	{/if}
</svelte:head>

<svelte:window on:keydown={(e) => (e.code === 'Escape' ? escape() : undefined)} />

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
								class="block py-2.5 px-1 bg-neutral-200"
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
								class="block py-2.5 px-1 hover:bg-neutral-100"
							>
								<Archive class="w-8 h-8" />
							</a>
						</div>
					</div>
					<div class="mt-2 px-2 min-w-0 flex-1 flex flex-col">
						<Button
							type="button"
							height="h-8"
							class="text-sm"
							on:click={() => (showModalBucket = 'add')}
						>
							New Bucket
						</Button>
						{#if !isLoadingRefreshBuckets}
							<div class="mt-2 min-h-0 flex-1 rounded overflow-hidden">
								<div class="h-full overflow-y-auto">
									{#each buckets as bucket}
										<div class="relative">
											<button
												type="button"
												on:click|stopPropagation={() => selectBucket(bucket)}
												title={bucket.name}
												class="w-full py-1 px-2 flex items-center justify-between {selectedBucketData.id ===
												bucket.id
													? 'bg-neutral-200'
													: 'hover:bg-neutral-100'} text-sm text-left rounded"
											>
												<span class="truncate">{bucket.name}</span>
												<button
													type="button"
													on:click|stopPropagation={(e) => toggleShowBucketOpt(e, bucket.id)}
												>
													<EllipsisHorizontal class="w-4 h-4" /></button
												>
											</button>
											{#if showBucketOpt.id === bucket.id}
												<div
													class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm text-sm"
													class:top-full={showBucketOpt.position === 'bottom'}
													class:bottom-full={showBucketOpt.position === 'top'}
												>
													<button
														type="button"
														on:click|stopPropagation={() => showModalEditBucket(bucket.id)}
														class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
													>
														<Create class="w-5 h-5" />
														<span>Edit</span>
													</button>
													<button
														type="button"
														on:click|stopPropagation={() => {
															showBucketOpt.id = '';
															showModalRemoveBucket = {
																id: bucket.id,
																name: bucket.name
															};
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
						{:else}
							<div class="flex-1 flex flex-col items-center justify-center">
								<Loading class="w-12 h-12 animate-spin" />
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
		<div class="min-w-0 flex-1 flex flex-col">
			<h2 class="px-2 font-bold">
				Bucket{#if selectedBucketData}&nbsp;<span class="truncate">{selectedBucketData.name}</span>
				{/if}
			</h2>
			{#if !isLoadingRefreshBuckets}
				{#if selectedBucketData.id}
					{#if !isLoadingRefreshSelectedBucket}
						<div class="px-2 flex items-center gap-x-2">
							<h2>ID: {selectedBucketData.id}</h2>
							<button
								type="button"
								on:click|stopPropagation={() => copyTextToClipboard(selectedBucket?.data.id ?? '')}
							>
								<Copy class="w-5 h-5" />
							</button>
						</div>
						<div class="min-h-0 mt-2 flex-1 flex flex-col">
							{#if selectedBucket && !isLoadingRefreshSelectedBucket && !isLoadingRefreshFiles}
								<div class="px-2 flex gap-x-2 items-center">
									<input
										type="file"
										bind:this={inputFile}
										on:change={uploadFile}
										multiple
										class="hidden"
									/>
									<button
										type="button"
										on:click|stopPropagation={() => inputFile.click()}
										class="block w-fit px-4 py-1 flex items-center gap-x-2 border-2 border-black hover:bg-gray-300 rounded font-bold text-sm"
									>
										{#if isLoadingAddFile}
											<Loading class="w-5 h-5 animate-spin" />
										{/if}
										<span>Upload a file</span>
									</button>
								</div>
								<div class="mt-2 flex-1 overflow-x-auto">
									<table>
										<thead>
											<tr>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">ID</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Created By</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Created At</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Updated At</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">File Name</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Content Type</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Size</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Public</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Options</th>
											</tr>
										</thead>
										<tbody>
											{#each files.data as file}
												<tr class="hover:bg-neutral-100">
													<td class="py-1 px-2 text-sm">
														{file.id}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showFileOpt.id === file.id && showFileOpt.action === 'edit'}
															<input
																type="text"
																bind:value={showFileOpt.editData.createdBy}
																size="1"
																class="w-full py-px px-1 border border-black bg-transparent outline-none"
															/>
														{:else}
															{file.created_by}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{file.created_at}
													</td>
													<td class="py-1 px-2 text-sm">
														{file.updated_at}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showFileOpt.id === file.id && showFileOpt.action === 'edit'}
															<input
																type="text"
																bind:value={showFileOpt.editData.name}
																size="1"
																class="w-full py-px px-1 border border-black bg-transparent outline-none"
															/>
														{:else}
															{file.file_name}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{file.content_type}
													</td>
													<td class="py-1 px-2 text-sm">
														{formatFileSize(file.size)}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showFileOpt.id === file.id && showFileOpt.action === 'edit'}
															<button
																type="button"
																on:click|preventDefault={() =>
																	(showFileOpt.editData.public = !showFileOpt.editData.public)}
															>
																{#if showFileOpt.editData.public}
																	<Checkbox class="w-6 h-6" />
																{:else}
																	<Square class="w-6 h-6" />
																{/if}
															</button>
														{:else if file.public}
															<Checkbox class="w-5 h-5" />
														{:else}
															<Square class="w-5 h-5" />
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														<div class="py-1 relative">
															{#if showFileOpt.id === file.id && showFileOpt.action === 'edit'}
																<div class="w-fit mx-auto flex gap-x-2">
																	<button
																		type="button"
																		on:click|stopPropagation={editFile}
																		disabled={isLoadingEditFile}
																	>
																		{#if !isLoadingEditFile}
																			<Save class="w-5 h-5" />
																		{:else}
																			<Loading class="w-5 h-5 animate-spin" />
																		{/if}
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={(e) =>
																			toggleShowFileOpt(e, {
																				id: file.id,
																				createdBy: file.created_by,
																				name: file.file_name,
																				public: file.public
																			})}
																	>
																		<CloseCircle class="w-5 h-5" />
																	</button>
																</div>
															{:else}
																<div class="w-fit mx-auto flex gap-x-2">
																	<a
																		href={selectedBucket.getDownloadFileUrl(file.id, file.public)}
																		target="_blank"
																	>
																		<CloudDownload class="w-5 h-5" />
																	</a>
																	<button
																		type="button"
																		on:click|stopPropagation={(e) =>
																			toggleShowFileOpt(e, {
																				id: file.id,
																				createdBy: file.created_by,
																				name: file.file_name,
																				public: file.public
																			})}
																		class="block w-fit mx-auto"
																	>
																		<Settings class="w-5 h-5" />
																	</button>
																</div>
															{/if}
															{#if showFileOpt.id === file.id && showFileOpt.action === 'option'}
																<div
																	class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm"
																	class:top-full={showFileOpt.optPosition === 'bottom'}
																	class:bottom-full={showFileOpt.optPosition === 'top'}
																>
																	<button
																		type="button"
																		on:click|stopPropagation={() => {
																			unshowAddFile();
																			showFileOpt.action = 'edit';
																		}}
																		class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
																	>
																		<Create class="w-5 h-5" />
																		<span>Edit</span>
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={() => (showFileOpt.action = 'remove')}
																		class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
																	>
																		<Trash class="w-5 h-5" />
																		<span>Remove</span>
																	</button>
																</div>
															{/if}
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
									{#if files.pagination.count < files.pagination.total}
										<button
											type="button"
											on:click|stopPropagation={loadMoreFiles}
											disabled={isLoadingLoadMoreFiles}
											class="block w-fit my-4 py-2 px-4 flex items-center gap-x-2 mx-auto border border-black rounded text-sm"
										>
											{#if isLoadingLoadMoreFiles}
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
					{:else}
						<div class="flex-1 flex flex-col items-center justify-center">
							<Loading class="w-12 h-12 animate-spin" />
						</div>
					{/if}
				{:else}
					<div class="flex-1 flex items-center justify-center">
						<div class="max-w-96 p-4 border rounded">
							<p class="font-bold text-lg">Bucket</p>
							<p class="mt-2.5">
								{#if buckets.length > 0}
									Select a bucket from the navigation panel on the left to views its data, or create
									a new one.
								{:else}
									Create buckets to store and serve any type of digital content.
								{/if}
							</p>
							<div class="mt-4">
								<Button type="button" height="h-10" on:click={() => (showModalBucket = 'add')}>
									Create a new bucket
								</Button>
							</div>
						</div>
					</div>
				{/if}
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

	{#if showModalRemoveBucket.id.length > 0}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalRemoveBucket()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<div>
					<p class="font-bold text-center text-2xl">Remove Bucket</p>
				</div>
				<div class="mt-6 space-y-6">
					<div class="flex items-center gap-x-2">
						<Warning class="w-8 h-8 text-red-500" />
						<p class="text-red-500">This action cannot be undone.</p>
					</div>
					<p>
						This will permanently delete the {showModalRemoveBucket.name} bucket and all of its data.
					</p>
					<Input
						id="bucket_name_delete"
						label="Type '{showModalRemoveBucket.name}' to confirm"
						type="text"
						required
						autocomplete={false}
						bind:value={bucketNameRemove}
					/>
					<div class="flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingRemoveBucket}
							height="h-10"
							on:click={() => unshowModalRemoveBucket()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveBucket}
							height="h-10"
							disable={bucketNameRemove !== showModalRemoveBucket.name}
							on:click={() => removeBucket(showModalRemoveBucket.id)}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showFileOpt.action === 'remove'}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowFileOpt()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<div>
					<p class="font-bold text-center text-2xl">Remove File</p>
				</div>
				<div class="mt-6 space-y-6">
					<div class="flex items-center gap-x-2">
						<Warning class="w-8 h-8 text-red-500" />
						<p class="text-red-500">This action cannot be undone.</p>
					</div>
					<p>Are you sure you want to delete the selected file?</p>
					<div class="flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingRemoveFile}
							height="h-10"
							on:click={() => unshowFileOpt()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveFile}
							height="h-10"
							on:click={() => removeFile()}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showModalBucket !== 'none'}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalBucket()}
			class="fixed z-20 w-screen h-screen bg-black/20"
		>
			<form
				on:submit|preventDefault={bucketData.id.length > 0 ? editBucket : addBucket}
				on:click={(e) => e.stopPropagation()}
				class="absolute right-0 w-full h-full max-h-full max-w-2xl py-4 flex flex-col bg-white"
			>
				<div class="px-4">
					<p class="font-bold text-center text-2xl">
						{bucketData.id.length === 0 ? 'Create' : 'Edit'} Bucket
					</p>
				</div>
				<div class="min-h-0 flex-1 flex flex-col mt-8">
					<div class="min-h-0 h-full px-4 overflow-y-auto">
						<div>
							<Input
								id="bucket_name"
								label="Name"
								type="text"
								required
								autocomplete={false}
								bind:value={bucketData.name}
							/>
						</div>
						<div class="mt-6">
							<Input
								id="ttl"
								label="Time-to-live"
								type="text"
								bind:value={bucketData.optTTL}
								validateInput={(val) => !isNaN(Number(val))}
								autocomplete={false}
								suffix="seconds"
							/>
						</div>
					</div>
					<div class="w-fit mt-auto ml-auto pt-4 px-4 flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingAddEditBucket}
							height="h-10"
							on:click={() => unshowModalBucket()}
							class="py-2 px-12"
						>
							Cancel
						</Button>
						<Button type="submit" loading={isLoadingAddEditBucket} height="h-10" class="py-2 px-12">
							{bucketData.id?.length === 0 ? 'Create' : 'Edit'}
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
