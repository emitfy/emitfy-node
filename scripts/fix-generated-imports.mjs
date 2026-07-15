/**
 * Hey API emite `from '../hey-api'` sem extensão; NodeNext exige `.js`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = join(root, 'src/generated/client.gen.ts')

if (!existsSync(target)) {
  console.warn(`skip: ${target} missing`)
  process.exit(0)
}

const before = readFileSync(target, 'utf8')
const after = before.replace(
  /from ['"]\.\.\/hey-api['"]/g,
  "from '../hey-api.js'"
)

if (after !== before) {
  writeFileSync(target, after, 'utf8')
  console.log('fixed src/generated/client.gen.ts import extension')
}
