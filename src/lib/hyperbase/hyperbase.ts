import type { Admin } from '$lib/types/admin';
import type { AuthTokenData } from '$lib/types/authTokenData';
import type { Bucket } from '$lib/types/bucket';
import type { Collection, SchemaFieldProps } from '$lib/types/collection';
import type { Project } from '$lib/types/project';
import type { Token } from '$lib/types/token';
import { jwtDecode } from 'jwt-decode';
import { writable } from 'svelte/store';

export default class Hyperbase {
	#_baseUrl = '';
	#_baseWsUrl = '';
	#_authToken?: string;

	#_adminData?: Admin;
	#_admin = writable<Admin | undefined>();

	#_authState = writable(AuthState.Unauthenticated);
	#_isReady = writable(false);

	get baseUrl() {
		return this.#_baseUrl;
	}

	get baseWsUrl() {
		return this.#_baseWsUrl;
	}

	get authToken() {
		return this.#_authToken;
	}

	get admin() {
		return this.#_admin;
	}

	get authState() {
		return this.#_authState;
	}

	get isReady() {
		return this.#_isReady;
	}

	async init() {
		try {
			const baseUrl = localStorage.getItem('base_url');
			const baseWsUrl = localStorage.getItem('base_ws_url');
			if (baseUrl && baseUrl !== this.#_baseUrl) {
				this.#_baseUrl = baseUrl;
				localStorage.setItem('base_url', baseUrl);
			}
			if (baseWsUrl && baseWsUrl !== this.#_baseWsUrl) {
				this.#_baseWsUrl = baseWsUrl;
				localStorage.setItem('base_ws_url', baseWsUrl);
			}

			const token = localStorage.getItem('token');
			if (token) {
				const loadToken = await this.#setAuthToken(token);
				if (loadToken) {
					this.#setTokenStorage(loadToken);
					this.#_authToken = loadToken;
					this.#_authState.set(AuthState.Authenticated);
					this.#_isReady.set(true);

					const decodedJwt = jwtDecode<AuthTokenData>(loadToken);
					if (!decodedJwt.id.Admin && decodedJwt.id.Token) {
						throw 'Must signin using admin account';
					}

					this.#getAdminData();
				}
			}

			return { baseUrl: this.#_baseUrl, baseWsUrl: this.#_baseWsUrl };
		} catch (err) {
			this.#removeTokenStorage();
			this.#_authState.set(AuthState.Unauthenticated);
			throw err;
		} finally {
			this.#_isReady.set(true);
		}
	}

	changeServerInternal(baseUrl: string, baseWsUrl: string) {
		this.#_baseUrl = baseUrl;
		this.#_baseWsUrl = baseWsUrl;
	}

	changeServer(baseUrl: string, baseWsUrl?: string) {
		localStorage.setItem('base_url', baseUrl);
		if (baseWsUrl) {
			localStorage.setItem('base_ws_url', baseWsUrl);
		}
		location.reload();
	}

	async adminSignUp(data: { email: string; password: string }, abortSignal?: AbortSignal) {
		const res = await this.#api('/auth/register', {
			method: 'POST',
			body: JSON.stringify({
				email: data.email,
				password: data.password
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data.id;
	}

	async adminSignUpVerify(data: { id: string; code: string }, abortSignal?: AbortSignal) {
		await this.#api('/auth/verify-registration', {
			method: 'POST',
			body: JSON.stringify({
				id: data.id,
				code: data.code
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});
	}

	async adminSignIn(data: { email: string; password: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/auth/password-based`, {
			method: 'POST',
			body: JSON.stringify({
				email: data.email,
				password: data.password
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		this.#setTokenStorage(res.data.token);
		this.#_authToken = res.data.token;
		this.#_authState.set(AuthState.Authenticated);

		this.#getAdminData();

		return this.#_authToken;
	}

	async adminRequestPasswordReset(data: { email: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/auth/request-password-reset`, {
			method: 'POST',
			body: JSON.stringify({
				email: data.email
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data.id;
	}

	async adminConfirmPasswordReset(
		data: { id: string; code: string; password: string },
		abortSignal?: AbortSignal
	) {
		await this.#api(`/auth/confirm-password-reset`, {
			method: 'POST',
			body: JSON.stringify({
				id: data.id,
				code: data.code,
				password: data.password
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});
	}

	async adminDelete() {
		if (!this.#_adminData) return;
		await this.#api(`/admin`, {
			method: 'DELETE',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			}
		});
		this.signOut();
		location.reload();
	}

	async userSignIn(
		data: { tokenId: string; token: string; collectionId: string; data: any },
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/auth/token-based`, {
			method: 'POST',
			body: JSON.stringify({
				token_id: data.tokenId,
				token: data.token,
				collection_id: data.collectionId,
				data: data.data
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		this.#setTokenStorage(res.data.token);
		this.#_authToken = res.data.token;
		this.#_authState.set(AuthState.Authenticated);

		return this.#_authToken;
	}

	signOut() {
		this.#removeTokenStorage();
		this.#_adminData = undefined;
		this.#_admin.set(undefined);
		this.#_authToken = undefined;
		this.#_authState.set(AuthState.Unauthenticated);
	}

	async getUserData(abortSignal?: AbortSignal) {
		const res = await this.#api(`/user`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			},
			signal: abortSignal
		});

		return res.data;
	}

	async createProject(data: { name: string }, abortSignal?: AbortSignal) {
		const res = await this.#api('/project', {
			method: 'POST',
			body: JSON.stringify({
				name: data.name
			}),
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${this.#_authToken}`
			},
			signal: abortSignal
		});

		return res.data;
	}

	async getProject(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/project/${data.id}`, {
			method: 'GET',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${this.#_authToken}`
			},
			signal: abortSignal
		});

