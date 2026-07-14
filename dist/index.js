export class EmitfyError extends Error {
    code;
    details;
    statusCode;
    constructor(message, code, details, statusCode) {
        super(message);
        this.code = code;
        this.details = details;
        this.statusCode = statusCode;
        this.name = 'EmitfyError';
    }
}
async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
class HttpClient {
    apiKey;
    apiSecret;
    baseUrl;
    maxRetries;
    constructor(apiKey, apiSecret, baseUrl, maxRetries) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = baseUrl;
        this.maxRetries = maxRetries;
    }
    async request(method, path, body, extraHeaders = {}) {
        const url = `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
        let attempt = 0;
        while (true) {
            attempt += 1;
            const response = await fetch(url, {
                method,
                headers: {
                    'X-Api-Key': this.apiKey,
                    'X-Api-Secret': this.apiSecret,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...extraHeaders
                },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
            if (response.status === 429 && attempt <= this.maxRetries + 1) {
                const retryAfter = Number(response.headers.get('Retry-After') || '1');
                await sleep(Math.max(1, retryAfter) * 1000);
                continue;
            }
            const text = await response.text();
            const decoded = (text ? JSON.parse(text) : null);
            if (!response.ok) {
                const error = decoded?.error;
                throw new EmitfyError(error?.message || 'Request failed.', error?.code ?? null, error?.details ?? null, response.status);
            }
            if (decoded && Object.prototype.hasOwnProperty.call(decoded, 'data')) {
                return decoded.data;
            }
            return decoded;
        }
    }
}
class CompanyResource {
    http;
    basePath;
    constructor(http, basePath) {
        this.http = http;
        this.basePath = basePath;
    }
    list(query = {}) {
        const qs = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            qs.set(key, String(value));
        }
        const suffix = qs.toString() ? `?${qs}` : '';
        return this.http.request('GET', `${this.basePath}${suffix}`);
    }
    create(payload, idempotencyKey) {
        return this.http.request('POST', this.basePath, payload, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {});
    }
    get(id) {
        return this.http.request('GET', `${this.basePath}/${encodeURIComponent(id)}`);
    }
    update(id, payload) {
        return this.http.request('PUT', `${this.basePath}/${encodeURIComponent(id)}`, payload);
    }
    delete(id) {
        return this.http.request('DELETE', `${this.basePath}/${encodeURIComponent(id)}`);
    }
    post(suffix, payload, idempotencyKey) {
        return this.http.request('POST', `${this.basePath.replace(/\/$/, '')}/${suffix.replace(/^\//, '')}`, payload, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {});
    }
}
export class CompanyContext {
    http;
    companyId;
    nfse;
    nfe;
    nfce;
    cte;
    customers;
    products;
    sales;
    invoices;
    receivedNfes;
    constructor(http, companyId) {
        this.http = http;
        this.companyId = companyId;
        const prefix = `/companies/${encodeURIComponent(companyId)}`;
        this.nfse = new CompanyResource(http, `${prefix}/nfse`);
        this.nfe = new CompanyResource(http, `${prefix}/nfe`);
        this.nfce = new CompanyResource(http, `${prefix}/nfce`);
        this.cte = new CompanyResource(http, `${prefix}/cte`);
        this.customers = new CompanyResource(http, `${prefix}/customers`);
        this.products = new CompanyResource(http, `${prefix}/products`);
        this.sales = new CompanyResource(http, `${prefix}/sales`);
        this.invoices = new CompanyResource(http, `${prefix}/invoices`);
        this.receivedNfes = new CompanyResource(http, `${prefix}/received-nfes`);
    }
    id() {
        return this.companyId;
    }
    createCteOs(payload, idempotencyKey) {
        return this.http.request('POST', `/companies/${encodeURIComponent(this.companyId)}/cte-os`, payload, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {});
    }
}
export class Emitfy {
    webhooks;
    companies;
    http;
    constructor(config) {
        const apiKey = (config.apiKey || '').trim();
        const apiSecret = (config.apiSecret || '').trim();
        if (!apiKey || !apiSecret) {
            throw new EmitfyError('apiKey and apiSecret are required.', null, null, 0);
        }
        this.http = new HttpClient(apiKey, apiSecret, config.baseUrl || 'https://api.emitfy.com/v1', config.maxRetries ?? 2);
        this.webhooks = {
            list: () => this.http.request('GET', '/webhooks'),
            create: (payload) => this.http.request('POST', '/webhooks', payload),
            update: (id, payload) => this.http.request('PUT', `/webhooks/${encodeURIComponent(id)}`, payload),
            setActive: (id, active) => this.http.request('PATCH', `/webhooks/${encodeURIComponent(id)}/active`, { active }),
            delete: (id) => this.http.request('DELETE', `/webhooks/${encodeURIComponent(id)}`)
        };
        this.companies = {
            list: () => this.http.request('GET', '/companies'),
            create: (payload) => this.http.request('POST', '/companies', payload)
        };
    }
    company(companyId) {
        const id = companyId.trim();
        if (!id) {
            throw new EmitfyError('companyId is required.', null, null, 0);
        }
        return new CompanyContext(this.http, id);
    }
}
