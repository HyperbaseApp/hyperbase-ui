import type { Error as HyperbaseError } from '$lib/hyperbase/hyperbase';
import toast from 'svelte-french-toast';

export default function errorHandler(err: unknown) {
	if (isHyperbaseError(err)) {
		toast.error(`${err.status}\n${err.message}`);
		return 0;
	} else if (!isAbortControllerSignal(err)) {
		toast.error('An unexpected error occurred. Check the server url.');
		console.error(err);
	}
	return 1;
}

function isHyperbaseError(err: unknown): err is HyperbaseError {
	const e = err as HyperbaseError;
	return !!e.status && !!e.message;
}

function isAbortControllerSignal(err: unknown) {
	if (err instanceof DOMException && err.name === 'AbortError') {
		return true;
	} else {
		return false;
	}
}