		return new HyperbaseProject(this, res.data);
	}

	async getAllProjects(abortSignal?: AbortSignal) {
		const res = await this.#api('/projects', {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			},
			signal: abortSignal
		});

		return res.data;
	}

	async getInfoAllSupportedSchemaFields(abortSignal?: AbortSignal) {
		const res = await this.#api('/info/schema_fields', {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async getInfoAdminRegistration(abortSignal?: AbortSignal) {
		const res = await this.#api('/info/admin_registration', {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async health(abortSignal?: AbortSignal) {
		try {
			await this.#api('', { signal: abortSignal });
			return true;
		} catch (_) {
			return false;
		}
	}

	async #getAdminData(abortSignal?: AbortSignal) {
		const res = await this.#api(`/admin`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			},
			signal: abortSignal
		});

		this.#_adminData = res.data;
		this.#_admin.set(res.data);

		return res.data;
	}

	async #setAuthToken(authToken: string, abortSignal?: AbortSignal) {
		const res = await this.#api('/auth/token', {
			method: 'GET',
			headers: {
				authorization: `Bearer ${authToken}`
			},
			signal: abortSignal
		});

		this.#_authToken = res.data.token;
		this.#_authState.set(AuthState.Authenticated);

		return this.#_authToken;
	}

	async #setTokenStorage(authToken: string) {
		localStorage.setItem('token', authToken);
	}

	async #removeTokenStorage() {
		localStorage.removeItem('token');
	}

	async #api(input: string, init: RequestInit) {
		const res = await fetch(`${this.#_baseUrl}/api/rest${input}`, init);
		const resJson = await res.json();
		if (res.status.toString()[0] != '2') {
			throw resJson.error;
		}
		return resJson;
	}
}

export class HyperbaseProject {
	#_hyperbase: Hyperbase;
	#_data: Project;

	get hyperbase() {
		return this.#_hyperbase;
	}

	get data() {
		return this.#_data;
	}

	constructor(hyperbase: Hyperbase, project: Project) {
		this.#_hyperbase = hyperbase;
		this.#_data = project;
	}

	async update(data: { name: string }, abortSignal?: AbortSignal) {
		const res = await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name: data.name
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		this.#_data = res.data;

		return res.data;
	}

