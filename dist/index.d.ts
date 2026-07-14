export type EmitfyConfig = {
    apiKey: string;
    apiSecret: string;
    baseUrl?: string;
    maxRetries?: number;
};
export declare class EmitfyError extends Error {
    readonly code: string | null;
    readonly details: unknown;
    readonly statusCode: number;
    constructor(message: string, code: string | null, details: unknown, statusCode: number);
}
type Json = Record<string, unknown> | unknown[] | null;
declare class HttpClient {
    private readonly apiKey;
    private readonly apiSecret;
    private readonly baseUrl;
    private readonly maxRetries;
    constructor(apiKey: string, apiSecret: string, baseUrl: string, maxRetries: number);
    request<T = unknown>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T>;
}
declare class CompanyResource {
    private readonly http;
    private readonly basePath;
    constructor(http: HttpClient, basePath: string);
    list(query?: Record<string, string | number | boolean>): Promise<unknown>;
    create(payload: Json, idempotencyKey?: string): Promise<unknown>;
    get(id: string): Promise<unknown>;
    update(id: string, payload: Json): Promise<unknown>;
    delete(id: string): Promise<unknown>;
    post(suffix: string, payload?: Json, idempotencyKey?: string): Promise<unknown>;
}
export declare class CompanyContext {
    private readonly http;
    private readonly companyId;
    readonly nfse: CompanyResource;
    readonly nfe: CompanyResource;
    readonly nfce: CompanyResource;
    readonly cte: CompanyResource;
    readonly customers: CompanyResource;
    readonly products: CompanyResource;
    readonly sales: CompanyResource;
    readonly invoices: CompanyResource;
    readonly receivedNfes: CompanyResource;
    constructor(http: HttpClient, companyId: string);
    id(): string;
    createCteOs(payload: Json, idempotencyKey?: string): Promise<unknown>;
}
export declare class Emitfy {
    readonly webhooks: {
        list: () => Promise<unknown>;
        create: (payload: Json) => Promise<unknown>;
        update: (id: string, payload: Json) => Promise<unknown>;
        setActive: (id: string, active: boolean) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
    };
    readonly companies: {
        list: () => Promise<unknown>;
        create: (payload: Json) => Promise<unknown>;
    };
    private readonly http;
    constructor(config: EmitfyConfig);
    company(companyId: string): CompanyContext;
}
export {};
