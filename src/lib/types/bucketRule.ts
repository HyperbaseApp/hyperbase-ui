export interface BucketRule {
	id: string;
	created_at: string;
	updated_at: string;
	project_id: string;
	token_id: string;
	bucket_id: string;
	find_one: BucketPermission;
	find_many: BucketPermission;
	insert_one: boolean;
	update_one: BucketPermission;
	delete_one: BucketPermission;
}

export enum BucketPermission {
	All = 'all',
	SelfMade = 'self_made',
	None = 'none'
}
