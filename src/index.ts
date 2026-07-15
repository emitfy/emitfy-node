import { createClient, createConfig } from './generated/client/index.js'
import type { Client } from './generated/client/index.js'
import * as api from './generated/sdk.gen.js'
import type {
  CompaniesCreateData,
  CustomersCreateData,
  CustomersListData,
  CustomersUpdateData,
  NfceCreateData,
  NfceListData,
  NfeCreateData,
  NfeListData,
  NfseCreateData,
  NfseListData,
  ProductsCreateData,
  ProductsListData,
  ProductsUpdateData,
  ReceivedNfesListData,
  ReceivedNfesManifestData,
  SalesCreateData,
  SalesListData,
  SalesUpdateData,
  WebhookCreate,
  CteCreateData,
  CteListData,
  CteOsCreateData,
  InvoicesListData
} from './generated/types.gen.js'

export type { WebhookCreate, Client }
export type * from './generated/types.gen.js'
export { api as operations }

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

type JsonObject = Record<string, unknown>

/**
 * Extrai `data` do envelope Emitfy `{ success, data }` quando presente.
 */
function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as { success?: unknown }).success === true &&
    'data' in payload
  ) {
    return (payload as { data: T }).data
  }

  return payload as T
}

function toEmitfyError(error: unknown, statusCode = 0): EmitfyError {
  if (error instanceof EmitfyError) {
    return error
  }

  if (error && typeof error === 'object') {
    const record = error as {
      error?: { code?: string; message?: string; details?: unknown }
      message?: string
      code?: string
      details?: unknown
    }
    const nested = record.error

    if (nested?.message) {
      return new EmitfyError(
        nested.message,
        nested.code ?? null,
        nested.details ?? null,
        statusCode
      )
    }

    if (typeof record.message === 'string') {
      return new EmitfyError(record.message, record.code ?? null, record.details ?? null, statusCode)
    }
  }

  return new EmitfyError('Request failed.', null, error, statusCode)
}

async function callApi<T>(run: () => Promise<{ data: unknown; response: Response }>): Promise<T> {
  try {
    const result = await run()
    return unwrapData<T>(result.data)
  } catch (error) {
    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode) || 0
        : 0

    throw toEmitfyError(error, status)
  }
}

type BodyOf<T> = T extends { body: infer B } ? B : never
type QueryOf<T> = T extends { query?: infer Q } ? NonNullable<Q> : never

class CompanyResource<
  TListData,
  TCreateData extends { body: unknown },
  TGetData = unknown,
  TUpdateData extends { body?: unknown } = { body?: JsonObject }
> {
  constructor(
    private readonly client: Client,
    private readonly companyId: string,
    private readonly handlers: {
      list: (options: {
        client: Client
        throwOnError: true
        path: { companyId: string }
        query?: QueryOf<TListData>
      }) => Promise<{ data: unknown; response: Response }>
      create: (options: {
        client: Client
        throwOnError: true
        path: { companyId: string }
        body: BodyOf<TCreateData>
        headers?: { 'Idempotency-Key'?: string }
      }) => Promise<{ data: unknown; response: Response }>
      get: (options: {
        client: Client
        throwOnError: true
        path: { companyId: string; id: string }
      }) => Promise<{ data: unknown; response: Response }>
      update?: (options: {
        client: Client
        throwOnError: true
        path: { companyId: string; id: string }
        body: NonNullable<TUpdateData['body']>
      }) => Promise<{ data: unknown; response: Response }>
      delete?: (options: {
        client: Client
        throwOnError: true
        path: { companyId: string; id: string }
      }) => Promise<{ data: unknown; response: Response }>
    }
  ) {}

  list(query?: QueryOf<TListData>) {
    return callApi(() =>
      this.handlers.list({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId },
        query
      })
    )
  }

  create(body: BodyOf<TCreateData>, idempotencyKey?: string) {
    return callApi(() =>
      this.handlers.create({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId },
        body,
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
      })
    )
  }

  get(id: string) {
    return callApi(() =>
      this.handlers.get({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId, id }
      })
    )
  }

  update(id: string, body: NonNullable<TUpdateData['body']>) {
    if (!this.handlers.update) {
      throw new EmitfyError('update is not available for this resource.', null, null, 0)
    }

    return callApi(() =>
      this.handlers.update!({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId, id },
        body
      })
    )
  }

  delete(id: string) {
    if (!this.handlers.delete) {
      throw new EmitfyError('delete is not available for this resource.', null, null, 0)
    }

    return callApi(() =>
      this.handlers.delete!({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId, id }
      })
    )
  }
}

