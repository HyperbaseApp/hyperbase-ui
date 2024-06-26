<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { Toaster } from 'svelte-french-toast';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Hyperbase, { AuthState as HyperbaseAuthState } from '$lib/hyperbase/hyperbase';
	import LogOut from '$lib/components/icon/LogOut.svelte';
	import Loading from '$lib/components/icon/Loading.svelte';
	import Home from '$lib/components/icon/Home.svelte';
	import Settings from '$lib/components/icon/Settings.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import Button from '$lib/components/button/Button.svelte';
	import errorHandler from '$lib/utils/errorHandler';
	import Trash from '$lib/components/icon/Trash.svelte';
	import Warning from '$lib/components/icon/Warning.svelte';
	import '../app.css';

	const hyperbase = new Hyperbase();
	const isReady = hyperbase.isReady;
	const authState = hyperbase.authState;

	let changeHyperbaseBaseURL: {
		show: boolean;
		baseURL: string;
	} = {
		show: false,
		baseURL: ''
	};
	let removeAccountEmail = '';
	let isShown = false;
	let isShowAccountOption: 'none' | 'opt' | 'remove' = 'none';
	let isLoadingChangeHyperbaseServer = false;
	let isLoadingRemoveAccount = false;

	$: insideAuthPath = $page.url.pathname.startsWith(`${base}/auth`);
	$: isInProjectRoot = $page.url.pathname === `${base}/projects`;

	let admin = hyperbase.admin;

	onMount(() => {
		(async () => {
			try {
				const { baseURL } = await hyperbase.init();
				changeHyperbaseBaseURL.baseURL = baseURL;
			} catch (err) {
				errorHandler(err);
			}
		})();
	});

	$: if ($isReady) {
		(async () => {
			if (!(await hyperbase.health())) {
				changeHyperbaseBaseURL.show = true;
			}
		})();
	}

	$: if ($isReady) {
		const inRootPath = $page.url.pathname === `${base}/`;

		if ((inRootPath || insideAuthPath) && $authState === HyperbaseAuthState.Authenticated) {
			goto(`${base}/project`, { replaceState: true });
		} else if (!insideAuthPath && $authState === HyperbaseAuthState.Unauthenticated) {
			goto(`${base}/auth/signin`, { replaceState: true });
		} else {
			isShown = true;
		}
	}

	async function changeHyperbaseServer() {
		try {
			isLoadingChangeHyperbaseServer = true;
			const baseURLSplit = changeHyperbaseBaseURL.baseURL.split('://');
			if (baseURLSplit.length !== 2) {
				throw 'Invalid base URL';
			}
			const useSecureProtocol = baseURLSplit[0].at(-1) === 's';
			let webSocketProtocol = 'ws';
			if (useSecureProtocol) {
				webSocketProtocol += 's';
			}
			hyperbase.changeServer(
				changeHyperbaseBaseURL.baseURL,
				`${webSocketProtocol}://${baseURLSplit[1]}`
			);
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingChangeHyperbaseServer = false;
		}
	}

	async function removeAccount() {
		try {
			isLoadingRemoveAccount = true;
			await hyperbase.adminDelete();
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoadingRemoveAccount = false;
		}
	}

	function signOut() {
		hyperbase.signOut();
	}

	function toggleChangeHyperbaseBaseURL() {
		if (changeHyperbaseBaseURL.show) {
			changeHyperbaseBaseURL = {
				show: false,
				baseURL: hyperbase.baseURL
			};
		} else {
			changeHyperbaseBaseURL.show = true;
		}
	}

	setContext('hyperbase', hyperbase);
</script>

<svelte:head>
	<title>Hyperbase UI</title>
</svelte:head>

