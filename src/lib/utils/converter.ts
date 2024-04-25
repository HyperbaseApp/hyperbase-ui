import type { SchemaField } from '$lib/types/collection';

export function formatSchemaFieldData(
	data: { [field: string]: unknown },
	schemaFields: SchemaField
) {
	delete data._id;
	delete data._updated_at;

	for (const [field, props] of Object.entries(schemaFields)) {
		if (props.required || props.indexed || props.auth_column) {
			if (!data[field]) {
				if (props.kind !== 'boolean') {
					return {
						data: undefined,
						error: `Value for '${field}' is required`
					};
				} else {
					data[field] = false;
				}
			}
		}
	}

	for (const [field, value] of Object.entries(data)) {
		if (field === '_created_by') continue;

		const props = schemaFields[field];

		if (value === '' && !props.required && props.kind !== 'string') {
			data[field] = null;
			continue;
		} else if (props.kind === 'string' && value === String.raw`\null`) {
			data[field] = null;
			continue;
		}

		switch (props.kind) {
			case 'boolean':
				if (typeof value !== 'boolean') {
					const v = !!value;
					data[field] = v;
				}
				break;
			case 'tinyint':
			case 'smallint':
			case 'int':
			case 'bigint':
			case 'float':
			case 'double':
				if (typeof value !== 'number') {
					const v = Number(value);
					if (!isNaN(v)) {
						data[field] = v;
					} else {
						return {
							data: undefined,
							error: `Field '${field}' has an incorrect type value`
						};
					}
				}
				break;
			case 'varint':
			case 'decimal':
			case 'uuid':
			case 'date':
			case 'time':
				if (typeof value !== 'string') {
					const v = String(value);
					data[field] = v;
				}
				break;
			case 'string':
				if (value && typeof value !== 'string') {
					const v = String(value);
					data[field] = v;
				}
				break;
			case 'json':
				if (typeof value !== 'string') {
					const v = JSON.stringify(value);
					data[field] = v;
				}
				break;
			case 'binary':
				break;
			case 'timestamp':
				if (typeof value !== 'string') {
					const v = String(value);
					data[field] = v;
				}
				data[field] = convertDatetimeLocalToTimestamp(data[field] as string);
				break;
		}
	}
	return { data, error: undefined };
}

export function convertTimestampToDatetimeLocal(ts: string) {
	const t = new Date(ts);
	const year = t.getFullYear();
	const month = t.getMonth() + 1;
	const date = t.getDate();
	const hours = t.getHours();
	const minutes = t.getMinutes();
	const seconds = t.getSeconds();
	return `${year}-${month < 10 ? `0${month}` : month}-${date < 10 ? `0${date}` : date}T${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
}

export function convertDatetimeLocalToTimestamp(dt: string) {
	const t = new Date(dt);
	return t.toISOString();
}
