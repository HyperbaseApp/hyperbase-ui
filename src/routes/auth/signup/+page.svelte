<script lang="ts">
	import { goto } from '$app/navigation';
	import PrimaryButton from '$lib/components/button/PrimaryButton.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import Hyperbase from '$lib/hyperbase/hyperbase';
	import errorHandler from '$lib/utils/errorHandler';
	import { getContext } from 'svelte';

	const hyperbase = getContext<Hyperbase>('hyperbase');

	let email = '';
	let password = '';
	let registrationId = '';
	let code = '';

	let isLoading = false;

	async function signUp() {
		try {
			isLoading = true;

			registrationId = await hyperbase.adminSignUp(email, password);
		} catch (err) {
			errorHandler(err);
		} finally {
			isLoading = false;
		}
	}

	async function verifySignUp() {
		try {
			isLoading = true;

			await hyperbase.adminSignUpVerify(registrationId, code);

			goto('/auth/signin');
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

<div class="min-h-screen flex items-center">
	{#if !registrationId}
		<form on:submit|preventDefault={signUp} class="w-full max-w-96 mx-auto">
			<div>
				<h1 class="font-bold text-center text-4xl">Hyperbase</h1>
				<h2 class="mt-8 text-center text-lg">Admin sign up</h2>
			</div>
			<div class="mt-8 space-y-6">
				<Input id="email" label="Email" type="email" required bind:value={email} />
				<Input id="password" label="Password" type="password" required bind:value={password} />
				<PrimaryButton type="submit" loading={isLoading}>Sign Up</PrimaryButton>
			</div>
		</form>
	{:else}
		<form on:submit|preventDefault={verifySignUp} class="w-full max-w-96 mx-auto">
			<div>
				<h1 class="font-bold text-center text-4xl">Hyperbase</h1>
				<h2 class="mt-8 text-center text-lg">Admin sign up verification</h2>
			</div>
			<div class="mt-8 space-y-6">
				<Input id="code" label="Code" type="text" required pattern="[0-9]+" bind:value={code} />
				<PrimaryButton type="submit" loading={isLoading}>Verify Sign Up</PrimaryButton>
			</div>
		</form>
	{/if}
</div>
