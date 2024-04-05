import type { Admin } from '$lib/types/admin';
import type { AuthTokenData } from '$lib/types/authTokenData';
import type { Bucket } from '$lib/types/bucket';
import type { Collection } from '$lib/types/collection';
import type { Project } from '$lib/types/project';
import type { Token } from '$lib/types/token';
import { jwtDecode } from 'jwt-decode';
import { writable } from 'svelte/store';

export default class Hyperbase {
	#_baseUrl: string;
	#_baseWsUrl?: string;
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

	constructor(defaultBaseUrl: string, defaultBaseWsUrl?: string) {
		this.#_baseUrl = defaultBaseUrl;
		this.#_baseWsUrl = defaultBaseWsUrl;
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
					if (decodedJwt.kind !== 'Admin') {
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

	changeServer(baseUrl: string, baseWsUrl?: string) {
		localStorage.setItem('base_url', baseUrl);
		if (baseWsUrl) {
			localStorage.setItem('base_ws_url', baseWsUrl);
		}
		location.reload();
	}

	async adminSignUp(email: string, password: string) {
		const res = await this.#api('/auth/register', {
			method: 'POST',
			body: JSON.stringify({
				email,
				password
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data.id;
	}

	async adminSignUpVerify(id: string, code: string) {
		await this.#api('/auth/verify-registration', {
			method: 'POST',
			body: JSON.stringify({
				id,
				code
			}),
			headers: {
				'content-type': 'application/json'
			}
		});
	}

	async adminSignIn(email: string, password: string) {
		const res = await this.#api(`/auth/password-based`, {
			method: 'POST',
			body: JSON.stringify({
				email,
				password
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		this.#setTokenStorage(res.data.token);
		this.#_authToken = res.data.token;
		this.#_authState.set(AuthState.Authenticated);

		this.#getAdminData();

		return this.#_authToken;
	}

	async adminRequestPasswordReset(email: string) {
		const res = await this.#api(`/auth/request-password-reset`, {
			method: 'POST',
			body: JSON.stringify({
				email
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data.id;
	}

	async adminConfirmPasswordReset(id: string, code: string, password: string) {
		await this.#api(`/auth/confirm-password-reset`, {
			method: 'POST',
			body: JSON.stringify({
				id,
				code,
				password
			}),
			headers: {
				'content-type': 'application/json'
			}
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

	async userSignIn(tokenId: string, token: string, collectionId: string, data: any) {
		const res = await this.#api(`/auth/token-based`, {
			method: 'POST',
			body: JSON.stringify({
				token_id: tokenId,
				token: token,
				collection_id: collectionId,
				data
			}),
			headers: {
				'content-type': 'application/json'
			}
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

	async getUserData() {
		const res = await this.#api(`/user`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			}
		});

		return res.data;
	}

	async createProject(name: string) {
		const res = await this.#api('/project', {
			method: 'POST',
			body: JSON.stringify({
				name
			}),
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${this.#_authToken}`
			}
		});

		return res.data;
	}

	async getProject(id: string) {
		const res = await this.#api(`/project/${id}`, {
			method: 'GET',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${this.#_authToken}`
			}
		});

		return new HyperbaseProject(this, res.data);
	}

	async getAllProjects(abortSignal: AbortSignal | null) {
		const res = await this.#api('/projects', {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			},
			signal: abortSignal
		});

		return res.data;
	}

