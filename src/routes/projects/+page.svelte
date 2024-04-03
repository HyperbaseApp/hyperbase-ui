<script lang="ts">
	import type Hyperbase from '$lib/hyperbase/hyperbase';
	import type { Project } from '$lib/types/project';
	import { base } from '$app/paths';
	import Button from '$lib/components/button/Button.svelte';
	import Input from '$lib/components/form/Input.svelte';
	import AddCircle from '$lib/components/icon/AddCircle.svelte';
	import Copy from '$lib/components/icon/Copy.svelte';
	import Loading from '$lib/components/icon/Loading.svelte';
	import copyText from '$lib/utils/copyText';
	import errorHandler from '$lib/utils/errorHandler';
	import { getContext, onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	const hyperbase = getContext<Hyperbase>('hyperbase');

	let abortController: AbortController;

	let projects: Project[] = [];

	let addProjectData = { name: '' };

	let isLoading = true;
	let isLoadingAddProject = false;
	let showModalAddProject = false;

	onMount(() => {
		refreshProjects();
	});

	async function refreshProjects() {
		try {
			if (abortController) {
				abortController.abort();
			}

			isLoading = true;

			abortController = new AbortController();
			const projectsData: Project[] = await hyperbase.getAllProjects(abortController.signal);
			projectsData.sort((a, b) => {
				const lowerA = a.name.toLocaleLowerCase();
				const lowerB = b.name.toLocaleLowerCase();
				return lowerA > lowerB ? 1 : lowerA === lowerB ? 0 : -1;
			});
			projects = projectsData;

			isLoading = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoading = false;
			}
		}
	}

	async function addProject() {
		try {
			isLoadingAddProject = true;

			await hyperbase.createProject(addProjectData.name.trim());

			await refreshProjects();
			showModalAddProject = false;
			addProjectData = {
				name: ''
			};

			isLoadingAddProject = false;
		} catch (err) {
			const code = errorHandler(err);
			if (code === 0) {
				isLoadingAddProject = false;
			}
		}
	}

	function copyTextToClipboard(text: string) {
		copyText(text);
		toast.success('Successfully copied to the clipboard');
	}
</script>

<svelte:head>
	<title>Projects - Hyperbase UI</title>
</svelte:head>

<div class="flex-1 flex items-center">
	<div class="w-full max-w-96 mx-auto">
		<div class="relative flex items-center justify-center">
			<h1 class="font-bold text-center text-4xl">Projects</h1>
			<button
				type="button"
				on:click|stopPropagation={() => (showModalAddProject = true)}
				class="absolute right-0"
			>
				<AddCircle class="w-8 h-8" />
			</button>
		</div>
		<div class="mt-8 flex flex-wrap items-center justify-center">
			{#if !isLoading}
				{#each projects as project}
					<div class="w-96 p-2">
						<a
							href="{base}/project/{project.id}/collections"
							class="py-2.5 px-4 block border rounded"
						>
							<div class="flex items-center gap-x-2 text-gray-500">
								<p class="text-sm">{project.id}</p>
								<button
									type="button"
									on:click|preventDefault={() => copyTextToClipboard(project.id)}
								>
									<Copy class="w-5 h-5 hover:text-black" />
								</button>
							</div>
							<p>{project.name}</p>
						</a>
					</div>
				{:else}
					<div class="p-4">
						<p class="font-bold text-center text-lg">No Projects</p>
						<p class="mt-2.5 text-center">Get started by creating a new project.</p>
						<div class="mt-4">
							<Button
								type="button"
								height="h-10"
								on:click={(e) => {
									e.stopPropagation();
									showModalAddProject = true;
								}}
							>
								Create a new project
							</Button>
						</div>
					</div>
				{/each}
			{:else}
				<Loading class="w-12 h-12 animate-spin" />
			{/if}
		</div>
	</div>
</div>

{#if showModalAddProject}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		on:click|stopPropagation={() => (showModalAddProject = false)}
		class="fixed w-screen h-screen p-4 flex items-center justify-center bg-black/20"
	>
		<div on:click={(e) => e.stopPropagation()} class="w-full max-w-96 p-8 bg-white rounded-xl">
			<form on:submit|preventDefault={addProject}>
				<div>
					<p class="font-bold text-center text-2xl">Create Project</p>
				</div>
				<div class="mt-8 space-y-6">
					<Input
						id="project_name"
						label="Project Name"
						type="text"
						required
						autocomplete={false}
						bind:value={addProjectData.name}
					/>
					<div class="flex gap-x-2">
						<Button
							type="button"
							kind="secondary"
							disable={isLoadingAddProject}
							height="h-10"
							on:click={(e) => {
								e.stopPropagation();
								showModalAddProject = false;
							}}
						>
							Cancel
						</Button>
						<Button type="submit" loading={isLoadingAddProject} height="h-10">Create</Button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
