<script lang="ts">
	import Button from '$lib/components/button/Button.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import Hyperbase from '$lib/hyperbase/hyperbase';
	import errorHandler from '$lib/utils/errorHandler';
	import { getContext } from 'svelte';
	import toast from 'svelte-french-toast';

	const hyperbase = getContext<Hyperbase>('hyperbase');

	let email = '';
	let password = '';
	let registrationId: string;
	let code = '';

	let isLoading = false;

	async function signUp() {
		try {
			isLoading = true;

			registrationId = await hyperbase.adminSignUp(email, password);

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

			await hyperbase.adminSignUpVerify(registrationId, code);

			toast.success('Successfully verify the account');
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
				<Input id="email" label="Email" type="email" required bind:value={email} />
				<Input id="password" label="Password" type="password" required bind:value={password} />
				<Button type="submit" loading={isLoading}>Sign Up</Button>
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
