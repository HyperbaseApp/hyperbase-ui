export interface Token {
	id: string;
	created_at: string;
	updated_at: string;
	project_id: string;
	admin_id: string;
	name: string;
	token: string;
	allow_anonymous: boolean;
	expired_at?: string;
}
