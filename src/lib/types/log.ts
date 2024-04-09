export interface Log {
	id: string;
	created_at: string;
	kind: LogKind;
	message: string;
}

export enum LogKind {
	Error = 'error',
	Warn = 'warn',
	Info = 'info',
	Debug = 'debug',
	Trace = 'trace'
}
