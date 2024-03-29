import type { Admin } from '$lib/types/admin';
import type { AuthTokenData } from '$lib/types/authTokenData';
import type { Collection } from '$lib/types/collection';
import type { Project } from '$lib/types/project';
import { jwtDecode } from 'jwt-decode';
import { writable } from 'svelte/store';

export default class Hyperbase {
	#_baseUrl: string;
	#_baseWsUrl?: string;
	#_authToken?: string;

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

	constructor(base_url: string, base_ws_url?: string) {
		this.#_baseUrl = base_url;
		this.#_baseWsUrl = base_ws_url;
	}

	async init() {
		const token = localStorage.getItem('token');
		if (token) {
			const loadToken = await this.#setAuthToken(token);
			if (loadToken) {
				this.#setTokenStorage(loadToken);
				this.#_authToken = loadToken;
				this.#_authState.set(AuthState.Authenticated);
				this.#_isReady.set(true);

				const decodedJwt = jwtDecode<AuthTokenData>(loadToken);
				if (decodedJwt.kind === 'Admin') {
					this.#getAdminData();
				}

				return;
			}
		}
		this.#removeTokenStorage();
		this.#_authState.set(AuthState.Unauthenticated);
		this.#_isReady.set(true);
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

	async getAllProjects() {
		const res = await this.#api('/projects', {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			}
		});

		return res.data;
	}

	async getAllSupportedSchemaFields() {
		const res = await this.#api('/info/schema_fields', {
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
		if (input.startsWith('/')) {
			input = input.slice(1);
		}
		const res = await fetch(`${this.#_baseUrl}/api/rest/${input}`, init);
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
		this.#api(`/${this.#_data.id}`, {
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
		this.#api(`/${this.#_data.id}`, {
			method: 'DELETE'
		});
	}

	async getCollection(id: string) {
		const res = await this.#api(`/${this.#_data.id}/collection/${id}`, {
			method: 'GET'
		});

		return new HyperbaseCollection(this, res.data);
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
	}) {
		const res = await this.#api('/collection', {
			method: 'POST',
			body: JSON.stringify({
				name: data.name,
				schema_fields: data.schemaFields
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async getAllCollections() {
		const res = await this.#api(`/${this.#_data.id}/collections`, {
			method: 'GET'
		});

		return res.data;
	}

	async #api(input: string, init: RequestInit) {
		this.#_hyperbase;
		if (input.startsWith('/')) {
			input = input.slice(1);
		}
		const res = await fetch(`${this.#_hyperbase.baseUrl}/api/rest/project/${input}`, {
			...init,
			headers: {
				...init.headers,
				authorization: `Bearer ${this.#_hyperbase.authToken}`
			}
		});
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

	constructor(hyperbaseProject: HyperbaseProject, collection: Collection) {
		this.#_hyperbaseProject = hyperbaseProject;
		this.#_data = collection;
	}

	async insertOne(object: any) {
		const res = await this.#api(`/record`, {
			method: 'POST',
			body: JSON.stringify(object),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async findOne(_id: string) {
		const res = await this.#api(`/record/${_id}`, {
			method: 'GET'
		});

		return res.data;
	}

	async updateOne(_id: string, object: any) {
		const res = await this.#api(`/record/${_id}`, {
			method: 'PATCH',
			body: JSON.stringify(object),
			headers: {
				'content-type': 'application/json'
			}
		});

		return res.data;
	}

	async deleteOne(_id: string) {
		await this.#api(`/record/${_id}`, {
			method: 'DELETE'
		});
	}

	async findMany(data?: {
		fields?: string[];
		filters?: CollectionFilter[];
		groups?: string[];
		orders?: CollectionOrder[];
		limit?: number;
	}) {
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
			}
		});

		return res;
	}

	async subscribe(callbacks?: {
		onOpenCallback?: (ev: Event) => void;
		onMessageCallback?: (ev: Event) => void;
		onErrorCallback?: (ev: Event) => void;
		onCloseCallback?: (ev: Event) => void;
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
		if (input.startsWith('/')) {
			input = input.slice(1);
		}
		const res = await fetch(
			`${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.data.id}/collection/${this.#_data.id}/${input}`,
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
	kind: string;
}

export interface Error {
	status: string;
	message: string;
}
