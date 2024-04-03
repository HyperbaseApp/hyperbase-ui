import { base } from '$app/paths';
import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	redirect(301, `${base}/project/${params.project_id}/collections`);
}
