<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import Hyperbase, { AuthState as HyperbaseAuthState } from '$lib/hyperbase/hyperbase';
	import hyperbaseConfig from '$lib/hyperbase/hyperbaseConfig.json';
	import { Toaster } from 'svelte-french-toast';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';
	import LogOut from '$lib/components/icon/LogOut.svelte';
	import Loading from '$lib/components/icon/Loading.svelte';
	import Home from '$lib/components/icon/Home.svelte';

	const hyperbase = new Hyperbase(hyperbaseConfig.base_url, hyperbaseConfig.base_ws_url);
	const isReady = hyperbase.isReady;
	const authState = hyperbase.authState;

	let isShown = false;
	$: insideAuthPath = $page.url.pathname.startsWith(`${base}/auth`);
	$: isInProjectRoot = $page.url.pathname === `${base}/projects`;

	let admin = hyperbase.admin;

	onMount(() => {
		hyperbase.init();
	});

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

	function signOut() {
		hyperbase.signOut();
	}

	setContext('hyperbase', hyperbase);
</script>

<svelte:head>
	<title>Hyperbase UI</title>
</svelte:head>

<div class="h-screen flex flex-col">
	{#if isShown}
		{#if !insideAuthPath}
			<div class="p-2 flex items-center gap-x-2">
				{#if !isInProjectRoot}
					<a href="{base}/projects"><Home class="w-6 h-6" /></a>
				{/if}
				<div class="w-fit ml-auto flex gap-x-2 items-center">
					{#if $admin}
						<p class="text-sm">
							{$admin?.email}
						</p>
					{/if}
					<button on:click|stopPropagation={signOut} class="">
						<LogOut class="w-6 h-6" />
					</button>
				</div>
			</div>
		{/if}
		<slot />
		<Toaster />
	{:else}
		<div class="flex-1 flex flex-col items-center justify-center">
			<Loading class="w-12 h-12 animate-spin" />
		</div>
	{/if}
</div>
