# @emitfy/sdk

Official Emitfy API SDK for Node.js / TypeScript.

```bash
npm i @emitfy/sdk
```

```ts
import { Emitfy } from '@emitfy/sdk'

const emitfy = new Emitfy({
  apiKey: process.env.EMITFY_API_KEY!,
  apiSecret: process.env.EMITFY_API_SECRET!
})

await emitfy.webhooks.create({
  url: 'https://seu-sistema.com/webhooks/emitfy',
  events: { invoice: ['nfse.authorized'], cte: [] }
})

const company = emitfy.company(process.env.EMITFY_COMPANY_ID!)
await company.nfse.create({ serviceDescription: 'Serviço', amount: 100 })
```

Docs: https://api.emitfy.com/docs/sdks
