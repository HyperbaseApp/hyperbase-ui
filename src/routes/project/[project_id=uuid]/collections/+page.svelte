<script lang="ts">
	import type { HyperbaseCollection, HyperbaseProject } from '$lib/hyperbase/hyperbase';
	import type Hyperbase from '$lib/hyperbase/hyperbase';
	import type { Collection, SchemaField, SchemaFieldKind } from '$lib/types/collection';
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
	import Save from '$lib/components/icon/Save.svelte';
	import CloseCircle from '$lib/components/icon/CloseCircle.svelte';
	import { convertTimestampToDatetimeLocal, formatSchemaFieldData } from '$lib/utils/converter';
	import DocumentText from '$lib/components/icon/DocumentText.svelte';
	import DocumentLock from '$lib/components/icon/DocumentLock.svelte';
	import Folder from '$lib/components/icon/Folder.svelte';
	import InputCheckbox from '$lib/components/form/InputCheckbox.svelte';
	import Send from '$lib/components/icon/Send.svelte';
	import type { Pagination } from '$lib/types/pagination';
	import Archive from '$lib/components/icon/Archive.svelte';

	const hyperbase = getContext<Hyperbase>('hyperbase');
	let hyperbaseProject: HyperbaseProject;

	let abortSelectCollectionController: AbortController;

	let collections: Collection[] = [];
	let records: {
		pagination: Pagination;
		data: { [field: string]: any }[];
	} = {
		pagination: {
			count: 0,
			total: 0
		},
		data: []
	};

	let selectedCollectionData = {
		id: '',
		name: ''
	};
	let selectedCollection: HyperbaseCollection | undefined = undefined;
	let collectionData: CollectionData = {
		id: '',
		name: '',
		schemaFields: [],
		optAuthColumnId: false
	};
	let supportedSchemaFields: string[];
	let projectNameRemove = '';
	let collectionNameRemove = '';
	let listenChangeRecordState: 'off' | 'error' | 'active' = 'off';

	let isLoadingInit = true;
	let isLoadingEditProject = false;
	let isLoadingTransferProject = false;
	let isLoadingDuplicateProject = false;
	let isLoadingRemoveProject = false;
	let isLoadingRefreshCollections = false;
	let isLoadingRefreshRecords = false;
	let isLoadingRefreshSelectedCollection = false;
	let isLoadingAddEditCollection = false;
	let isLoadingRemoveCollection = false;
	let isLoadingAddRecord = false;
	let isLoadingEditRecord = false;
	let isLoadingRemoveRecord = false;
	let isLoadingLoadMoreRecords = false;
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
	let showRecordOpt: {
		id: string;
		action: 'none' | 'option' | 'remove' | 'edit';
		optPosition: 'top' | 'bottom';
		editData: {
			[field: string]: any;
		};
	} = {
		id: '',
		action: 'none',
		optPosition: 'top',
		editData: {}
	};
	let showAddRecordData: {
		show: boolean;
		data: { [field: string]: any };
	} = {
		show: false,
		data: {}
	};

	onMount(() => {
		(async () => {
			try {
				const projectId = $page.params.project_id;
				hyperbaseProject = await hyperbase.getProject(projectId);
				refreshCollections();
				supportedSchemaFields = await hyperbase.getInfoAllSupportedSchemaFields();

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

			await hyperbaseProject.update(showModalEditProject.name.trim());
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

	async function refreshCollections() {
		try {
			isLoadingRefreshCollections = true;

			const collectionsData: Collection[] = await hyperbaseProject.getAllCollections();
			collectionsData.sort((a, b) => {
				const lowerA = a.name.toLocaleLowerCase();
				const lowerB = b.name.toLocaleLowerCase();
				return lowerA > lowerB ? 1 : lowerA === lowerB ? 0 : -1;
			});
			collections = collectionsData;

			isLoadingRefreshCollections = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRefreshCollections = false;
			}
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

	async function selectCollection(collection: Collection) {
		stopRealtimeRecord();
		selectedCollectionData = {
			id: collection.id,
			name: collection.name
		};

		showProjectOpt = false;
		showCollectionOpt.id = '';
		showRecordOpt.id = '';
		showRecordOpt.action = 'none';
		showAddRecordData = {
			show: false,
			data: {}
		};

		try {
			if (abortSelectCollectionController) {
				abortSelectCollectionController.abort();
			}

			isLoadingRefreshSelectedCollection = true;

			abortSelectCollectionController = new AbortController();
			const hyperbaseCollection = await hyperbaseProject.getCollection(
				abortSelectCollectionController.signal,
				collection.id
			);

			selectedCollection = hyperbaseCollection;
			await refreshRecords(abortSelectCollectionController.signal);

			isLoadingRefreshSelectedCollection = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRefreshSelectedCollection = false;
			}
		}
	}

	async function addCollection() {
		let schemaFields: SchemaField = {};
		for (const field of collectionData.schemaFields) {
			if (field._internal.invalidName !== 'none') return;
			if (field.kind === '') return;
			schemaFields[field.name.trim()] = {
				kind: field.kind,
				required: field.required,
				indexed: field.indexed,
				unique: field.unique,
				auth_column: field.authColumn
			};
		}

		try {
			isLoadingAddEditCollection = true;

			await hyperbaseProject.createCollection({
				name: collectionData.name.trim(),
				schemaFields,
				optAuthColumnId: collectionData.optAuthColumnId
			});
			unshowModalCollection(true);
			toast.success('Successfully added a collection');
			await refreshCollections();

			isLoadingAddEditCollection = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddEditCollection = false;
			}
		}
	}

	async function editCollection() {
		let schemaFields: {
			[field: string]: {
				kind: string;
				required?: boolean;
				indexed?: boolean;
				unique?: boolean;
				auth_column?: boolean;
			};
		} = {};
		for (const field of collectionData.schemaFields) {
			if (field._internal.invalidName !== 'none') {
				return;
			}
			schemaFields[field.name.trim()] = {
				kind: field.kind,
				required: field.required,
				indexed: field.indexed,
				unique: field.unique,
				auth_column: field.authColumn
			};
		}

		try {
			isLoadingAddEditCollection = true;

			const hyperbaseCollection = await hyperbaseProject.getCollection(null, collectionData.id);
			await hyperbaseCollection.update({
				name: collectionData.name.trim(),
				schemaFields,
				optAuthColumnId: collectionData.optAuthColumnId
			});
			if (collectionData.id === selectedCollectionData.id) {
				selectedCollectionData = {
					id: selectedCollectionData.id,
					name: collectionData.name.trim()
				};
			}
			unshowModalCollection(true);
			toast.success('Successfully updated the collection');
			refreshCollections();
			if (collectionData.id === selectedCollection?.data.id) {
				selectedCollection = await hyperbaseProject.getCollection(null, selectedCollection.data.id);
			}

			isLoadingAddEditCollection = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddEditCollection = false;
			}
		}
	}

	async function removeCollection(id: string) {
		try {
			isLoadingRemoveCollection = true;

			const hyperbaseCollection = await hyperbaseProject.getCollection(null, id);
			await hyperbaseCollection.delete();
			selectedCollection = undefined;
			unshowModalRemoveCollection(true);
			toast.success('Successfully removed the collection');
			selectedCollectionData = {
				id: '',
				name: ''
			};
			selectedCollection = undefined;
			refreshCollections();

			isLoadingRemoveCollection = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRemoveCollection = false;
			}
		}
	}

	function unshowModalRemoveCollection(force?: boolean) {
		if (!force && isLoadingRemoveCollection) return;

		collectionNameRemove = '';
		showModalRemoveCollection = { id: '', name: '' };
	}

	function showModalEditCollection(id: string) {
		let editCollection = collections.find((c) => c.id === id);
		if (!editCollection) return;

		let editCollectionData: CollectionData = {
			id: editCollection.id,
			name: editCollection.name,
			schemaFields: [],
			optAuthColumnId: editCollection.opt_auth_column_id
		};
		for (const [field, props] of Object.entries(editCollection.schema_fields)) {
			editCollectionData.schemaFields.push({
				name: field,
				kind: props.kind,
				required: props.required,
				indexed: props.indexed,
				unique: props.unique,
				authColumn: props.auth_column,
				_internal: {
					invalidName: 'none',
					invalidKind: false
				}
			});
		}

		collectionData = editCollectionData;
		showCollectionOpt.id = '';
		showModalCollection = 'edit';
		unshowAddRecord(true);
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
				unique: false,
				authColumn: false,
				_internal: {
					invalidName: 'none',
					invalidKind: true
				}
			}
		];
	}

	function validateSchemaField(idx: number) {
		if (collectionData.schemaFields[idx].name.startsWith('_')) {
			collectionData.schemaFields[idx]._internal.invalidName = 'format';
			return;
		}
		const lastChar = collectionData.schemaFields[idx].name.at(-1);
		if (lastChar && !(lastChar === '_' || (lastChar >= 'a' && lastChar <= 'z'))) {
			collectionData.schemaFields[idx]._internal.invalidName = 'format';
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
			collectionData.schemaFields[idx]._internal.invalidName = 'exists';
			return;
		}
		collectionData.schemaFields[idx]._internal.invalidName = 'none';
	}

	function removeSchemaField(idx: number) {
		showSchemaFieldOpt.idx = -1;
		collectionData.schemaFields.splice(idx, 1);
		collectionData.schemaFields = collectionData.schemaFields;
	}

	function unshowModalCollection(force?: boolean) {
		if (!force && isLoadingAddEditCollection) return;

		collectionData = {
			id: '',
			name: '',
			schemaFields: [],
			optAuthColumnId: false
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
			if (e.clientY + 300 > document.documentElement.clientHeight) {
				showSchemaFieldOpt.position = 'top';
			} else {
				showSchemaFieldOpt.position = 'bottom';
			}
		}
	}

	async function refreshRecords(abortSignal: AbortSignal | null) {
		if (selectedCollection) {
			try {
				isLoadingRefreshRecords = true;

				const recordsData: {
					pagination: Pagination;
					data: {
						[field: string]: any;
					}[];
				} = await selectedCollection.findManyRecords(abortSignal, {
					orders: [
						{
							field: '_id',
							kind: 'desc'
						}
					],
					limit: 20
				});
				for (const [field, props] of Object.entries(selectedCollection.data.schema_fields)) {
					if (props.kind === 'timestamp') {
						for (let i = 0; i < recordsData.data.length; ++i) {
							recordsData.data[i][field] = convertTimestampToDatetimeLocal(
								recordsData.data[i][field]
							);
						}
					} else if (props.kind === 'json') {
						for (let i = 0; i < recordsData.data.length; ++i) {
							if (recordsData.data[i][field]) {
								recordsData.data[i][field] = JSON.stringify(recordsData.data[i][field]);
							}
						}
					}
				}

				records = recordsData;

				isLoadingRefreshRecords = false;
			} catch (err) {
				const code = errorHandler(err);
				if (code === 0) {
					isLoadingRefreshRecords = false;
				}
			}
		} else {
			records = {
				pagination: {
					count: 0,
					total: 0
				},
				data: []
			};
		}
	}

	async function loadMoreRecords() {
		if (!selectedCollection) return;
		try {
			isLoadingLoadMoreRecords = true;

			const recordsData: {
				pagination: Pagination;
				data: {
					[field: string]: any;
				}[];
			} = await selectedCollection.findManyRecords(null, {
				filters: [
					{
						field: '_id',
						op: '<',
						value: records.data.at(-1)!._id
					}
				],
				orders: [
					{
						field: '_id',
						kind: 'desc'
					}
				],
				limit: 20
			});
			for (const [field, props] of Object.entries(selectedCollection.data.schema_fields)) {
				if (props.kind === 'timestamp') {
					for (let i = 0; i < recordsData.data.length; ++i) {
						recordsData.data[i][field] = convertTimestampToDatetimeLocal(
							recordsData.data[i][field]
						);
					}
				} else if (props.kind === 'json') {
					for (let i = 0; i < recordsData.data.length; ++i) {
						if (recordsData.data[i][field]) {
							recordsData.data[i][field] = JSON.stringify(recordsData.data[i][field]);
						}
					}
				}
			}

			records = {
				pagination: {
					...records.pagination,
					count: records.pagination.count + recordsData.pagination.count
				},
				data: [...records.data, ...recordsData.data]
			};

			isLoadingLoadMoreRecords = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingLoadMoreRecords = false;
			}
		}
	}

	function toggleShowRecordOpt(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		record: {
			[field: string]: any;
		}
	) {
		if (isLoadingEditRecord) return;

		showRecordOpt.id = showRecordOpt.id === record._id ? '' : record._id;
		if (showRecordOpt.id.length > 0) {
			showRecordOpt.action = 'option';
			showRecordOpt.editData = record;
			if (e.clientY + 125 > document.documentElement.clientHeight) {
				showRecordOpt.optPosition = 'top';
			} else {
				showRecordOpt.optPosition = 'bottom';
			}
		} else {
			showRecordOpt.action = 'none';
			showRecordOpt.editData = {};
		}
	}

	function toggleAddRecord() {
		unshowRecordOpt();
		if (showAddRecordData.show) {
			unshowAddRecord();
		} else {
			showAddRecordData = {
				show: true,
				data: {}
			};
		}
	}

	function unshowAddRecord(force?: boolean) {
		if (!force && isLoadingAddRecord) return;

		showAddRecordData = {
			show: false,
			data: {}
		};
	}

	function unshowRecordOpt(force?: boolean) {
		if (!force && isLoadingRemoveRecord) return;

		showRecordOpt = {
			id: '',
			action: 'none',
			optPosition: 'top',
			editData: {}
		};
	}

	async function addRecord() {
		if (!selectedCollection) return;

		try {
			isLoadingAddRecord = true;

			const { data, error } = formatSchemaFieldData(
				showAddRecordData.data,
				selectedCollection.data.schema_fields
			);
			if (error) {
				toast.error(error);
				return;
			}
			if (!data) {
				toast.error('Data is undefined');
				return;
			}
			await selectedCollection.insertOne(data);
			unshowAddRecord(true);
			toast.success('Successfully added a record');
			refreshRecords(null);

			isLoadingAddRecord = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddRecord = false;
			}
		}
	}

	async function editRecord() {
		if (!selectedCollection) return;

		try {
			isLoadingEditRecord = true;

			const editData = { ...showRecordOpt.editData };
			delete editData['_id'];
			const { data, error } = formatSchemaFieldData(
				editData,
				selectedCollection.data.schema_fields
			);
			if (error) {
				toast.error(error);
				return;
			}
			if (!data) {
				toast.error('Data is undefined');
				return;
			}
			await selectedCollection.updateOneRecord(showRecordOpt.id, data);
			unshowRecordOpt(true);
			toast.success('Successfully updated the record');
			refreshRecords(null);

			isLoadingEditRecord = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingEditRecord = false;
			}
		}
	}

	async function removeRecord() {
		if (!selectedCollection) return;

		try {
			isLoadingRemoveRecord = true;

			await selectedCollection.deleteOneRecord(showRecordOpt.id);
			unshowRecordOpt(true);
			toast.success('Successfully removed the record');
			refreshRecords(null);

			isLoadingRemoveRecord = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRemoveRecord = false;
			}
		}
	}

	async function toggleRealtimeRecord() {
		if (!selectedCollection) return;

		if (listenChangeRecordState !== 'off') {
			stopRealtimeRecord();
			refreshRecords(null);
			return;
		}

		try {
			await refreshRecords(null);
			selectedCollection.subscribe({
				onOpenCallback: () => (listenChangeRecordState = 'active'),
				onMessageCallback: (ev) => {
					const parsedData = JSON.parse(ev.data);
					const data = parsedData.data;
					switch (parsedData.kind) {
						case 'insert_one':
							records = {
								pagination: {
									count: records.pagination.count + 1,
									total: records.pagination.total + 1
								},
								data: [data, ...records.data]
							};
							break;
						case 'update_one':
							break;
						case 'delete_one':
							break;
					}
				},
				onErrorCallback: () => (listenChangeRecordState = 'error'),
				onCloseCallback: () => (listenChangeRecordState = 'off')
			});
		} catch (err) {
			errorHandler(err);
		}
	}

	function stopRealtimeRecord() {
		if (!selectedCollection) return;
		selectedCollection.unsubscribe();
		listenChangeRecordState = 'off';
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
		if (showModalEditProject.id.length > 0) {
			unshowModalEditProject();
			return;
		}
		if (showModalRemoveCollection.id.length > 0) {
			unshowModalRemoveCollection();
			return;
		}
		{
			let escaped = false;
			if (showCollectionOpt.id.length > 0) {
				showCollectionOpt.id = '';
				escaped = true;
			}
			if (showRecordOpt.id.length > 0) {
				showRecordOpt.id = '';
				showRecordOpt.action = 'none';
				escaped = true;
			}
			if (showAddRecordData.show) {
				showAddRecordData = {
					show: false,
					data: {}
				};
			}
			if (escaped) {
				return;
			}
		}
		selectedCollectionData = {
			id: '',
			name: ''
		};
		selectedCollection = undefined;
	}

	interface CollectionData {
		id: string;
		name: string;
		schemaFields: {
			name: string;
			kind: '' | SchemaFieldKind;
			required: boolean;
			indexed: boolean;
			unique: boolean;
			authColumn: boolean;
			_internal: {
				invalidName: 'none' | 'exists' | 'format';
				invalidKind: boolean;
			};
		}[];
		optAuthColumnId: boolean;
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
								class="block py-2.5 px-1 bg-neutral-200"
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
							on:click={() => (showModalCollection = 'add')}
						>
							New Collection
						</Button>
						{#if !isLoadingRefreshCollections}
							<div class="mt-2 min-h-0 flex-1 rounded overflow-hidden">
								<div class="h-full overflow-y-auto">
									{#each collections as collection}
										<div class="relative">
											<button
												type="button"
												on:click|stopPropagation={() => selectCollection(collection)}
												title={collection.name}
												class="w-full py-1 px-2 flex items-center justify-between {selectedCollectionData.id ===
												collection.id
													? 'bg-neutral-200'
													: 'hover:bg-neutral-100'} text-sm text-left rounded"
											>
												<span class="truncate">{collection.name}</span>
												<button
													type="button"
													on:click|stopPropagation={(e) =>
														toggleShowCollectionOpt(e, collection.id)}
												>
													<EllipsisHorizontal class="w-4 h-4" /></button
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
															showModalRemoveCollection = {
																id: collection.id,
																name: collection.name
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
			<h2 class="px-2 font-bold flex">
				Collection{#if selectedCollectionData}&nbsp;<span class="truncate">
						{selectedCollectionData.name}
					</span>
				{/if}
			</h2>
			{#if !isLoadingRefreshCollections}
				{#if selectedCollectionData.id}
					{#if !isLoadingRefreshSelectedCollection}
						<div class="px-2 flex items-center gap-x-2">
							<h3>ID: {selectedCollectionData.id}</h3>
							<button
								type="button"
								on:click|stopPropagation={() =>
									copyTextToClipboard(selectedCollection?.data.id ?? '')}
							>
								<Copy class="w-5 h-5" />
							</button>
						</div>
						<div class="min-h-0 mt-2 flex-1 flex flex-col">
							{#if selectedCollection && !isLoadingRefreshSelectedCollection && !isLoadingRefreshRecords}
								<div class="px-2 flex gap-x-2 items-center">
									<button
										type="button"
										on:click|stopPropagation={toggleAddRecord}
										class="block w-fit px-4 py-1 border-2 border-black hover:bg-gray-300 rounded font-bold text-sm"
									>
										Insert row
									</button>
									<button
										type="button"
										on:click|stopPropagation={toggleRealtimeRecord}
										class="block w-fit px-4 py-1 flex items-center gap-x-1.5 border-2 border-black hover:bg-gray-300 rounded font-bold text-sm"
									>
										<div
											class="rounded-full w-2 h-2 {listenChangeRecordState === 'active'
												? 'bg-green-500'
												: listenChangeRecordState === 'error'
													? 'bg-yellow-500'
													: 'bg-red-500'}"
										/>
										Realtime
									</button>
								</div>
								<div class="mt-2 flex-1 overflow-x-auto">
									<table>
										<thead>
											<tr>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">
													<div class="flex items-center gap-x-2">
														<span>_id</span>
														<span class="font-normal text-sm text-gray-500">uuid</span>
													</div>
												</th>
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">
													<div class="flex items-center gap-x-2">
														<span>_created_by</span>
														<span class="font-normal text-sm text-gray-500">uuid</span>
													</div>
												</th>
												{#each Object.entries(selectedCollection.data.schema_fields) as [field, props]}
													<th class="py-1 px-2 sticky top-0 bg-white relative z-20">
														<div class="flex items-center gap-x-2">
															<span>{field}</span>
															<span class="font-normal text-sm text-gray-500">{props.kind}</span>
														</div>
													</th>
												{/each}
												<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Options</th>
											</tr>
										</thead>
										<tbody>
											{#if showAddRecordData.show}
												<tr>
													<td class="py-1 px-2 text-sm text-gray-500">Auto-generated</td>
													<td class="py-1 px-2 text-sm">
														<input
															type="text"
															size="1"
															bind:value={showAddRecordData.data['_created_by']}
															placeholder="Leave empty to auto-generated"
															class="w-full py-px px-1 border border-black bg-transparent outline-none"
														/>
													</td>
													{#each Object.entries(selectedCollection.data.schema_fields) as [field, props]}
														<td class="py-1 px-2 text-sm">
															{#if props.kind === 'boolean'}
																<div class="flex items-center gap-x-2">
																	<button
																		type="button"
																		on:click|preventDefault={() =>
																			(showAddRecordData.data[field] =
																				!showAddRecordData.data[field])}
																	>
																		{#if showAddRecordData.data[field]}
																			<Checkbox class="w-6 h-6" />
																		{:else}
																			<Square class="w-6 h-6" />
																		{/if}
																	</button>
																</div>
															{:else if props.kind === 'date'}
																<input
																	type="date"
																	bind:value={showAddRecordData.data[field]}
																	size="1"
																	class="w-full px-1 border border-black bg-transparent text-sm outline-none"
																/>
															{:else if props.kind === 'time'}
																<input
																	type="time"
																	bind:value={showAddRecordData.data[field]}
																	size="1"
																	step="0.1"
																	class="w-full px-1 border border-black bg-transparent outline-none"
																/>
															{:else if props.kind === 'timestamp'}
																<input
																	type="datetime-local"
																	bind:value={showAddRecordData.data[field]}
																	size="1"
																	class="w-full px-1 border border-black bg-transparent outline-none"
																/>
															{:else}
																<input
																	type="text"
																	bind:value={showAddRecordData.data[field]}
																	size="1"
																	class="w-full py-px px-1 border border-black bg-transparent outline-none"
																/>
															{/if}
														</td>
													{/each}
													<td>
														<div class="w-fit mx-auto flex gap-x-2">
															<button
																type="button"
																on:click|stopPropagation={addRecord}
																disabled={isLoadingAddRecord}
															>
																{#if !isLoadingAddRecord}
																	<Save class="w-5 h-5" />
																{:else}
																	<Loading class="w-5 h-5 animate-spin" />
																{/if}
															</button>
															<button
																type="button"
																on:click|stopPropagation={() => unshowAddRecord()}
																class="block w-fit mx-auto"
															>
																<CloseCircle class="w-5 h-5" />
															</button>
														</div>
													</td>
												</tr>
											{/if}
											{#each records.data as record}
												<tr class="hover:bg-neutral-100">
													<td class="py-1 px-2 text-sm">
														{record._id}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRecordOpt.id === record._id && showRecordOpt.action === 'edit'}
															<input
																type="text"
																size="1"
																bind:value={showRecordOpt.editData._created_by}
																class="w-full py-px px-1 border border-black bg-transparent outline-none"
															/>
														{:else}
															<span>{record._created_by}</span>
														{/if}
													</td>
													{#each Object.entries(selectedCollection.data.schema_fields) as [field, props]}
														<td class="py-1 px-2 text-sm">
															{#if showRecordOpt.id === record._id && showRecordOpt.action === 'edit'}
																{#if props.kind === 'boolean'}
																	<div class="flex items-center gap-x-2">
																		<button
																			type="button"
																			on:click|preventDefault={() =>
																				(showRecordOpt.editData[field] =
																					!showRecordOpt.editData[field])}
																		>
																			{#if showRecordOpt.editData[field]}
																				<Checkbox class="w-6 h-6" />
																			{:else}
																				<Square class="w-6 h-6" />
																			{/if}
																		</button>
																	</div>
																{:else if props.kind === 'binary'}
																	<span>{record[field]}</span>
																	<span class="block text-gray-500 text-xs leading-3">
																		Editing binary is currently unsupported
																	</span>
																{:else if props.kind === 'date'}
																	<input
																		type="date"
																		bind:value={showRecordOpt.editData[field]}
																		size="1"
																		class="w-full px-1 border border-black bg-transparent text-sm outline-none"
																	/>
																{:else if props.kind === 'time'}
																	<input
																		type="time"
																		bind:value={showRecordOpt.editData[field]}
																		size="1"
																		step="0.1"
																		class="w-full px-1 border border-black bg-transparent outline-none"
																	/>
																{:else if props.kind === 'timestamp'}
																	<input
																		type="datetime-local"
																		bind:value={showRecordOpt.editData[field]}
																		size="1"
																		class="w-full px-1 border border-black bg-transparent outline-none"
																	/>
																{:else}
																	<input
																		type="text"
																		bind:value={showRecordOpt.editData[field]}
																		size="1"
																		class="w-full py-px px-1 border border-black bg-transparent outline-none"
																	/>
																{/if}
															{:else if props.kind === 'boolean'}
																{#if record[field]}
																	<Checkbox class="w-5 h-5" />
																{:else}
																	<Square class="w-5 h-5" />
																{/if}
															{:else}
																<span>{record[field]}</span>
															{/if}
														</td>
													{/each}
													<td class="py-1 px-2 text-sm">
														<div class="py-1 relative">
															{#if showRecordOpt.id === record._id && showRecordOpt.action === 'edit'}
																<div class="w-fit mx-auto flex gap-x-2">
																	<button
																		type="button"
																		on:click|stopPropagation={editRecord}
																		disabled={isLoadingEditRecord}
																	>
																		{#if !isLoadingEditRecord}
																			<Save class="w-5 h-5" />
																		{:else}
																			<Loading class="w-5 h-5 animate-spin" />
																		{/if}
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={(e) => toggleShowRecordOpt(e, record)}
																	>
																		<CloseCircle class="w-5 h-5" />
																	</button>
																</div>
															{:else}
																<button
																	type="button"
																	on:click|stopPropagation={(e) => toggleShowRecordOpt(e, record)}
																	class="block w-fit mx-auto"
																>
																	<Settings class="w-5 h-5" />
																</button>
															{/if}
															{#if showRecordOpt.id === record._id && showRecordOpt.action === 'option'}
																<div
																	class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm"
																	class:top-full={showRecordOpt.optPosition === 'bottom'}
																	class:bottom-full={showRecordOpt.optPosition === 'top'}
																>
																	<button
																		type="button"
																		on:click|stopPropagation={() => {
																			unshowAddRecord();
																			showRecordOpt.action = 'edit';
																		}}
																		class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
																	>
																		<Create class="w-5 h-5" />
																		<span>Edit</span>
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={() =>
																			(showRecordOpt.action = 'remove')}
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
									{#if records.pagination.count < records.pagination.total}
										<button
											type="button"
											on:click|stopPropagation={loadMoreRecords}
											disabled={isLoadingLoadMoreRecords}
											class="block w-fit my-4 py-2 px-4 flex items-center gap-x-2 mx-auto border border-black rounded text-sm"
										>
											{#if isLoadingLoadMoreRecords}
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
								<Button type="button" height="h-10" on:click={() => (showModalCollection = 'add')}>
									Create a new collection
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

	{#if showModalRemoveCollection.id.length > 0}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalRemoveCollection()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
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
							on:click={() => unshowModalRemoveCollection()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveCollection}
							height="h-10"
							disable={collectionNameRemove !== showModalRemoveCollection.name}
							on:click={() => removeCollection(showModalRemoveCollection.id)}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showRecordOpt.action === 'remove'}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowRecordOpt()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<div>
					<p class="font-bold text-center text-2xl">Remove Record</p>
				</div>
				<div class="mt-6 space-y-6">
					<div class="flex items-center gap-x-2">
						<Warning class="w-8 h-8 text-red-500" />
						<p class="text-red-500">This action cannot be undone.</p>
					</div>
					<p>Are you sure you want to delete the selected row?</p>
					<div class="flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingRemoveRecord}
							height="h-10"
							on:click={() => unshowRecordOpt()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveRecord}
							height="h-10"
							on:click={() => removeRecord()}
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
			on:click|stopPropagation={() => unshowModalCollection()}
			class="fixed z-20 w-screen h-screen bg-black/20"
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
							<p class="pt-2 px-4 font-bold text-sm text-gray-600">Schema Fields</p>
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
														title={collectionData.schemaFields[i]._internal.invalidName === 'exists'
															? 'The schema field already exists.'
															: collectionData.schemaFields[i]._internal.invalidName === 'format'
																? 'Incorrect schema field format.'
																: undefined}
														class="w-full px-1 border bg-transparent outline-none {collectionData
															.schemaFields[i]._internal.invalidName === 'none'
															? 'border-black'
															: 'border-red-500 text-red-500'}"
													/>
												</td>
												<td class="p-1">
													<select
														bind:value={collectionData.schemaFields[i].kind}
														on:change={() =>
															(collectionData.schemaFields[i]._internal.invalidKind = false)}
														title={collectionData.schemaFields[i]._internal.invalidKind
															? 'Incorrect schema field type'
															: undefined}
														class="border bg-transparent outline-none {collectionData.schemaFields[
															i
														]._internal.invalidKind
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
																	(collectionData.schemaFields[i].unique =
																		!collectionData.schemaFields[i].unique)}
																class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
															>
																{#if collectionData.schemaFields[i].unique}
																	<Checkbox class="w-5 h-5" />
																{:else}
																	<Square class="w-5 h-5" />
																{/if} <span>Unique</span>
															</button>
															<button
																type="button"
																on:click|stopPropagation={() =>
																	(collectionData.schemaFields[i].authColumn =
																		!collectionData.schemaFields[i].authColumn)}
																class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
															>
																{#if collectionData.schemaFields[i].authColumn}
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
						<div class="mt-6">
							<InputCheckbox
								on:click={() => (collectionData.optAuthColumnId = !collectionData.optAuthColumnId)}
								checked={collectionData.optAuthColumnId}
								label="Authentication"
								text="Using the _id field to authenticate MQTT publishers"
							/>
						</div>
					</div>
					<div class="w-fit mt-auto ml-auto pt-4 px-4 flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingAddEditCollection}
							height="h-10"
							on:click={() => unshowModalCollection()}
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
