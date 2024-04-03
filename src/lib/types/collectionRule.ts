export interface CollectionRule {
	id: string;
	created_at: string;
	updated_at: string;
	project_id: string;
	token_id: string;
	collection_id: string;
	find_one: CollectionPermission;
	find_many: CollectionPermission;
	insert_one: boolean;
	update_one: CollectionPermission;
	delete_one: CollectionPermission;
}

export enum CollectionPermission {
	All = 'all',
	SelfMade = 'self_made',
	None = 'none'
}
