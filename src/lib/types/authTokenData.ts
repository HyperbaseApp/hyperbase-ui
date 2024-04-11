export interface AuthTokenData {
	id: {
		[kind: string]: string;
	};
	exp: number;
}
