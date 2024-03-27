<script lang="ts">
	import { setContext } from 'svelte';
	import Hyperbase from '$lib/hyperbase/hyperbase';
	import hyperbaseConfig from '$lib/hyperbase/hyperbaseConfig.json';
	import '../app.css';
	import { Toaster } from 'svelte-french-toast';

	setContext('hyperbase', new Hyperbase(hyperbaseConfig.base_url, hyperbaseConfig.base_ws_url));
</script>

<slot />
<Toaster />
