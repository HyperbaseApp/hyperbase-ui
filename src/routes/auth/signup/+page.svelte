<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import toast from 'svelte-french-toast';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import Button from '$lib/components/button/Button.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import Hyperbase from '$lib/hyperbase/hyperbase';
	import errorHandler from '$lib/utils/errorHandler';

	const hyperbase = getContext<Hyperbase>('hyperbase');

	let email = '';
	let password = '';
	let registrationId: string;
	let code = '';

	let isLoading = false;

	onMount(() => {
		(async () => {
			try {
				const isAllowed = await hyperbase.getInfoAdminRegistration();
				if (!isAllowed) {
					toast.error('Admin account registration is not allowed');
					goto(`${base}/auth/signin`, { replaceState: true });
				}
			} catch (err) {
				console.error(err);
			}
		})();
	});

	async function signUp() {
		try {
			isLoading = true;

			registrationId = await hyperbase.adminSignUp({
				email: email.toLowerCase().trim(),
				password: password
			});

			toast.success('A verification code has been sent to your email');
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoading = false;
		}
	}

	async function verifySignUp() {
		try {
			isLoading = true;

			await hyperbase.adminSignUpVerify({ id: registrationId, code: code.trim() });

			toast.success('Successfully verify the account');

			goto(`${base}/auth/signin`, { replaceState: true });
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign Up - Hyperbase UI</title>
</svelte:head>

<div class="flex-1 flex items-center">
	{#if !registrationId}
		<form on:submit|preventDefault={signUp} class="w-full max-w-96 mx-auto">
			<div>
				<h1 class="font-bold text-center text-4xl">Hyperbase</h1>
				<h2 class="mt-8 text-center text-lg">Admin sign up</h2>
			</div>
			<div class="mt-8 space-y-6">
				<div>
					<Input id="email" label="Email" type="email" required bind:value={email} />
				</div>
				<div>
					<Input id="password" label="Password" type="password" required bind:value={password} />
				</div>
				<div>
					<Button type="submit" loading={isLoading}>Sign Up</Button>
				</div>
				<div>
					<a href="{base}/auth/signin" class="block w-fit mx-auto text-sm text-gray-500">
						Sign in
					</a>
				</div>
			</div>
		</form>
	{:else}
		<form on:submit|preventDefault={verifySignUp} class="w-full max-w-96 mx-auto">
			<div>
				<h1 class="font-bold text-center text-4xl">Hyperbase</h1>
				<h2 class="mt-8 text-center text-lg">Admin sign up verification</h2>
			</div>
			<div class="mt-8 space-y-6">
				<Input
					id="code"
					label="Code"
					type="text"
					required
					pattern="[0-9]+"
					inputTitle="The whole must be a number"
					bind:value={code}
				/>
				<Button type="submit" loading={isLoading}>Verify Sign Up</Button>
			</div>
		</form>
	{/if}
</div>