	async getInfoAllSupportedSchemaFields() {
		const res = await this.#api('/info/schema_fields', {
			method: 'GET'
		});

		return res.data;
	}

	async getInfoAdminRegistration() {
		const res = await this.#api('/info/admin_registration', {
			method: 'GET'
		});

		return res.data;
	}

	async #getAdminData() {
		const res = await this.#api(`/admin`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			}
		});

		this.#_adminData = res.data;
		this.#_admin.set(res.data);

		return res.data;
	}

	async #setAuthToken(authToken: string) {
		const res = await this.#api('/auth/token', {
			method: 'GET',
			headers: {
				authorization: `Bearer ${authToken}`
			}
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

	async update(name: string) {
		await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name
			}),
			headers: {
				'content-type': 'application/json'
			}
		});
	}

	async delete() {
		await this.#api('', {
			method: 'DELETE'
		});
	}

	async getCollection(abortSignal: AbortSignal | null, id: string) {
		const res = await this.#api(`/collection/${id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return new HyperbaseCollection(this, res.data);
	}

	async getBucket(abortSignal: AbortSignal | null, id: string) {
		const res = await this.#api(`/bucket/${id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return new HyperbaseBucket(this, res.data);
	}

	async getToken(abortSignal: AbortSignal | null, id: string) {
		const res = await this.#api(`/token/${id}`, {
			method: 'GET',
			signal: abortSignal
		});

		return new HyperbaseToken(this, res.data);
	}

	async createCollection(data: {
		name: string;
		schemaFields: {
			[field: string]: {
				kind: string;
				required?: boolean;
				indexed?: boolean;
				auth_column?: boolean;
			};
		};
		optAuthColumnId: boolean;
	}) {
		const res = await this.#api(`/collection`, {
			method: 'POST',
			body: JSON.stringify({
				name: data.name,
				schema_fields: data.schemaFields,
				opt_auth_column_id: data.optAuthColumnId
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async createBucket(data: { name: string }) {
		const res = await this.#api(`/bucket`, {
			method: 'POST',
			body: JSON.stringify({
				name: data.name
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async createToken(data: { name: string; allowAnonymous: boolean; expiredAt: string | null }) {
		const res = await this.#api(`/token`, {
			method: 'POST',
			body: JSON.stringify({
				name: data.name,
				allow_anonymous: data.allowAnonymous,
				expired_at: data.expiredAt
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async getAllCollections() {
		const res = await this.#api(`/collections`, {
			method: 'GET'
		});

		return res.data;
	}

	async getAllBuckets() {
		const res = await this.#api(`/buckets`, {
			method: 'GET'
		});

		return res.data;
	}

	async getAllTokens() {
		const res = await this.#api(`/tokens`, {
			method: 'GET'
		});

		return res.data;
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

	async update(data: {
		name: string;
		schemaFields: {
			[field: string]: {
				kind: string;
				required?: boolean;
				indexed?: boolean;
				auth_column?: boolean;
			};
		};
		optAuthColumnId: boolean;
	}) {
		await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name: data.name,
				schema_fields: data.schemaFields,
				opt_auth_column_id: data.optAuthColumnId
			}),
			headers: {
				'content-type': 'application/json'
			}
		});
	}

	async delete() {
		await this.#api('', {
			method: 'DELETE'
		});
	}

	async insertOne(object: { [field: string]: any }) {
		const res = await this.#api(`/record`, {
			method: 'POST',
			body: JSON.stringify(object),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async findOneRecord(_id: string) {
		const res = await this.#api(`/record/${_id}`, {
			method: 'GET'
		});

		return res.data;
	}

	async updateOneRecord(_id: string, object: { [field: string]: any }) {
		const res = await this.#api(`/record/${_id}`, {
			method: 'PATCH',
			body: JSON.stringify(object),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async deleteOneRecord(_id: string) {
		await this.#api(`/record/${_id}`, {
			method: 'DELETE'
		});
	}

	async findManyRecords(
		abortSignal: AbortSignal | null,
		data?: {
			fields?: string[];
			filters?: CollectionFilter[];
			groups?: string[];
			orders?: CollectionOrder[];
			limit?: number;
		}
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

	async update(data: { name: string }) {
		await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name: data.name
			}),
			headers: {
				'content-type': 'application/json'
			}
		});
	}

	async delete() {
		await this.#api('', {
			method: 'DELETE'
		});
	}

	async insertOneFile(abortSignal: AbortSignal | null, file: File, fileName?: string) {
		const formData = new FormData();
		formData.append('file', file);
		if (fileName) {
			formData.append('file_name', fileName);
		}
		const res = await this.#api(`/file`, {
			method: 'POST',
			body: formData,
			signal: abortSignal
		});

		return res.data;
	}

	async findOneFile(id: string) {
		const res = await this.#api(`/file/${id}`, {
			method: 'HEAD'
		});

		return res.data;
	}

	async updateOneFile(id: string, createdBy: string, fileName: string) {
		const res = await this.#api(`/file/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				created_by: createdBy,
				file_name: fileName
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async deleteOneFile(id: string) {
		await this.#api(`/file/${id}`, {
			method: 'DELETE'
		});
	}

	async findManyFiles(abortSignal: AbortSignal | null, afterId?: string, limit?: number) {
		let query = '';
		if (afterId) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `after_id=${afterId}`;
		}
		if (limit) {
			if (query) {
				query += '&';
			} else {
				query += '?';
			}
			query += `limit=${limit}`;
		}
		const res = await this.#api(`/files${query}`, {
			method: 'GET',
			signal: abortSignal
		});

		return res;
	}

	getDownloadFileUrl(id: string) {
		return `${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/bucket/${this.#_data.id}/file/${id}?token=${this.#_hyperbaseProject.hyperbase.authToken}`;
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

	async update(data: { name?: string; allowAnonymous?: boolean; expiredAt: string | null }) {
		await this.#api('', {
			method: 'PATCH',
			body: JSON.stringify({
				name: data.name,
				allow_anonymous: data.allowAnonymous,
				expired_at: data.expiredAt
			}),
			headers: {
				'content-type': 'application/json'
			}
		});
	}

	async delete() {
		await this.#api('', {
			method: 'DELETE'
		});
	}

	async insertOneCollectionRule(
		collectionId: string,
		findOne: string,
		findMany: string,
		insertOne: boolean,
		updateOne: string,
		deleteOne: string
	) {
		const res = await this.#api(`/collection_rule`, {
			method: 'POST',
			body: JSON.stringify({
				collection_id: collectionId,
				find_one: findOne,
				find_many: findMany,
				insert_one: insertOne,
				update_one: updateOne,
				delete_one: deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async insertOneBucketRule(
		bucketId: string,
		findOne: string,
		findMany: string,
		insertOne: boolean,
		updateOne: string,
		deleteOne: string
	) {
		const res = await this.#api(`/bucket_rule`, {
			method: 'POST',
			body: JSON.stringify({
				bucket_id: bucketId,
				find_one: findOne,
				find_many: findMany,
				insert_one: insertOne,
				update_one: updateOne,
				delete_one: deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async findOneCollectionRule(id: string) {
		const res = await this.#api(`/collection_rule/${id}`, {
			method: 'GET'
		});

		return res.data;
	}

	async findOneBucketRule(id: string) {
		const res = await this.#api(`/bucket_rule/${id}`, {
			method: 'GET'
		});

		return res.data;
	}

	async updateOneCollectionRule(
		id: string,
		findOne?: string,
		findMany?: string,
		insertOne?: boolean,
		updateOne?: string,
		deleteOne?: string
	) {
		const res = await this.#api(`/collection_rule/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				find_one: findOne,
				find_many: findMany,
				insert_one: insertOne,
				update_one: updateOne,
				delete_one: deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async updateOneBucketRule(
		id: string,
		findOne?: string,
		findMany?: string,
		insertOne?: boolean,
		updateOne?: string,
		deleteOne?: string
	) {
		const res = await this.#api(`/bucket_rule/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				find_one: findOne,
				find_many: findMany,
				insert_one: insertOne,
				update_one: updateOne,
				delete_one: deleteOne
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async deleteOneCollectionRule(id: string) {
		await this.#api(`/collection_rule/${id}`, {
			method: 'DELETE'
		});
	}

	async deleteOneBucketRule(id: string) {
		await this.#api(`/bucket_rule/${id}`, {
			method: 'DELETE'
		});
	}

	async findManyCollectionRules() {
		const res = await this.#api(`/collection_rules`, {
			method: 'GET'
		});

		return res;
	}

	async findManyBucketRules() {
		const res = await this.#api(`/bucket_rules`, {
			method: 'GET'
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
