export interface Collection {
	id: string;
	created_at: string;
	updated_at: string;
	project_id: string;
	name: string;
	schema_fields: SchemaField;
	opt_auth_column_id: boolean;
}

export interface SchemaField {
	[field: string]: {
		kind: SchemaFieldKind;
		required: boolean;
		indexed: boolean;
		unique: boolean;
		auth_column: boolean;
	};
}

export type SchemaFieldKind =
	| 'boolean'
	| 'tinyint'
	| 'smallint'
	| 'int'
	| 'bigint'
	| 'varint'
	| 'float'
	| 'double'
	| 'decimal'
	| 'string'
	| 'binary'
	| 'uuid'
	| 'date'
	| 'time'
	| 'timestamp'
	| 'json';
