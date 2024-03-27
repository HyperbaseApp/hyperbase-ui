export default class Hyperbase {
	#_baseUrl: string;
	#_baseWsUrl?: string;
	#_authToken?: string;

	get baseUrl() {
		return this.#_baseUrl;
	}

	get baseWsUrl() {
		return this.#_baseWsUrl;
	}

	get authToken() {
		return this.#_authToken;
	}

	constructor(base_url: string, base_ws_url?: string) {
		this.#_baseUrl = base_url;
		this.#_baseWsUrl = base_ws_url;
	}

	async setAuthToken(authToken: string) {
		const res = await this.#api('/auth/token', {
			method: 'GET',
			headers: {
				authorization: `Bearer ${authToken}`
			}
		});

		this.#_authToken = res.data.token;

		return this.#_authToken;
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

		this.#_authToken = res.data.token;

		return this.#_authToken;
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

		this.#_authToken = res.data.token;

		return this.#_authToken;
	}

	async getAdminData() {
		const admin = await this.#api(`/admin`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			}
		});

		return admin.data;
	}

	async getUserData() {
		const user = await this.#api(`/user`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_authToken}`
			}
		});

		return user.data;
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

class HyperbaseProject {
	#_hyperbase: Hyperbase;
	#_projectId: string;

	get hyperbase() {
		return this.#_hyperbase;
	}

	get projectId() {
		return this.#_projectId;
	}

	constructor(hyperbase: Hyperbase, projectId: string) {
		this.#_hyperbase = hyperbase;
		this.#_projectId = projectId;
	}

	async setCollection(collectionId: string) {
		this.#api(`/${this.#_projectId}/collection/${collectionId}`, {
			method: 'GET',
			headers: {
				authorization: `Bearer ${this.#_hyperbase.authToken}`
			}
		});

		return new HyperbaseCollection(this, collectionId);
	}

	async #api(input: string, init: RequestInit) {
		this.#_hyperbase;
		if (input.startsWith('/')) {
			input = input.slice(1);
		}
		const res = await fetch(`${this.#_hyperbase.baseUrl}/api/rest/project/${input}`, init);
		const resJson = await res.json();
		if (res.status.toString()[0] != '2') {
			throw resJson.error;
		}
		return resJson;
	}
}

class HyperbaseCollection {
	#_hyperbaseProject: HyperbaseProject;
	#_collectionId: string;
	#_socket?: WebSocket;

	constructor(hyperbaseProject: HyperbaseProject, collectionId: string) {
		this.#_hyperbaseProject = hyperbaseProject;
		this.#_collectionId = collectionId;
	}

	async insertOne(object: any) {
		const res = await this.#api(`/record`, {
			method: 'POST',
			body: JSON.stringify(object)
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
			body: JSON.stringify(object)
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
			})
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
			`${this.#_hyperbaseProject.hyperbase.baseWsUrl}/api/rest/project/${this.#_hyperbaseProject.projectId}/collection/${this.#_collectionId}/subscribe?token=${this.#_hyperbaseProject.hyperbase.authToken}`
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
			`${this.#_hyperbaseProject.hyperbase.baseUrl}/api/rest/project/${this.#_hyperbaseProject.projectId}/collection/${this.#_collectionId}/${input}`,
			{
				...init,
				headers: {
					...init.headers,
					'content-type': 'application/json',
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
