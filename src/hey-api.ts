import type { CreateClientConfig } from './generated/client.gen.js'

/**
 * Config padrão do client gerado (Hey API).
 * Credenciais são aplicadas em runtime pela facade `Emitfy`.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: config?.baseUrl ?? 'https://api.emitfy.com/v1'
})
