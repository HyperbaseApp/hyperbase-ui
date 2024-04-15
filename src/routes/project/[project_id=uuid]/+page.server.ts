import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export async function load({ params }) {
	redirect(301, `${base}/project/${params.project_id}/collections`);
}
