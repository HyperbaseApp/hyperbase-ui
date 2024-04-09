<script lang="ts">
	import type { HyperbaseProject, HyperbaseToken } from '$lib/hyperbase/hyperbase';
	import type Hyperbase from '$lib/hyperbase/hyperbase';
	import type { Token } from '$lib/types/token';
	import type { Collection } from '$lib/types/collection';
	import type { Bucket } from '$lib/types/bucket';
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
	import EllipsisHorizontal from '$lib/components/icon/EllipsisHorizontal.svelte';
	import Create from '$lib/components/icon/Create.svelte';
	import Loading from '$lib/components/icon/Loading.svelte';
	import Save from '$lib/components/icon/Save.svelte';
	import CloseCircle from '$lib/components/icon/CloseCircle.svelte';
	import DocumentText from '$lib/components/icon/DocumentText.svelte';
	import DocumentLock from '$lib/components/icon/DocumentLock.svelte';
	import Folder from '$lib/components/icon/Folder.svelte';
	import { CollectionPermission, type CollectionRule } from '$lib/types/collectionRule';
	import { BucketPermission, type BucketRule } from '$lib/types/bucketRule';
	import InputCheckbox from '$lib/components/form/InputCheckbox.svelte';
	import {
		convertDatetimeLocalToTimestamp,
		convertTimestampToDatetimeLocal
	} from '$lib/utils/converter';
	import formatTokenRule from '$lib/utils/formatTokenRule';
	import Send from '$lib/components/icon/Send.svelte';
	import Archive from '$lib/components/icon/Archive.svelte';

	const hyperbase = getContext<Hyperbase>('hyperbase');
	let hyperbaseProject: HyperbaseProject;
	let hyperbaseToken: HyperbaseToken;

	let abortRefreshRuleController: AbortController;

	let tokens: Token[] = [];
	let collections: Collection[] = [];
	let buckets: Bucket[] = [];
	let rules: {
		active: 'collection' | 'bucket';
		collection: {
			pagination: {
				count: number;
				total: number;
			};
			data: CollectionRule[];
		};
		bucket: {
			pagination: {
				count: number;
				total: number;
			};
			data: BucketRule[];
		};
	} = {
		active: 'collection',
		collection: {
			pagination: {
				count: 0,
				total: 0
			},
			data: []
		},
		bucket: {
			pagination: {
				count: 0,
				total: 0
			},
			data: []
		}
	};

	let selectedToken: Token | undefined = undefined;
	let tokenData: TokenData = {
		id: '',
		name: '',
		allowAnonymous: false,
		expiredAt: ''
	};
	let projectNameRemove = '';
	let tokenNameRemove = '';

	let isLoadingInit = true;
	let isLoadingEditProject = false;
	let isLoadingTransferProject = false;
	let isLoadingDuplicateProject = false;
	let isLoadingRemoveProject = false;
	let isLoadingRefreshTokens = false;
	let isLoadingRefreshRules = false;
	let isLoadingAddEditToken = false;
	let isLoadingRemoveToken = false;
	let isLoadingAddRule = false;
	let isLoadingEditRule = false;
	let isLoadingRemoveRule = false;
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
	let showModalRemoveToken = {
		id: '',
		name: ''
	};
	let showModalToken: 'add' | 'edit' | 'none' = 'none';
	let showProjectOpt = false;
	let showTokenOpt: {
		id: string;
		position: 'top' | 'bottom';
	} = {
		id: '',
		position: 'bottom'
	};
	let showRuleOpt: {
		id: string;
		action: 'none' | 'option' | 'remove' | 'edit';
		optPosition: 'top' | 'bottom';
		editData: {
			findOne: 'all' | 'self_made' | 'none';
			findMany: 'all' | 'self_made' | 'none';
			insertOne: boolean;
			updateOne: 'all' | 'self_made' | 'none';
			deleteOne: 'all' | 'self_made' | 'none';
		};
	} = {
		id: '',
		action: 'none',
		optPosition: 'top',
		editData: {
			findOne: 'none',
			findMany: 'none',
			insertOne: false,
			updateOne: 'none',
			deleteOne: 'none'
		}
	};
	let showAddRuleData: {
		show: boolean;
		data: {
			id: string;
			findOne: 'all' | 'self_made' | 'none';
			findMany: 'all' | 'self_made' | 'none';
			insertOne: boolean;
			updateOne: 'all' | 'self_made' | 'none';
			deleteOne: 'all' | 'self_made' | 'none';
		};
	} = {
		show: false,
		data: {
			id: '',
			findOne: 'none',
			findMany: 'none',
			insertOne: false,
			updateOne: 'none',
			deleteOne: 'none'
		}
	};

	onMount(() => {
		console.log('HERE');
		(async () => {
			try {
				const projectId = $page.params.project_id;
				hyperbaseProject = await hyperbase.getProject(projectId);
				refreshCollections();
				refreshBuckets();
				refreshTokens();

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

	async function refreshCollections() {
		try {
			const collectionsData: Collection[] = await hyperbaseProject.getAllCollections();
			collectionsData.sort((a, b) => {
				const lowerA = a.name.toLocaleLowerCase();
				const lowerB = b.name.toLocaleLowerCase();
				return lowerA > lowerB ? 1 : lowerA === lowerB ? 0 : -1;
			});
			collections = collectionsData;
		} catch (err) {
			errorHandler(err);
		}
	}

	async function refreshBuckets() {
		try {
			const bucketsData: Bucket[] = await hyperbaseProject.getAllBuckets();
			bucketsData.sort((a, b) => {
				const lowerA = a.name.toLocaleLowerCase();
				const lowerB = b.name.toLocaleLowerCase();
				return lowerA > lowerB ? 1 : lowerA === lowerB ? 0 : -1;
			});
			buckets = bucketsData;
		} catch (err) {
			errorHandler(err);
		}
	}

	async function refreshTokens() {
		try {
			isLoadingRefreshTokens = true;

			const tokensData: Token[] = await hyperbaseProject.getAllTokens();
			tokensData.sort((a, b) => {
				const lowerA = a.name.toLocaleLowerCase();
				const lowerB = b.name.toLocaleLowerCase();
				return lowerA > lowerB ? 1 : lowerA === lowerB ? 0 : -1;
			});
			if (selectedToken?.id) selectedToken = tokensData.find((t) => t.id === selectedToken?.id);
			tokens = tokensData;

			isLoadingRefreshTokens = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRefreshTokens = false;
			}
		}
	}

	function copyTextToClipboard(text: string) {
		copyText(text);
		toast.success('Successfully copied to the clipboard');
	}

	function toggleShowTokenOpt(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		id: string
	) {
		showTokenOpt.id = showTokenOpt.id === id ? '' : id;
		if (showTokenOpt.id.length > 0) {
			if (e.clientY + 125 > document.documentElement.clientHeight) {
				showTokenOpt.position = 'top';
			} else {
				showTokenOpt.position = 'bottom';
			}
		}
	}

	function selectToken(token: Token) {
		showProjectOpt = false;
		showTokenOpt.id = '';
		showRuleOpt.id = '';
		showRuleOpt.action = 'none';
		showAddRuleData = {
			show: false,
			data: {
				id: '',
				findOne: 'none',
				findMany: 'none',
				insertOne: false,
				updateOne: 'none',
				deleteOne: 'none'
			}
		};

		selectedToken = token;
		refreshRules();
	}

	async function addToken() {
		try {
			isLoadingAddEditToken = true;

			let expiredAt = null;
			if (tokenData.expiredAt) {
				expiredAt = convertDatetimeLocalToTimestamp(tokenData.expiredAt);
			}

			await hyperbaseProject.createToken({
				name: tokenData.name.trim(),
				allowAnonymous: tokenData.allowAnonymous,
				expiredAt
			});
			unshowModalToken(true);
			toast.success('Successfully added a token');
			await refreshTokens();

			isLoadingAddEditToken = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddEditToken = false;
			}
		}
	}

	async function editToken() {
		try {
			isLoadingAddEditToken = true;

			let expiredAt = null;
			if (tokenData.expiredAt) {
				expiredAt = convertDatetimeLocalToTimestamp(tokenData.expiredAt);
			}

			const hyperbaseToken = await hyperbaseProject.getToken(null, tokenData.id);
			await hyperbaseToken.update({
				name: tokenData.name.trim(),
				allowAnonymous: tokenData.allowAnonymous,
				expiredAt
			});
			unshowModalToken(true);
			toast.success('Successfully updated the token');
			refreshTokens();

			isLoadingAddEditToken = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddEditToken = false;
			}
		}
	}

	async function removeToken(id: string) {
		try {
			isLoadingRemoveToken = true;

			const hyperbaseToken = await hyperbaseProject.getToken(null, id);
			await hyperbaseToken.delete();
			selectedToken = undefined;
			unshowModalRemoveToken(true);
			toast.success('Successfully removed the token');
			refreshTokens();

			isLoadingRemoveToken = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRemoveToken = false;
			}
		}
	}

	function unshowModalRemoveToken(force?: boolean) {
		if (!force && isLoadingRemoveToken) return;

		tokenNameRemove = '';
		showModalRemoveToken = { id: '', name: '' };
	}

	function showModalEditToken(id: string) {
		let editToken = tokens.find((c) => c.id === id);
		if (!editToken) return;

		let editTokenData: TokenData = {
			id: editToken.id,
			name: editToken.name,
			allowAnonymous: editToken.allow_anonymous,
			expiredAt: editToken.expired_at ? convertTimestampToDatetimeLocal(editToken.expired_at) : ''
		};

		tokenData = editTokenData;
		showTokenOpt.id = '';
		showModalToken = 'edit';
		unshowAddRule(true);
	}

	function unshowModalToken(force?: boolean) {
		if (!force && isLoadingAddEditToken) return;

		tokenData = {
			id: '',
			name: '',
			allowAnonymous: false,
			expiredAt: ''
		};
		showModalToken = 'none';
	}

	async function refreshRules() {
		if (selectedToken) {
			try {
				if (abortRefreshRuleController) {
					abortRefreshRuleController.abort();
				}

				isLoadingRefreshRules = true;

				abortRefreshRuleController = new AbortController();
				hyperbaseToken = await hyperbaseProject.getToken(
					abortRefreshRuleController.signal,
					selectedToken.id
				);
				const [collectionRulesData, bucketRulesData]: [
					{
						pagination: {
							count: number;
							total: number;
						};
						data: CollectionRule[];
					},
					{
						pagination: {
							count: number;
							total: number;
						};
						data: BucketRule[];
					}
				] = await Promise.all([
					hyperbaseToken.findManyCollectionRules(),
					hyperbaseToken.findManyBucketRules()
				]);

				rules = {
					active: rules.active,
					collection: collectionRulesData,
					bucket: bucketRulesData
				};

				isLoadingRefreshRules = false;
			} catch (err) {
				const code = errorHandler(err);
				if (code === 0) {
					isLoadingRefreshRules = false;
				}
			}
		} else {
			rules = {
				active: rules.active,
				collection: {
					pagination: {
						count: 0,
						total: 0
					},
					data: []
				},
				bucket: {
					pagination: {
						count: 0,
						total: 0
					},
					data: []
				}
			};
		}
	}

	function toggleShowRuleOpt(
		e: MouseEvent & {
			currentTarget: EventTarget & HTMLButtonElement;
		},
		rules: {
			id: string;
			findOne: 'all' | 'self_made' | 'none';
			findMany: 'all' | 'self_made' | 'none';
			insertOne: boolean;
			updateOne: 'all' | 'self_made' | 'none';
			deleteOne: 'all' | 'self_made' | 'none';
		},
		force?: boolean
	) {
		if (!force && isLoadingEditRule) return;

		showRuleOpt.id = showRuleOpt.id === rules.id ? '' : rules.id;
		if (showRuleOpt.id.length > 0) {
			showRuleOpt.action = 'option';
			showRuleOpt.editData = rules;
			if (e.clientY + 125 > document.documentElement.clientHeight) {
				showRuleOpt.optPosition = 'top';
			} else {
				showRuleOpt.optPosition = 'bottom';
			}
		} else {
			showRuleOpt.action = 'none';
			showRuleOpt.editData = {
				findOne: 'none',
				findMany: 'none',
				insertOne: false,
				updateOne: 'none',
				deleteOne: 'none'
			};
		}
	}

	function toggleView() {
		if (rules.active === 'collection') {
			rules.active = 'bucket';
		} else {
			rules.active = 'collection';
		}
		showAddRuleData = {
			show: false,
			data: {
				id: '',
				findOne: 'none',
				findMany: 'none',
				insertOne: false,
				updateOne: 'none',
				deleteOne: 'none'
			}
		};
		showRuleOpt = {
			id: '',
			action: 'none',
			editData: {
				findOne: 'none',
				findMany: 'none',
				insertOne: false,
				updateOne: 'none',
				deleteOne: 'none'
			},
			optPosition: 'top'
		};
	}

	function toggleAddRule() {
		unshowRuleOpt();
		if (showAddRuleData.show) {
			unshowAddRule();
		} else {
			showAddRuleData = {
				show: true,
				data: {
					id: '',
					findOne: 'none',
					findMany: 'none',
					insertOne: false,
					updateOne: 'none',
					deleteOne: 'none'
				}
			};
		}
	}

	function unshowAddRule(force?: boolean) {
		if (!force && isLoadingAddRule) return;

		showAddRuleData = {
			show: false,
			data: {
				id: '',
				findOne: 'none',
				findMany: 'none',
				insertOne: false,
				updateOne: 'none',
				deleteOne: 'none'
			}
		};
	}

	function unshowRuleOpt(force?: boolean) {
		if (!force && isLoadingRemoveRule) return;

		showRuleOpt = {
			id: '',
			action: 'none',
			optPosition: 'top',
			editData: {
				findOne: 'none',
				findMany: 'none',
				insertOne: false,
				updateOne: 'none',
				deleteOne: 'none'
			}
		};
	}

	async function addRule() {
		try {
			isLoadingAddRule = true;

			if (rules.active === 'collection') {
				await hyperbaseToken.insertOneCollectionRule(
					showAddRuleData.data.id,
					showAddRuleData.data.findOne,
					showAddRuleData.data.findMany,
					showAddRuleData.data.insertOne,
					showAddRuleData.data.updateOne,
					showAddRuleData.data.deleteOne
				);
			}
			if (rules.active === 'bucket') {
				await hyperbaseToken.insertOneBucketRule(
					showAddRuleData.data.id,
					showAddRuleData.data.findOne,
					showAddRuleData.data.findMany,
					showAddRuleData.data.insertOne,
					showAddRuleData.data.updateOne,
					showAddRuleData.data.deleteOne
				);
			}
			unshowAddRule(true);
			toast.success('Successfully added a rule');
			refreshRules();

			isLoadingAddRule = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddRule = false;
			}
		}
	}

	async function editRule() {
		if (!selectedToken) return;

		try {
			isLoadingEditRule = true;

			if (rules.active === 'collection') {
				await hyperbaseToken.updateOneCollectionRule(
					showRuleOpt.id,
					showRuleOpt.editData.findOne,
					showRuleOpt.editData.findMany,
					showRuleOpt.editData.insertOne,
					showRuleOpt.editData.updateOne,
					showRuleOpt.editData.deleteOne
				);
			}
			if (rules.active === 'bucket') {
				await hyperbaseToken.updateOneBucketRule(
					showRuleOpt.id,
					showRuleOpt.editData.findOne,
					showRuleOpt.editData.findMany,
					showRuleOpt.editData.insertOne,
					showRuleOpt.editData.updateOne,
					showRuleOpt.editData.deleteOne
				);
			}
			unshowRuleOpt(true);
			toast.success('Successfully updated the rule');
			refreshRules();

			isLoadingEditRule = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingEditRule = false;
			}
		}
	}

	async function removeRule() {
		try {
			isLoadingRemoveRule = true;

			if (rules.active === 'collection') {
				await hyperbaseToken.deleteOneCollectionRule(showRuleOpt.id);
			}
			if (rules.active === 'bucket') {
				await hyperbaseToken.deleteOneBucketRule(showRuleOpt.id);
			}
			unshowRuleOpt(true);
			toast.success('Successfully removed the bucket');
			refreshRules();

			isLoadingRemoveRule = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingRemoveRule = false;
			}
		}
	}

	function escape() {
		showProjectOpt = false;
		if (showModalToken !== 'none') {
			unshowModalToken();
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
		if (showModalRemoveToken.id.length > 0) {
			unshowModalRemoveToken();
			return;
		}
		{
			let escaped = false;
			if (showTokenOpt.id.length > 0) {
				showTokenOpt.id = '';
				escaped = true;
			}
			if (showRuleOpt.id.length > 0) {
				showRuleOpt.id = '';
				showRuleOpt.action = 'none';
				escaped = true;
			}
			if (showAddRuleData.show) {
				showAddRuleData = {
					show: false,
					data: {
						id: '',
						findOne: 'none',
						findMany: 'none',
						insertOne: false,
						updateOne: 'none',
						deleteOne: 'none'
					}
				};
			}
			if (escaped) {
				return;
			}
		}
		selectedToken = undefined;
	}

	interface TokenData {
		id: string;
		name: string;
		allowAnonymous: boolean;
		expiredAt: string;
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
								class="block py-2.5 px-1 hover:bg-neutral-100"
							>
								<Folder class="w-8 h-8" />
							</a>
							<a
								href="{base}/project/{$page.params.project_id}/tokens"
								class="block py-2.5 px-1 bg-neutral-200"
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
							on:click={() => (showModalToken = 'add')}
						>
							New Token
						</Button>
						{#if !isLoadingRefreshTokens}
							<div class="mt-2 min-h-0 flex-1 rounded overflow-hidden">
								<div class="h-full overflow-y-auto">
									{#each tokens as token}
										<div class="relative">
											<button
												type="button"
												on:click|stopPropagation={() => selectToken(token)}
												title={token.name}
												class="w-full py-1 px-2 flex items-center justify-between {selectedToken?.id ===
												token.id
													? 'bg-neutral-200'
													: 'hover:bg-neutral-100'} text-sm text-left rounded"
											>
												<span class="truncate">{token.name}</span>
												<button
													type="button"
													on:click|stopPropagation={(e) => toggleShowTokenOpt(e, token.id)}
												>
													<EllipsisHorizontal class="w-4 h-4" /></button
												>
											</button>
											{#if showTokenOpt.id === token.id}
												<div
													class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm text-sm"
													class:top-full={showTokenOpt.position === 'bottom'}
													class:bottom-full={showTokenOpt.position === 'top'}
												>
													<button
														type="button"
														on:click|stopPropagation={() => showModalEditToken(token.id)}
														class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
													>
														<Create class="w-5 h-5" />
														<span>Edit</span>
													</button>
													<button
														type="button"
														on:click|stopPropagation={() => {
															showTokenOpt.id = '';
															showModalRemoveToken = {
																id: token.id,
																name: token.name
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
				Token{#if selectedToken}&nbsp;<span class="truncate">{selectedToken.name}</span>
				{/if}
			</h2>
			{#if !isLoadingRefreshTokens}
				{#if selectedToken}
					<div class="px-2 flex items-center gap-x-2">
						<h3>ID: {selectedToken.id}</h3>
						<button
							type="button"
							on:click|stopPropagation={() => copyTextToClipboard(selectedToken?.id ?? '')}
						>
							<Copy class="w-5 h-5" />
						</button>
					</div>
					<div class="px-2 flex items-center gap-x-2">
						<h3>Token: {selectedToken.token}</h3>
						<button
							type="button"
							on:click|stopPropagation={() => copyTextToClipboard(selectedToken?.token ?? '')}
						>
							<Copy class="w-5 h-5" />
						</button>
					</div>
					<div class="min-h-0 mt-2 flex-1 flex flex-col">
						{#if !isLoadingRefreshRules}
							<div class="px-2 flex gap-x-2 items-center">
								<button
									type="button"
									on:click|stopPropagation={toggleView}
									class="block w-fit px-4 py-1 border-2 border-black hover:bg-gray-300 rounded font-bold text-sm"
								>
									Switch to {rules.active === 'collection' ? 'bucket' : 'collection'} rule
								</button>
								<button
									type="button"
									on:click|stopPropagation={toggleAddRule}
									class="block w-fit px-4 py-1 border-2 border-black hover:bg-gray-300 rounded font-bold text-sm"
								>
									Insert {rules.active} rule
								</button>
							</div>
							<div class="mt-2 flex-1 overflow-x-auto">
								<table>
									<thead>
										<tr>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">ID</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Created At</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Updated At</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">
												{rules.active[0].toUpperCase() + rules.active.slice(1)} Name
											</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Find One</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Find Many</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Insert One</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Update One</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Delete One</th>
											<th class="py-1 px-2 sticky top-0 bg-white relative z-20">Options</th>
										</tr>
									</thead>
									<tbody>
										{#if showAddRuleData.show}
											<tr>
												<td class="py-1 px-2 text-sm text-gray-500">Auto-generated</td>
												<td class="py-1 px-2 text-sm text-gray-500">Auto-generated</td>
												<td class="py-1 px-2 text-sm text-gray-500">Auto-generated</td>
												<td class="py-1 px-2 text-sm">
													{#if rules.active === 'collection'}
														<select
															bind:value={showAddRuleData.data.id}
															title={!showAddRuleData.data.id
																? 'Incorrect collection id'
																: undefined}
															class="w-full border bg-transparent outline-none {showAddRuleData.data
																.id
																? 'border-black'
																: 'border-red-500'}"
														>
															{#each collections as collection}
																<option value={collection.id}>{collection.name}</option>
															{/each}
														</select>
													{:else if rules.active === 'bucket'}
														<select
															bind:value={showAddRuleData.data.id}
															title={!showAddRuleData.data.id ? 'Incorrect bucket id' : undefined}
															class="w-full border bg-transparent outline-none {showAddRuleData.data
																.id
																? 'border-black'
																: 'border-red-500'}"
														>
															{#each buckets as bucket}
																<option value={bucket.id}>{bucket.name}</option>
															{/each}
														</select>
													{/if}
												</td>
												<td class="py-1 px-2 text-sm">
													<select
														bind:value={showAddRuleData.data.findOne}
														class="border bg-transparent outline-none border-black"
													>
														{#each Object.values(CollectionPermission) as cp}
															<option value={cp}>
																{formatTokenRule(cp)}
															</option>
														{/each}
													</select>
												</td>
												<td class="py-1 px-2 text-sm">
													<select
														bind:value={showAddRuleData.data.findMany}
														class="border bg-transparent outline-none border-black"
													>
														{#each Object.values(CollectionPermission) as cp}
															<option value={cp}>
																{formatTokenRule(cp)}
															</option>
														{/each}
													</select>
												</td>
												<td class="py-1 px-2 text-sm">
													<select
														bind:value={showAddRuleData.data.insertOne}
														class="border bg-transparent outline-none border-black"
													>
														<option value={true}>True</option>
														<option value={false}>False</option>
													</select>
												</td>
												<td class="py-1 px-2 text-sm">
													<select
														bind:value={showAddRuleData.data.updateOne}
														class="border bg-transparent outline-none border-black"
													>
														{#each Object.values(CollectionPermission) as cp}
															<option value={cp}>
																{formatTokenRule(cp)}
															</option>
														{/each}
													</select>
												</td>
												<td class="py-1 px-2 text-sm">
													<select
														bind:value={showAddRuleData.data.deleteOne}
														class="border bg-transparent outline-none border-black"
													>
														{#each Object.values(CollectionPermission) as cp}
															<option value={cp}>
																{formatTokenRule(cp)}
															</option>
														{/each}
													</select>
												</td>
												<td>
													<div class="w-fit mx-auto flex gap-x-2">
														<button
															type="button"
															on:click|stopPropagation={addRule}
															disabled={!showAddRuleData.data.id || isLoadingAddRule}
															class={!showAddRuleData.data.id ? 'text-black/30' : undefined}
														>
															{#if !isLoadingAddRule}
																<Save class="w-5 h-5" />
															{:else}
																<Loading class="w-5 h-5 animate-spin" />
															{/if}
														</button>
														<button
															type="button"
															on:click|stopPropagation={() => unshowAddRule()}
															class="block w-fit mx-auto"
														>
															<CloseCircle class="w-5 h-5" />
														</button>
													</div>
												</td>
											</tr>
										{/if}
										{#if rules.active === 'collection'}
											{#each rules.collection.data as rule}
												<tr class="hover:bg-neutral-100">
													<td class="py-1 px-2 text-sm">
														{rule.id}
													</td>
													<td class="py-1 px-2 text-sm">
														{rule.created_at}
													</td>
													<td class="py-1 px-2 text-sm">
														{rule.updated_at}
													</td>
													<td class="py-1 px-2 text-sm">
														{collections.find((c) => c.id === rule.collection_id)?.name}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.findOne}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(CollectionPermission) as cp}
																	<option value={cp}>
																		{formatTokenRule(cp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.find_one)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.findMany}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(CollectionPermission) as cp}
																	<option value={cp}>
																		{formatTokenRule(cp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.find_many)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.insertOne}
																class="border bg-transparent outline-none border-black"
															>
																<option value={true}>True</option>
																<option value={false}>False</option>
															</select>
														{:else}
															{rule.insert_one ? 'True' : 'False'}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.updateOne}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(CollectionPermission) as cp}
																	<option value={cp}>
																		{formatTokenRule(cp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.update_one)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.deleteOne}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(CollectionPermission) as cp}
																	<option value={cp}>
																		{formatTokenRule(cp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.delete_one)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														<div class="py-1 relative">
															{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'edit'}
																<div class="w-fit mx-auto flex gap-x-2">
																	<button
																		type="button"
																		on:click|stopPropagation={editRule}
																		disabled={isLoadingEditRule}
																	>
																		{#if !isLoadingEditRule}
																			<Save class="w-5 h-5" />
																		{:else}
																			<Loading class="w-5 h-5 animate-spin" />
																		{/if}
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={(e) =>
																			toggleShowRuleOpt(e, {
																				id: rule.id,
																				findOne: rule.find_one,
																				findMany: rule.find_many,
																				insertOne: rule.insert_one,
																				updateOne: rule.update_one,
																				deleteOne: rule.delete_one
																			})}
																	>
																		<CloseCircle class="w-5 h-5" />
																	</button>
																</div>
															{:else}
																<button
																	type="button"
																	on:click|stopPropagation={(e) =>
																		toggleShowRuleOpt(e, {
																			id: rule.id,
																			findOne: rule.find_one,
																			findMany: rule.find_many,
																			insertOne: rule.insert_one,
																			updateOne: rule.update_one,
																			deleteOne: rule.delete_one
																		})}
																	class="block w-fit mx-auto"
																>
																	<Settings class="w-5 h-5" />
																</button>
															{/if}
															{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'option'}
																<div
																	class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm"
																	class:top-full={showRuleOpt.optPosition === 'bottom'}
																	class:bottom-full={showRuleOpt.optPosition === 'top'}
																>
																	<button
																		type="button"
																		on:click|stopPropagation={() => {
																			unshowAddRule();
																			showRuleOpt.action = 'edit';
																		}}
																		class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
																	>
																		<Create class="w-5 h-5" />
																		<span>Edit</span>
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={() => (showRuleOpt.action = 'remove')}
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
										{:else if rules.active === 'bucket'}
											{#each rules.bucket.data as rule}
												<tr class="hover:bg-neutral-100">
													<td class="py-1 px-2 text-sm">
														{rule.id}
													</td>
													<td class="py-1 px-2 text-sm">
														{rule.created_at}
													</td>
													<td class="py-1 px-2 text-sm">
														{rule.updated_at}
													</td>
													<td class="py-1 px-2 text-sm">
														{buckets.find((b) => b.id === rule.bucket_id)?.name}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.findOne}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(BucketPermission) as bp}
																	<option value={bp}>
																		{formatTokenRule(bp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.find_one)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.findMany}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(BucketPermission) as bp}
																	<option value={bp}>
																		{formatTokenRule(bp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.find_many)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.insertOne}
																class="border bg-transparent outline-none border-black"
															>
																<option value={true}>True</option>
																<option value={false}>False</option>
															</select>
														{:else}
															{rule.insert_one ? 'True' : 'False'}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.updateOne}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(BucketPermission) as bp}
																	<option value={bp}>
																		{formatTokenRule(bp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.update_one)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														{#if showRuleOpt.action === 'edit'}
															<select
																bind:value={showRuleOpt.editData.deleteOne}
																class="border bg-transparent outline-none border-black"
															>
																{#each Object.values(BucketPermission) as bp}
																	<option value={bp}>
																		{formatTokenRule(bp)}
																	</option>
																{/each}
															</select>
														{:else}
															{formatTokenRule(rule.delete_one)}
														{/if}
													</td>
													<td class="py-1 px-2 text-sm">
														<div class="py-1 relative">
															{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'edit'}
																<div class="w-fit mx-auto flex gap-x-2">
																	<button
																		type="button"
																		on:click|stopPropagation={editRule}
																		disabled={isLoadingEditRule}
																	>
																		{#if !isLoadingEditRule}
																			<Save class="w-5 h-5" />
																		{:else}
																			<Loading class="w-5 h-5 animate-spin" />
																		{/if}
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={(e) =>
																			toggleShowRuleOpt(e, {
																				id: rule.id,
																				findOne: rule.find_one,
																				findMany: rule.find_many,
																				insertOne: rule.insert_one,
																				updateOne: rule.update_one,
																				deleteOne: rule.delete_one
																			})}
																	>
																		<CloseCircle class="w-5 h-5" />
																	</button>
																</div>
															{:else}
																<button
																	type="button"
																	on:click|stopPropagation={(e) =>
																		toggleShowRuleOpt(e, {
																			id: rule.id,
																			findOne: rule.find_one,
																			findMany: rule.find_many,
																			insertOne: rule.insert_one,
																			updateOne: rule.update_one,
																			deleteOne: rule.delete_one
																		})}
																	class="block w-fit mx-auto"
																>
																	<Settings class="w-5 h-5" />
																</button>
															{/if}
															{#if showRuleOpt.id === rule.id && showRuleOpt.action === 'option'}
																<div
																	class="p-2 absolute z-10 right-0 border bg-white rounded-xl shadow-sm"
																	class:top-full={showRuleOpt.optPosition === 'bottom'}
																	class:bottom-full={showRuleOpt.optPosition === 'top'}
																>
																	<button
																		type="button"
																		on:click|stopPropagation={() => {
																			unshowAddRule();
																			showRuleOpt.action = 'edit';
																		}}
																		class="w-full py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
																	>
																		<Create class="w-5 h-5" />
																		<span>Edit</span>
																	</button>
																	<button
																		type="button"
																		on:click|stopPropagation={() => (showRuleOpt.action = 'remove')}
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
										{/if}
									</tbody>
								</table>
							</div>
						{:else}
							<div class="flex-1 flex flex-col items-center justify-center">
								<Loading class="w-12 h-12 animate-spin" />
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex-1 flex items-center justify-center">
						<div class="max-w-96 p-4 border rounded">
							<p class="font-bold text-lg">Token</p>
							<p class="mt-2.5">
								{#if tokens.length > 0}
									Select a collection from the navigation panel on the left to views its data, or
									create a new one.
								{:else}
									There are no tokens available in this project
								{/if}
							</p>
							<div class="mt-4">
								<Button type="button" height="h-10" on:click={() => (showModalToken = 'add')}>
									Create a new token
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

	{#if showModalRemoveToken.id.length > 0}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalRemoveToken()}
			class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
		>
			<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
				<div>
					<p class="font-bold text-center text-2xl">Remove Token</p>
				</div>
				<div class="mt-6 space-y-6">
					<div class="flex items-center gap-x-2">
						<Warning class="w-8 h-8 text-red-500" />
						<p class="text-red-500">This action cannot be undone.</p>
					</div>
					<p>
						This will permanently delete the {showModalRemoveToken.name} token and all of its rules.
					</p>
					<Input
						id="token_name_delete"
						label="Type '{showModalRemoveToken.name}' to confirm"
						type="text"
						required
						autocomplete={false}
						bind:value={tokenNameRemove}
					/>
					<div class="flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingRemoveToken}
							height="h-10"
							on:click={() => unshowModalRemoveToken()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveToken}
							height="h-10"
							disable={tokenNameRemove !== showModalRemoveToken.name}
							on:click={() => removeToken(showModalRemoveToken.id)}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showRuleOpt.action === 'remove'}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowRuleOpt()}
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
							disable={isLoadingRemoveRule}
							height="h-10"
							on:click={() => unshowRuleOpt()}
						>
							Cancel
						</Button>
						<Button
							type="button"
							kind="danger"
							loading={isLoadingRemoveRule}
							height="h-10"
							on:click={() => removeRule()}
						>
							Remove
						</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if showModalToken !== 'none'}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div
			on:click|stopPropagation={() => unshowModalToken()}
			class="fixed z-20 w-screen h-screen bg-black/20"
		>
			<form
				on:submit|preventDefault={tokenData.id.length > 0 ? editToken : addToken}
				on:click={(e) => e.stopPropagation()}
				class="absolute right-0 w-full h-full max-h-full max-w-2xl py-4 flex flex-col bg-white"
			>
				<div class="px-4">
					<p class="font-bold text-center text-2xl">
						{tokenData.id.length === 0 ? 'Create' : 'Edit'} Token
					</p>
				</div>
				<div class="min-h-0 flex-1 flex flex-col mt-8">
					<div class="min-h-0 h-full px-4 space-y-6 overflow-y-auto">
						<Input
							id="token_name"
							label="Name"
							type="text"
							required
							autocomplete={false}
							bind:value={tokenData.name}
						/>
						<InputCheckbox
							on:click={() => (tokenData.allowAnonymous = !tokenData.allowAnonymous)}
							checked={tokenData.allowAnonymous}
							label="Authentication"
							text="Allow anonymous signin (without specific user credential)"
						/>
						<Input
							id="token_expires_time"
							label="Expired at"
							type="datetime-local"
							autocomplete={false}
							bind:value={tokenData.expiredAt}
						/>
					</div>
					<div class="w-fit mt-auto ml-auto pt-4 px-4 flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingAddEditToken}
							height="h-10"
							on:click={() => unshowModalToken()}
							class="py-2 px-12"
						>
							Cancel
						</Button>
						<Button type="submit" loading={isLoadingAddEditToken} height="h-10" class="py-2 px-12">
							{tokenData.id?.length === 0 ? 'Create' : 'Edit'}
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
