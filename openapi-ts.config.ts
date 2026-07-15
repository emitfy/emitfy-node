import { defineConfig } from '@hey-api/openapi-ts'

/**
 * Gera client tipado a partir do OpenAPI do monorepo.
 * Rodar via `npm run generate` (também chamado por tools/sdk/generate.mjs).
 *
 * Os arquivos em `src/generated/` são commitados — o repo público não tem o YAML.
 */
export default defineConfig({
  input: '../../knowledge/openapi-v1-minimal.yaml',
  output: {
    path: 'src/generated',
    postProcess: []
  },
  plugins: [
    '@hey-api/typescript',
    {
      name: '@hey-api/sdk'
    },
    {
      name: '@hey-api/client-fetch',
      // relativo à raiz do pacote sdks/typescript
      runtimeConfigPath: './src/hey-api'
    }
  ]
})
