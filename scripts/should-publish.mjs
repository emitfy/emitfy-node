/**
 * Decide se @emitfy/sdk deve ir ao npm.

 *
 * exit 0  → publicar
 * exit 10 → pul
ar (sem alterações / já publicado)
 * exit
 1  → erro (ex.: código mudou mas a versã
o já existe)
 */
import { createHash } from 
'node:crypto'
import {
  existsSync,
  mkdtem
pSync,
  readFileSync,
  readdirSync,
  rmSyn
c,
  statSync
} from 'node:fs'
import { tmpdi
r } from 'node:os'
import { dirname, join, re
lative } from 'node:path'
import { fileURLToP
ath } from 'node:url'
import { execSync } fro
m 'node:child_process'

const root = join(dir
name(fileURLToPath(import.meta.url)), '..')
c
onst pkg = JSON.parse(readFileSync(join(root,
 'package.json'), 'utf8'))
const packageName 
= pkg.name

function walkFiles(dir, files = [
]) {
  for (const name of readdirSync(dir)) {

    const path = join(dir, name)

    if (st
atSync(path).isDirectory()) {
      walkFiles
(path, files)
      continue
    }

    files
.push(path)
  }

  return files
}

/**
 * @pa
ram {unknown} value
 * @returns {unknown}
 */

function sortKeys(value) {
  if (Array.isArr
ay(value)) {
    return value.map(sortKeys)
 
 }

  if (value && typeof value === 'object')
 {
    const object = /** @type {Record<strin
g, unknown>} */ (value)
    const sorted = {}


    for (const key of Object.keys(object).s
ort()) {
      sorted[key] = sortKeys(object[
key])
    }

    return sorted
  }

  return 
value
}

/**
 * Hash estável do surface publ
icado (src + package.json sem version).
 * @p
aram {string} base
 */
function contentHash(b
ase) {
  const hash = createHash('sha256')
  
const pkgPath = join(base, 'package.json')

 
 if (existsSync(pkgPath)) {
    const parsed 
= JSON.parse(readFileSync(pkgPath, 'utf8'))
 
   delete parsed.version
    hash.update('pac
kage.json\0')
    hash.update(JSON.stringify(
sortKeys(parsed)))
    hash.update('\0')
  }


  const srcDir = join(base, 'src')

  if (!e
xistsSync(srcDir)) {
    throw new Error(`src
/ missing in ${base}`)
  }

  const files = w
alkFiles(srcDir).sort((a, b) =>
    relative(
base, a).localeCompare(relative(base, b))
  )


  for (const file of files) {
    const rel
 = relative(base, file).replaceAll('\\', '/')

    const body = readFileSync(file, 'utf8').
replaceAll('\r\n', '\n')
    hash.update(rel)

    hash.update('\0')
    hash.update(body)

    hash.update('\0')
  }

  return hash.dige
st('hex')
}

function npmView(spec) {
  try {

    return execSync(`npm view ${spec} versio
n`, {
      encoding: 'utf8',
      stdio: ['
ignore', 'pipe', 'ignore']
    }).trim()
  } 
catch {
    return ''
  }
}

const localHash 
= contentHash(root)
const remoteLatest = npmV
iew(packageName)

if (!remoteLatest) {
  cons
ole.log(`no remote package — publish ${pack
ageName}@${pkg.version}`)
  process.exit(0)
}


const work = mkdtempSync(join(tmpdir(), 'em
itfy-sdk-cmp-'))

try {
  execSync(`npm pack 
${packageName}@${remoteLatest} --pack-destina
tion "${work}"`, {
    stdio: ['ignore', 'pip
e', 'pipe']
  })

  const tarball = readdirSy
nc(work).find((name) => name.endsWith('.tgz')
)

  if (!tarball) {
    throw new Error('npm
 pack produced no tarball')
  }

  execSync(`
tar -xzf "${join(work, tarball)}" -C "${work}
"`, { stdio: 'pipe' })

  const remoteHash = 
contentHash(join(work, 'package'))

  if (loc
alHash === remoteHash) {
    console.log(
   
   `SDK unchanged vs ${packageName}@${remoteL
atest} — skip publish (${localHash.slice(0,
 12)})`
    )
    process.exit(10)
  }

  if 
(npmView(`${packageName}@${pkg.version}`)) {

    console.error(
      `SDK source changed,
 but ${packageName}@${pkg.version} already ex
ists on npm. Bump version in package.json.`
 
   )
    process.exit(1)
  }

  console.log(

    `SDK changed (${localHash.slice(0, 8)} �
� ${remoteHash.slice(0, 8)}) — publish ${pk
g.version}`
  )
  process.exit(0)
} finally {

  rmSync(work, { recursive: true, force: tru
e })
}


