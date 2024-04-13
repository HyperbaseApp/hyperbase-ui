export interface Collection {
	id: string;
	created_at: string;
	updated_at: string;
	project_id: string;
	name: string;
	schema_fields: SchemaField;
	opt_auth_column_id: boolean;
	opt_ttl?: number;
}

export interface SchemaField {
	[field: string]: SchemaFieldProps;
}

export interface SchemaFieldProps {
	kind: '' | SchemaFieldKind;
	required: boolean;
	indexed: boolean;
	unique: boolean;
	auth_column: boolean;
	hidden: boolean;
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
