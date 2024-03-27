import type { Error as HyperbaseError } from '$lib/hyperbase/hyperbase';
import toast from 'svelte-french-toast';

export default function errorHandler(err: unknown) {
	if (isHyperbaseError(err)) {
		toast.error(`${err.status}\n${err.message}`);
	} else {
		console.error(err);
	}
}

function isHyperbaseError(err: unknown): err is HyperbaseError {
	const e = err as HyperbaseError;
	return !!e.status && !!e.message;
}
