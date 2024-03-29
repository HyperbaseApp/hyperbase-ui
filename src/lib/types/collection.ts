export interface Collection {
	id: string;
	created_at: string;
	updated_at: string;
	project_id: string;
	name: string;
	schema_fields: {
		[field: string]: {
			kind: string;
			required: boolean;
			indexed: boolean;
			auth_column: boolean;
		};
	};
	indexes: string[];
	auth_columns: string[];
}