export class CompanyContext {
  readonly nfse: CompanyResource<NfseListData, NfseCreateData>
  readonly nfe: CompanyResource<NfeListData, NfeCreateData>
  readonly nfce: CompanyResource<NfceListData, NfceCreateData>
  readonly cte: CompanyResource<CteListData, CteCreateData>
  readonly customers: CompanyResource<
    CustomersListData,
    CustomersCreateData,
    unknown,
    CustomersUpdateData
  >
  readonly products: CompanyResource<
    ProductsListData,
    ProductsCreateData,
    unknown,
    ProductsUpdateData
  >
  readonly sales: CompanyResource<SalesListData, SalesCreateData, unknown, SalesUpdateData>
  readonly invoices: {
    list: (query?: QueryOf<InvoicesListData>) => Promise<unknown>
    get: (id: string) => Promise<unknown>
  }
  readonly receivedNfes: {
    list: (query?: QueryOf<ReceivedNfesListData>) => Promise<unknown>
    get: (id: string) => Promise<unknown>
    sync: () => Promise<unknown>
    manifest: (id: string, body: BodyOf<ReceivedNfesManifestData>) => Promise<unknown>
    xml: (id: string) => Promise<unknown>
  }

  constructor(
    private readonly client: Client,
    private readonly companyId: string
  ) {
    this.nfse = new CompanyResource(client, companyId, {
      list: api.nfseList,
      create: api.nfseCreate,
      get: api.nfseGet,
      delete: api.nfseCancel
    })
    this.nfe = new CompanyResource(client, companyId, {
      list: api.nfeList,
      create: api.nfeCreate,
      get: api.nfeGet,
      delete: api.nfeCancel
    })
    this.nfce = new CompanyResource(client, companyId, {
      list: api.nfceList,
      create: api.nfceCreate,
      get: api.nfceGet,
      delete: api.nfceCancel
    })
    this.cte = new CompanyResource(client, companyId, {
      list: api.cteList,
      create: api.cteCreate,
      get: api.cteGet,
      delete: api.cteCancel
    })
    this.customers = new CompanyResource(client, companyId, {
      list: api.customersList,
      create: api.customersCreate,
      get: api.customersGet,
      update: api.customersUpdate,
      delete: api.customersDelete
    })
    this.products = new CompanyResource(client, companyId, {
      list: api.productsList,
      create: api.productsCreate,
      get: api.productsGet,
      update: api.productsUpdate,
      delete: api.productsDelete
    })
    this.sales = new CompanyResource(client, companyId, {
      list: api.salesList,
      create: api.salesCreate,
      get: api.salesGet,
      update: api.salesUpdate,
      delete: api.salesDelete
    })
    this.invoices = {
      list: (query) =>
        callApi(() =>
          api.invoicesList({
            client,
            throwOnError: true,
            path: { companyId },
            query
          })
        ),
      get: (id) =>
        callApi(() =>
          api.invoicesGet({
            client,
            throwOnError: true,
            path: { companyId, id }
          })
        )
    }
    this.receivedNfes = {
      list: (query) =>
        callApi(() =>
          api.receivedNfesList({
            client,
            throwOnError: true,
            path: { companyId },
            query
          })
        ),
      get: (id) =>
        callApi(() =>
          api.receivedNfesGet({
            client,
            throwOnError: true,
            path: { companyId, id }
          })
        ),
      sync: () =>
        callApi(() =>
          api.receivedNfesSync({
            client,
            throwOnError: true,
            path: { companyId }
          })
        ),
      manifest: (id, body) =>
        callApi(() =>
          api.receivedNfesManifest({
            client,
            throwOnError: true,
            path: { companyId, id },
            body
          })
        ),
      xml: (id) =>
        callApi(() =>
          api.receivedNfesXml({
            client,
            throwOnError: true,
            path: { companyId, id }
          })
        )
    }
  }