	async transfer(data: { adminEmail: string }, abortSignal?: AbortSignal) {
		await this.#api('/transfer', {
			method: 'POST',
			body: JSON.stringify({
				admin_email: data.adminEmail
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});
	}

	async duplicate(data: { withRecords: boolean; withFiles: boolean }, abortSignal?: AbortSignal) {
		await this.#api('/duplicate', {
			method: 'POST',
			body: JSON.stringify({
				with_records: data.withRecords,
				with_files: data.withFiles
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});
	}

	async delete(abortSignal?: AbortSignal) {
		await this.#api('', {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async getCollection(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/collection/${data.id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return new HyperbaseCollection(this, res.data);
	}

	async getBucket(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/bucket/${data.id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return new HyperbaseBucket(this, res.data);
	}

	async getToken(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/token/${data.id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return new HyperbaseToken(this, res.data);
	}

	async createCollection(
		data: {
			name: string;
			schemaFields: {
				[field: string]: SchemaFieldProps;
			};
			optAuthColumnId: boolean;
			optTTL: number | null;
		},
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/collection`, {
			method: 'POST',
			body: JSON.stringify({
				name: data.name,
				schema_fields: data.schemaFields,
				opt_auth_column_id: data.optAuthColumnId,
				opt_ttl: data.optTTL
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async createBucket(data: { name: string; optTTL: number | null }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/bucket`, {
			method: 'POST',
			body: JSON.stringify({
				name: data.name,
				opt_ttl: data.optTTL
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async createToken(
		data: { name: string; allowAnonymous: boolean; expiredAt: string | null },
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/token`, {
			method: 'POST',
			body: JSON.stringify({
				name: data.name,
				allow_anonymous: data.allowAnonymous,
				expired_at: data.expiredAt
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async getAllCollections(abortSignal?: AbortSignal) {
		const res = await this.#api(`/collections`, {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async getAllBuckets(abortSignal?: AbortSignal) {
		const res = await this.#api(`/buckets`, {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async getAllTokens(abortSignal?: AbortSignal) {
		const res = await this.#api(`/tokens`, {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async getManyLogs(data: { beforeId?: string; limit?: number }, abortSignal?: AbortSignal) {
		let query = '';
		if (data.beforeId) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `before_id=${data.beforeId}`;
		}
		if (data.limit) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `limit=${data.limit}`;
		}
		const res = await this.#api(`/logs${query}`, {
			method: 'GET',
			signal: abortSignal
		});

		return res;
	}

	getLog() {
		return new HyperbaseLog(this);
	}

	async #api(input: string, init: RequestInit) {
		const res = await fetch(
			`${this.#_hyperbase.baseUrl}/api/rest/project/${this.#_data.id}${input}`,
			{
				...init,
				headers: {
					...init.headers,
					authorization: `Bearer ${this.#_hyperbase.authToken}`
				}
			}
		);
		const resJson = await res.json();
		if (res.status.toString()[0] != '2') {
			throw resJson.error;
		}
		return resJson;
	}
}

export class HyperbaseCollection {
	#_hyperbaseProject: HyperbaseProject;
	#_data: Collection;
	#_socket?: WebSocket;

	get data() {
		return this.#_data;
	}

	constructor(hyperbaseProject: HyperbaseProject, collection: Collection) {
		this.#_hyperbaseProject = hyperbaseProject;
		this.#_data = collection;
	}

	async update(
		data: {
			name: string;
			schemaFields: {
				[field: string]: SchemaFieldProps;
			};
			optAuthColumnId: boolean;
			optTTL: number | null;
		},
		abortSignal?: AbortSignal
	) {
		const res = await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name: data.name,
				schema_fields: data.schemaFields,
				opt_auth_column_id: data.optAuthColumnId,
				opt_ttl: data.optTTL
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		this.#_data = res.data;

		return res.data;
	}

	async delete(abortSignal?: AbortSignal) {
		await this.#api('', {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async insertOne(data: { object: { [field: string]: any } }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/record`, {
			method: 'POST',
			body: JSON.stringify(data.object),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async findOneRecord(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/record/${data.id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async updateOneRecord(
		data: { id: string; object: { [field: string]: any } },
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/record/${data.id}`, {
			method: 'PATCH',
			body: JSON.stringify(data.object),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async deleteOneRecord(data: { id: string }, abortSignal?: AbortSignal) {
		await this.#api(`/record/${data.id}`, {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async findManyRecords(
		data?: {
			fields?: string[];
			filters?: CollectionFilter[];
			groups?: string[];
			orders?: CollectionOrder[];
			limit?: number;
		},
		abortSignal?: AbortSignal
	) {
		let fields, filters, groups, orders, limit;

		if (data) {
			({ fields, filters, groups, orders, limit } = data);
		}

		const res = await this.#api(`/records`, {
			method: 'POST',
			body: JSON.stringify({
				fields,
				filters,
				groups,
				orders,
				limit
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res;
	}

	async subscribe(callbacks?: {
		onOpenCallback?: (ev: Event) => void;
		onMessageCallback?: (ev: MessageEvent) => void;
		onErrorCallback?: (ev: Event) => void;
		onCloseCallback?: (ev: CloseEvent) => void;
	}) {
		if (this.#_socket) {
			this.unsubscribe();
		}

		let onOpenCallback, onMessageCallback, onErrorCallback, onCloseCallback;

		if (callbacks) {
			({ onOpenCallback, onMessageCallback, onErrorCallback, onCloseCallback } = callbacks);
		}

		this.#_socket = new WebSocket(
			`${this.#_hyperbaseProject.hyperbase.baseWsUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/collection/${this.#_data.id}/subscribe?token=${this.#_hyperbaseProject.hyperbase.authToken}`
		);

		if (onOpenCallback) {
			this.#_socket.addEventListener('open', onOpenCallback);
		}

		if (onMessageCallback) {
			this.#_socket.addEventListener('message', onMessageCallback);
		}

		if (onErrorCallback) {
			this.#_socket.addEventListener('error', onErrorCallback);
		}

		if (onCloseCallback) {
			this.#_socket.addEventListener('close', onCloseCallback);
		}
	}

	async unsubscribe(close?: { code?: number; reason?: string }) {
		let code, reason;

		if (close) {
			({ code, reason } = close);
		}

		this.#_socket?.close(code, reason);
		this.#_socket = undefined;
	}

	async #api(input: string, init: RequestInit) {
		const res = await fetch(
			`${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/collection/${this.#_data.id}${input}`,
			{
				...init,
				headers: {
					...init.headers,
					authorization: `Bearer ${this.#_hyperbaseProject.hyperbase.authToken}`
				}
			}
		);
		const resJson = await res.json();
		if (res.status.toString()[0] != '2') {
			throw resJson.error;
		}
		return resJson;
	}
}

export class HyperbaseBucket {
	#_hyperbaseProject: HyperbaseProject;
	#_data: Bucket;

	get data() {
		return this.#_data;
	}

	constructor(hyperbaseProject: HyperbaseProject, bucket: Bucket) {
		this.#_hyperbaseProject = hyperbaseProject;
		this.#_data = bucket;
	}

	async update(data: { name: string; optTTL: number | null }, abortSignal?: AbortSignal) {
		const res = await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name: data.name,
				opt_ttl: data.optTTL
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		this.#_data = res.data;

		return res.data;
	}

	async delete(abortSignal?: AbortSignal) {
		await this.#api('', {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async insertOneFile(data: { file: File; fileName?: string }, abortSignal?: AbortSignal) {
		const formData = new FormData();
		formData.append('file', data.file);
		if (data.fileName) {
			formData.append('file_name', data.fileName);
		}
		const res = await this.#api(`/file`, {
			method: 'POST',
			body: formData,
			signal: abortSignal
		});

		return res.data;
	}

	async findOneFile(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/file/${data.id}`, {
			method: 'HEAD',
			signal: abortSignal
		});

		return res.data;
	}

	async updateOneFile(
		data: { id: string; createdBy: string; fileName: string; public: boolean },
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/file/${data.id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				created_by: data.createdBy,
				file_name: data.fileName,
				public: data.public
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async deleteOneFile(data: { id: string }, abortSignal?: AbortSignal) {
		await this.#api(`/file/${data.id}`, {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async findManyFiles(data: { beforeId?: string; limit?: number }, abortSignal?: AbortSignal) {
		let query = '';
		if (data.beforeId) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `before_id=${data.beforeId}`;
		}
		if (data.limit) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `limit=${data.limit}`;
		}
		const res = await this.#api(`/files${query}`, {
			method: 'GET',
			signal: abortSignal
		});

		return res;
	}

	getDownloadFileUrl(id: string, pub: boolean) {
		let url = `${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/bucket/${this.#_data.id}/file/${id}`;
		if (!pub) {
			url += `?token=${this.#_hyperbaseProject.hyperbase.authToken}`;
		}
		return url;
	}

	async #api(input: string, init: RequestInit) {
		const res = await fetch(
			`${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/bucket/${this.#_data.id}${input}`,
			{
				...init,
				headers: {
					...init.headers,
					authorization: `Bearer ${this.#_hyperbaseProject.hyperbase.authToken}`
				}
			}
		);
		const resJson = await res.json();
		if (res.status.toString()[0] != '2') {
			throw resJson.error;
		}
		return resJson;
	}
}

export class HyperbaseToken {
	#_hyperbaseProject: HyperbaseProject;
	#_data: Token;

	get data() {
		return this.#_data;
	}

	constructor(hyperbaseProject: HyperbaseProject, token: Token) {
		this.#_hyperbaseProject = hyperbaseProject;
		this.#_data = token;
	}

	async update(
		data: { name?: string; allowAnonymous?: boolean; expiredAt: string | null },
		abortSignal?: AbortSignal
	) {
		const res = await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name: data.name,
				allow_anonymous: data.allowAnonymous,
				expired_at: data.expiredAt
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		this.#_data = res.data;

		return res.data;
	}

	async delete(abortSignal?: AbortSignal) {
		await this.#api('', {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async insertOneCollectionRule(
		data: {
			id: string;
			findOne: string;
			findMany: string;
			insertOne: boolean;
			updateOne: string;
			deleteOne: string;
		},
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/collection_rule`, {
			method: 'POST',
			body: JSON.stringify({
				collection_id: data.id,
				find_one: data.findOne,
				find_many: data.findMany,
				insert_one: data.insertOne,
				update_one: data.updateOne,
				delete_one: data.deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async insertOneBucketRule(
		data: {
			id: string;
			findOne: string;
			findMany: string;
			insertOne: boolean;
			updateOne: string;
			deleteOne: string;
		},
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/bucket_rule`, {
			method: 'POST',
			body: JSON.stringify({
				bucket_id: data.id,
				find_one: data.findOne,
				find_many: data.findMany,
				insert_one: data.insertOne,
				update_one: data.updateOne,
				delete_one: data.deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async findOneCollectionRule(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/collection_rule/${data.id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async findOneBucketRule(data: { id: string }, abortSignal?: AbortSignal) {
		const res = await this.#api(`/bucket_rule/${data.id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return res.data;
	}

	async updateOneCollectionRule(
		data: {
			id: string;
			findOne?: string;
			findMany?: string;
			insertOne?: boolean;
			updateOne?: string;
			deleteOne?: string;
		},
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/collection_rule/${data.id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				find_one: data.findOne,
				find_many: data.findMany,
				insert_one: data.insertOne,
				update_one: data.updateOne,
				delete_one: data.deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async updateOneBucketRule(
		data: {
			id: string;
			findOne?: string;
			findMany?: string;
			insertOne?: boolean;
			updateOne?: string;
			deleteOne?: string;
		},
		abortSignal?: AbortSignal
	) {
		const res = await this.#api(`/bucket_rule/${data.id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				find_one: data.findOne,
				find_many: data.findMany,
				insert_one: data.insertOne,
				update_one: data.updateOne,
				delete_one: data.deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			},
			signal: abortSignal
		});

		return res.data;
	}

	async deleteOneCollectionRule(data: { id: string }, abortSignal?: AbortSignal) {
		await this.#api(`/collection_rule/${data.id}`, {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async deleteOneBucketRule(data: { id: string }, abortSignal?: AbortSignal) {
		await this.#api(`/bucket_rule/${data.id}`, {
			method: 'DELETE',
			signal: abortSignal
		});
	}

	async findManyCollectionRules(abortSignal?: AbortSignal) {
		const res = await this.#api(`/collection_rules`, {
			method: 'GET',
			signal: abortSignal
		});

		return res;
	}

	async findManyBucketRules(abortSignal?: AbortSignal) {
		const res = await this.#api(`/bucket_rules`, {
			method: 'GET',
			signal: abortSignal
		});

		return res;
	}

	async #api(input: string, init: RequestInit) {
		const res = await fetch(
			`${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/token/${this.#_data.id}${input}`,
			{
				...init,
				headers: {
					...init.headers,
					authorization: `Bearer ${this.#_hyperbaseProject.hyperbase.authToken}`
				}
			}
		);
		const resJson = await res.json();
		if (res.status.toString()[0] != '2') {
			throw resJson.error;
		}
		return resJson;
	}
}

export class HyperbaseLog {
	#_hyperbaseProject: HyperbaseProject;
	#_socket?: WebSocket;

	constructor(hyperbaseProject: HyperbaseProject) {
		this.#_hyperbaseProject = hyperbaseProject;
	}

	async findManyLogs(data: { beforeId?: string; limit?: number }, abortSignal?: AbortSignal) {
		let query = '';
		if (data.beforeId) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `before_id=${data.beforeId}`;
		}
		if (data.limit) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `limit=${data.limit}`;
		}
		const res = await this.#api(query, {
			method: 'GET',
			signal: abortSignal
		});

		return res;
	}

	async subscribe(callbacks?: {
		onOpenCallback?: (ev: Event) => void;
		onMessageCallback?: (ev: MessageEvent) => void;
		onErrorCallback?: (ev: Event) => void;
		onCloseCallback?: (ev: CloseEvent) => void;
	}) {
		if (this.#_socket) {
			this.unsubscribe();
		}

		let onOpenCallback, onMessageCallback, onErrorCallback, onCloseCallback;

		if (callbacks) {
			({ onOpenCallback, onMessageCallback, onErrorCallback, onCloseCallback } = callbacks);
		}

		this.#_socket = new WebSocket(
			`${this.#_hyperbaseProject.hyperbase.baseWsUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/logs/subscribe?token=${this.#_hyperbaseProject.hyperbase.authToken}`
		);

		if (onOpenCallback) {
			this.#_socket.addEventListener('open', onOpenCallback);
		}

		if (onMessageCallback) {
			this.#_socket.addEventListener('message', onMessageCallback);
		}

		if (onErrorCallback) {
			this.#_socket.addEventListener('error', onErrorCallback);
		}

		if (onCloseCallback) {
			this.#_socket.addEventListener('close', onCloseCallback);
		}
	}

	async unsubscribe(close?: { code?: number; reason?: string }) {
		let code, reason;

		if (close) {
			({ code, reason } = close);
		}

		this.#_socket?.close(code, reason);
		this.#_socket = undefined;
	}

	async #api(input: string, init: RequestInit) {
		const res = await fetch(
			`${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/logs${input}`,
			{
				...init,
				headers: {
					...init.headers,
					authorization: `Bearer ${this.#_hyperbaseProject.hyperbase.authToken}`
				}
			}
		);
		const resJson = await res.json();
		if (res.status.toString()[0] != '2') {
			throw resJson.error;
		}
		return resJson;
	}
}

export enum AuthState {
	Unauthenticated,
	Authenticated
}

interface CollectionFilter {
	field?: string;
	op: string;
	value?: string;
	children?: CollectionFilter[];
}

interface CollectionOrder {
	field: string;
	kind: 'desc' | 'asc';
}

export interface Error {
	status: string;
	message: string;
}
