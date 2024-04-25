<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { base } from '$app/paths';
	import Button from '$lib/components/button/Button.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import Hyperbase from '$lib/hyperbase/hyperbase';
	import errorHandler from '$lib/utils/errorHandler';

	const hyperbase = getContext<Hyperbase>('hyperbase');

	let email = '';
	let password = '';

	let isLoading = false;
	let isAllowRegistration = false;

	onMount(() => {
		(async () => {
			try {
				isAllowRegistration = await hyperbase.getInfoAdminRegistration();
			} catch (err) {
				errorHandler(err);
			}
		})();
	});

	async function signIn() {
		try {
			isLoading = true;

			const token = await hyperbase.adminSignIn({
				email: email.toLowerCase().trim(),
				password: password
			});

			localStorage.setItem('token', token!);
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In - Hyperbase UI</title>
</svelte:head>

<div class="flex-1 flex items-center">
	<form on:submit|preventDefault={signIn} class="w-full max-w-96 mx-auto">
		<div>
			<h1 class="font-bold text-center text-4xl">Hyperbase</h1>
			<h2 class="mt-8 text-center text-lg">Admin sign in</h2>
		</div>
		<div class="mt-8 space-y-6">
			<div>
				<Input id="email" label="Email" type="email" required bind:value={email} />
			</div>
			<div>
				<Input id="password" label="Password" type="password" required bind:value={password} />
				<a href="{base}/auth/reset-password" class="w-fit mt-1 block text-sm text-gray-500">
					Reset password
				</a>
			</div>
			<div>
				<Button type="submit" loading={isLoading}>Sign In</Button>
			</div>
			{#if isAllowRegistration}
				<div>
					<a href="{base}/auth/signup" class="block w-fit mx-auto text-sm text-gray-500">
						Register
					</a>
				</div>
			{/if}
		</div>
	</form>
</div>