  id() {
    return this.companyId
  }

  createCteOs(body: BodyOf<CteOsCreateData>, idempotencyKey?: string) {
    return callApi(() =>
      api.cteOsCreate({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId },
        body,
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
      })
    )
  }

  transmitNfce(id: string) {
    return callApi(() =>
      api.nfceTransmit({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId, id }
      })
    )
  }

  emitSaleInvoice(id: string) {
    return callApi(() =>
      api.salesEmitInvoice({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId, id }
      })
    )
  }

  cancelSaleInvoice(id: string) {
    return callApi(() =>
      api.salesCancelInvoice({
        client: this.client,
        throwOnError: true,
        path: { companyId: this.companyId, id }
      })
    )
  }
}

export class Emitfy {
  readonly webhooks: {
    list: () => Promise<unknown>
    create: (body: WebhookCreate) => Promise<unknown>
    update: (id: string, body: WebhookCreate) => Promise<unknown>
    setActive: (id: string, active: boolean) => Promise<unknown>
    delete: (id: string) => Promise<unknown>
  }

  readonly companies: {
    list: () => Promise<unknown>
    create: (body: BodyOf<CompaniesCreateData>) => Promise<unknown>
    get: (companyId: string) => Promise<unknown>
    update: (companyId: string, body: JsonObject) => Promise<unknown>
    delete: (companyId: string) => Promise<unknown>
  }

  private readonly client: Client

  constructor(config: EmitfyConfig) {
    const apiKey = (config.apiKey || '').trim()
    const apiSecret = (config.apiSecret || '').trim()

    if (!apiKey || !apiSecret) {
      throw new EmitfyError('apiKey and apiSecret are required.', null, null, 0)
    }

    this.client = createClient(
      createConfig({
        baseUrl: config.baseUrl || 'https://api.emitfy.com/v1',
        throwOnError: true,
        auth: (scheme) => {
          if (scheme.name === 'X-Api-Key') {
            return apiKey
          }

          if (scheme.name === 'X-Api-Secret') {
            return apiSecret
          }

          return undefined
        },
        headers: {
          Accept: 'application/json'
        }
      })
    )

    this.webhooks = {
      list: () => callApi(() => api.webhooksList({ client: this.client, throwOnError: true })),
      create: (body) =>
        callApi(() =>
          api.webhooksCreate({ client: this.client, throwOnError: true, body })
        ),
      update: (id, body) =>
        callApi(() =>
          api.webhooksUpdate({
            client: this.client,
            throwOnError: true,
            path: { id },
            body
          })
        ),
      setActive: (id, active) =>
        callApi(() =>
          api.webhooksSetActive({
            client: this.client,
            throwOnError: true,
            path: { id },
            body: { active }
          })
        ),
      delete: (id) =>
        callApi(() =>
          api.webhooksDelete({ client: this.client, throwOnError: true, path: { id } })
        )
    }

    this.companies = {
      list: () => callApi(() => api.companiesList({ client: this.client, throwOnError: true })),
      create: (body) =>
        callApi(() =>
          api.companiesCreate({ client: this.client, throwOnError: true, body })
        ),
      get: (companyId) =>
        callApi(() =>
          api.companiesGet({
            client: this.client,
            throwOnError: true,
            path: { companyId }
          })
        ),
      update: (companyId, body) =>
        callApi(() =>
          api.companiesUpdate({
            client: this.client,
            throwOnError: true,
            path: { companyId },
            body
          })
        ),
      delete: (companyId) =>
        callApi(() =>
          api.companiesDelete({
            client: this.client,
            throwOnError: true,
            path: { companyId }
          })
        )
    }
  }

  /** Acesso tipado de baixo nível ao client Hey API (operationIds do OpenAPI). */
  get raw(): Client {
    return this.client
  }

  company(companyId: string) {
    const id = companyId.trim()

    if (!id) {
      throw new EmitfyError('companyId is required.', null, null, 0)
    }

    return new CompanyContext(this.client, id)
  }
}
