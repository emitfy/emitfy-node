export type EmitfyConfig = {
  apiKey: string
  apiSecret: string
  baseUrl?: string
  maxRetries?: number
}

export class EmitfyError extends Error {
  constructor(
    message: string,
    public readonly code: string | null,
    public readonly details: unknown,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = 'EmitfyError'
  }
}

type Json = Record<string, unknown> | unknown[] | null

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

class HttpClient {
  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly baseUrl: string,
    private readonly maxRetries: number
  ) {}

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
    let attempt = 0

    while (true) {
      attempt += 1

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
      })

      if (response.status === 429 && attempt <= this.maxRetries + 1) {
        const retryAfter = Number(response.headers.get('Retry-After') || '1')
        await sleep(Math.max(1, retryAfter) * 1000)
        continue
      }

      const text = await response.text()
      const decoded = (text ? JSON.parse(text) : null) as {
        success?: boolean
        data?: T
        error?: { code?: string; message?: string; details?: unknown }
      } | null

      if (!response.ok) {
        const error = decoded?.error
        throw new EmitfyError(
          error?.message || 'Request failed.',
          error?.code ?? null,
          error?.details ?? null,
          response.status
        )
      }

      if (decoded && Object.prototype.hasOwnProperty.call(decoded, 'data')) {
        return decoded.data as T
      }

      return decoded as T
    }
  }
}

class CompanyResource {
  constructor(
    private readonly http: HttpClient,
    private readonly basePath: string
  ) {}

  list(query: Record<string, string | number | boolean> = {}) {
    const qs = new URLSearchParams()

    for (const [key, value] of Object.entries(query)) {
      qs.set(key, String(value))
    }

    const suffix = qs.toString() ? `?${qs}` : ''

    return this.http.request('GET', `${this.basePath}${suffix}`)
  }

  create(payload: Json, idempotencyKey?: string) {
    return this.http.request(
      'POST',
      this.basePath,
      payload,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
    )
  }

  get(id: string) {
    return this.http.request('GET', `${this.basePath}/${encodeURIComponent(id)}`)
  }

  update(id: string, payload: Json) {
    return this.http.request('PUT', `${this.basePath}/${encodeURIComponent(id)}`, payload)
  }

  delete(id: string) {
    return this.http.request('DELETE', `${this.basePath}/${encodeURIComponent(id)}`)
  }

  post(suffix: string, payload?: Json, idempotencyKey?: string) {
    return this.http.request(
      'POST',
      `${this.basePath.replace(/\/$/, '')}/${suffix.replace(/^\//, '')}`,
      payload,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
    )
  }
}

export class CompanyContext {
  readonly nfse: CompanyResource
  readonly nfe: CompanyResource
  readonly nfce: CompanyResource
  readonly cte: CompanyResource
  readonly customers: CompanyResource
  readonly products: CompanyResource
  readonly sales: CompanyResource
  readonly invoices: CompanyResource
  readonly receivedNfes: CompanyResource

  constructor(
    private readonly http: HttpClient,
    private readonly companyId: string
  ) {
    const prefix = `/companies/${encodeURIComponent(companyId)}`
    this.nfse = new CompanyResource(http, `${prefix}/nfse`)
    this.nfe = new CompanyResource(http, `${prefix}/nfe`)
    this.nfce = new CompanyResource(http, `${prefix}/nfce`)
    this.cte = new CompanyResource(http, `${prefix}/cte`)
    this.customers = new CompanyResource(http, `${prefix}/customers`)
    this.products = new CompanyResource(http, `${prefix}/products`)
    this.sales = new CompanyResource(http, `${prefix}/sales`)
    this.invoices = new CompanyResource(http, `${prefix}/invoices`)
    this.receivedNfes = new CompanyResource(http, `${prefix}/received-nfes`)
  }

  id() {
    return this.companyId
  }

  createCteOs(payload: Json, idempotencyKey?: string) {
    return this.http.request(
      'POST',
      `/companies/${encodeURIComponent(this.companyId)}/cte-os`,
      payload,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
    )
  }
}

export class Emitfy {
  readonly webhooks: {
    list: () => Promise<unknown>
    create: (payload: Json) => Promise<unknown>
    update: (id: string, payload: Json) => Promise<unknown>
    setActive: (id: string, active: boolean) => Promise<unknown>
    delete: (id: string) => Promise<unknown>
  }

  readonly companies: {
    list: () => Promise<unknown>
    create: (payload: Json) => Promise<unknown>
  }

  private readonly http: HttpClient

  constructor(config: EmitfyConfig) {
    const apiKey = (config.apiKey || '').trim()
    const apiSecret = (config.apiSecret || '').trim()

    if (!apiKey || !apiSecret) {
      throw new EmitfyError('apiKey and apiSecret are required.', null, null, 0)
    }

    this.http = new HttpClient(
      apiKey,
      apiSecret,
      config.baseUrl || 'https://api.emitfy.com/v1',
      config.maxRetries ?? 2
    )

    this.webhooks = {
      list: () => this.http.request('GET', '/webhooks'),
      create: (payload) => this.http.request('POST', '/webhooks', payload),
      update: (id, payload) =>
        this.http.request('PUT', `/webhooks/${encodeURIComponent(id)}`, payload),
      setActive: (id, active) =>
        this.http.request('PATCH', `/webhooks/${encodeURIComponent(id)}/active`, { active }),
      delete: (id) => this.http.request('DELETE', `/webhooks/${encodeURIComponent(id)}`)
    }

    this.companies = {
      list: () => this.http.request('GET', '/companies'),
      create: (payload) => this.http.request('POST', '/companies', payload)
    }
  }

  company(companyId: string) {
    const id = companyId.trim()

    if (!id) {
      throw new EmitfyError('companyId is required.', null, null, 0)
    }

    return new CompanyContext(this.http, id)
  }
}