<div class="h-screen flex flex-col">
	{#if isShown}
		<div class="p-2 flex items-center gap-x-2">
			{#if !insideAuthPath}
				{#if !isInProjectRoot}
					<a href="{base}/projects"><Home class="w-6 h-6" /></a>
				{/if}
				<div class="w-fit ml-auto flex gap-x-2 items-center">
					{#if $admin}
						<div class="relative">
							<button
								type="button"
								on:click|preventDefault={() =>
									(isShowAccountOption = isShowAccountOption !== 'none' ? 'none' : 'opt')}
								class="text-sm"
							>
								{$admin?.email}
							</button>
							{#if isShowAccountOption === 'opt'}
								<div
									class="p-2 absolute z-10 top-full right-0 border bg-white rounded-xl shadow-sm text-sm"
								>
									<button
										type="button"
										on:click|stopPropagation={() => (isShowAccountOption = 'remove')}
										class="w-40 py-2 px-2.5 flex items-center gap-x-2 hover:bg-neutral-100 rounded-lg"
									>
										<Trash class="w-5 h-5" />
										<span>Remove account</span>
									</button>
								</div>
							{/if}
						</div>
					{/if}
					<button
						type="button"
						on:click|preventDefault={toggleChangeHyperbaseBaseURL}
						class="ml-auto"
					>
						<Settings class="w-6 h-6" />
					</button>
					<button type="button" on:click|stopPropagation={signOut} class="">
						<LogOut class="w-6 h-6" />
					</button>
				</div>
			{:else}
				<button
					type="button"
					on:click|preventDefault={toggleChangeHyperbaseBaseURL}
					class="ml-auto"
				>
					<Settings class="w-6 h-6" />
				</button>
			{/if}
		</div>
		<slot />
		{#if changeHyperbaseBaseURL.show}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={toggleChangeHyperbaseBaseURL}
				class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
			>
				<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
					<form on:submit|preventDefault={changeHyperbaseServer}>
						<div>
							<p class="font-bold text-center text-2xl">Change Hyperbase Server</p>
						</div>
						<div class="mt-6 space-y-6">
							<Input
								id="base_url"
								type="text"
								label="Base URL"
								required
								autocomplete={false}
								bind:value={changeHyperbaseBaseURL.baseURL}
							/>
							<div class="flex gap-x-2">
								<Button
									type="button"
									kind="secondary"
									disable={isLoadingChangeHyperbaseServer}
									height="h-10"
									on:click={(e) => {
										e.stopPropagation();
										toggleChangeHyperbaseBaseURL();
									}}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									kind="primary"
									loading={isLoadingChangeHyperbaseServer}
									height="h-10"
								>
									Change
								</Button>
							</div>
						</div>
					</form>
				</div>
			</div>
		{/if}
		{#if isShowAccountOption === 'remove'}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				on:click|stopPropagation={() => {
					removeAccountEmail = '';
					isShowAccountOption = 'none';
				}}
				class="fixed z-20 w-screen h-screen p-4 flex items-center justify-center bg-black/20"
			>
				<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
					<div>
						<p class="font-bold text-center text-2xl">Remove Account</p>
					</div>
					<div class="mt-6 space-y-6">
						<div class="flex items-center gap-x-2">
							<Warning class="w-8 h-8 text-red-500" />
							<p class="text-red-500">This action cannot be undone.</p>
						</div>
						<p>
							This will permanently delete the {$admin?.email} account and all of its data.
						</p>
						<Input
							id="account_email_delete"
							label="Type '{$admin?.email}' to confirm"
							type="text"
							required
							autocomplete={false}
							bind:value={removeAccountEmail}
						/>
						<div class="flex gap-x-2">
							<Button
								type="button"
								kind="secondary"
								disable={isLoadingRemoveAccount}
								height="h-10"
								on:click={() => {
									removeAccountEmail = '';
									isShowAccountOption = 'none';
								}}
							>
								Cancel
							</Button>
							<Button
								type="button"
								kind="danger"
								loading={isLoadingRemoveAccount}
								height="h-10"
								disable={removeAccountEmail !== $admin?.email}
								on:click={removeAccount}
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
	<Toaster />
</div>
