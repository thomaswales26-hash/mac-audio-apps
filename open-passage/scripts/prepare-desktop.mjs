import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const standalone = path.join(root, '.next', 'standalone')
const staticTarget = path.join(standalone, '.next', 'static')
const publicSource = path.join(root, 'public')
const publicTarget = path.join(standalone, 'public')
const staging = '/tmp/open-passage-desktop'

await rm(staticTarget, { force: true, recursive: true })
await mkdir(path.dirname(staticTarget), { recursive: true })
await cp(path.join(root, '.next', 'static'), staticTarget, { recursive: true })

await rm(publicTarget, { force: true, recursive: true })
await cp(publicSource, publicTarget, { recursive: true })

await rm(staging, { force: true, recursive: true })
await mkdir(staging, { recursive: true })
await cp(standalone, path.join(staging, '.next', 'standalone'), { recursive: true })
await cp(path.join(root, 'electron'), path.join(staging, 'electron'), { recursive: true })
await cp(path.join(root, 'desktop'), path.join(staging, 'desktop'), { recursive: true })
await cp(path.join(root, 'desktop', 'package.json'), path.join(staging, 'package.json'))
await writeFile(
  path.join(staging, 'pnpm-lock.yaml'),
  "lockfileVersion: '9.0'\n\nimporters:\n  .: {}\n",
)

console.log('Prepared the self-contained Next.js server for Electron packaging.')
