export interface AuthTokenData {
	id: string;
	kind: 'Admin' | 'User' | 'UserAnonymous';
	user?: {
		collection_id: string;
		id: string;
	};
	exp: number;
}
