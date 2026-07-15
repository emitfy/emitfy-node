# @emitfy/sdk

Official Emitfy API SDK for Node.js / TypeScript.

Tipagem gerada a partir do OpenAPI (`@hey-api/openapi-ts`) + facade `Emitfy` amigável.

## Install

```bash
npm i @emitfy/sdk
```

## Usage

```ts
import { Emitfy, type WebhookCreate } from '@emitfy/sdk'

const emitfy = new Emitfy({
  apiKey: process.env.EMITFY_API_KEY!,
  apiSecret: process.env.EMITFY_API_SECRET!
})

const body: WebhookCreate = {
  url: 'https://seu-sistema.com/webhooks/emitfy',
  events: { invoice: ['nfse.authorized'], cte: [] }
}

await emitfy.webhooks.create(body)

const company = emitfy.company(process.env.EMITFY_COMPANY_ID!)

await company.nfse.create(
  {
    serviceDescription: 'Serviço',
    amount: 100,
    borrower: { taxId: '12.345.678/0001-90', name: 'Cliente LTDA' }
  },
  'pedido-001'
)
```

## Typed OpenAPI surface

- Facade: `emitfy.webhooks`, `emitfy.companies`, `emitfy.company(id).nfse|nfe|…`
- Types: `import type { WebhookCreate, NfseCreateData, … } from '@emitfy/sdk'`
- Low-level operations: `import { operations } from '@emitfy/sdk'` (`operations.nfseCreate`, …)

## Method map

| SDK | HTTP |
| --- | --- |
| `emitfy.webhooks.*` | `/v1/webhooks` |
| `emitfy.companies.*` | `/v1/companies` |
| `company.nfse\|nfe\|nfce\|cte` | `/v1/companies/:id/{resource}` |
| `company.customers\|products\|sales` | `/v1/companies/:id/{resource}` |
| `company.receivedNfes` | `/v1/companies/:id/received-nfes` |

Docs: https://api.emitfy.com/docs/sdks  
OpenAPI: https://api.emitfy.com/openapi.yaml
