<script lang="ts">
	import type Hyperbase from '$lib/hyperbase/hyperbase';
	import Button from '$lib/components/button/Button.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import errorHandler from '$lib/utils/errorHandler';
	import { getContext } from 'svelte';
	import toast from 'svelte-french-toast';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	const hyperbase = getContext<Hyperbase>('hyperbase');

	let email = '';
	let reqPassResetId: string;
	let code = '';
	let newPassword = '';

	let isLoading = false;

	async function requestPasswordReset() {
		try {
			isLoading = true;

			reqPassResetId = await hyperbase.adminRequestPasswordReset(email.toLowerCase().trim());

			toast.success('A verification code has been sent to your email');

			isLoading = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoading = false;
			}
		}
	}

	async function confirmPasswordReset() {
		try {
			isLoading = true;

			await hyperbase.adminConfirmPasswordReset(reqPassResetId, code.trim(), newPassword);

			toast.success('Successfully reset the password');

			goto(`${base}/auth/signin`, { replaceState: true });

			isLoading = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoading = false;
			}
		}
	}
</script>

<svelte:head>
	<title>Reset Password - Hyperbase UI</title>
</svelte:head>

<div class="flex-1 flex items-center">
	{#if !reqPassResetId}
		<form on:submit|preventDefault={requestPasswordReset} class="w-full max-w-96 mx-auto">
			<div>
				<h1 class="font-bold text-center text-4xl">Hyperbase</h1>
				<h2 class="mt-8 text-center text-lg">Admin request password reset</h2>
			</div>
			<div class="mt-8 space-y-6">
				<Input id="email" label="Email" type="email" required bind:value={email} />
				<Button type="submit" loading={isLoading}>Request Password Reset</Button>
			</div>
		</form>
	{:else}
		<form on:submit|preventDefault={confirmPasswordReset} class="w-full max-w-96 mx-auto">
			<div>
				<h1 class="font-bold text-center text-4xl">Hyperbase</h1>
				<h2 class="mt-8 text-center text-lg">Admin confirm password reset</h2>
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
				<Input
					id="password"
					label="New Password"
					type="password"
					required
					bind:value={newPassword}
				/>
				<Button type="submit" loading={isLoading}>Confirm Password Reset</Button>
			</div>
		</form>
	{/if}
</div>
