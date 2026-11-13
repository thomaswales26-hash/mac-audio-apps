import { cp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = process.cwd()
const standalone = path.join(root, '.next', 'standalone')
const staticTarget = path.join(standalone, '.next', 'static')
const publicSource = path.join(root, 'public')
const publicTarget = path.join(standalone, 'public')
const staging = '/tmp/open-passage-desktop'

async function rootPackageNames(nodeModules) {
  const names = []
  for (const entry of await readdir(nodeModules, { withFileTypes: true })) {
    if (entry.name === '.pnpm') continue
    if (!entry.name.startsWith('@')) {
      names.push(entry.name)
      continue
    }

    const scope = path.join(nodeModules, entry.name)
    for (const scopedEntry of await readdir(scope, { withFileTypes: true })) {
      names.push(`${entry.name}/${scopedEntry.name}`)
    }
  }
  return names
}

async function resolvedPackage(packagePath) {
  try {
    return await realpath(packagePath)
  } catch {
    return undefined
  }
}

async function materializeRuntimePackages(sourceNodeModules, targetNodeModules) {
  const queue = []
  for (const name of await rootPackageNames(sourceNodeModules)) {
    const source = await resolvedPackage(path.join(sourceNodeModules, name))
    if (source) queue.push({ name, source })
  }

  const copied = new Set()
  while (queue.length > 0) {
    const { name, source } = queue.shift()
    if (copied.has(name)) continue
    copied.add(name)

    const packageJSON = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'))
    const target = path.join(targetNodeModules, name)
    await rm(target, { force: true, recursive: true })
    await mkdir(path.dirname(target), { recursive: true })
    await cp(source, target, { dereference: true, recursive: true })

    const dependencies = {
      ...packageJSON.dependencies,
      ...packageJSON.optionalDependencies,
    }
    for (const dependency of Object.keys(dependencies)) {
      const dependencySource = await resolvedPackage(path.join(path.dirname(source), dependency))
      if (dependencySource) queue.push({ name: dependency, source: dependencySource })
    }
  }
}

await rm(staticTarget, { force: true, recursive: true })
await mkdir(path.dirname(staticTarget), { recursive: true })
await cp(path.join(root, '.next', 'static'), staticTarget, { recursive: true })

await rm(publicTarget, { force: true, recursive: true })
await cp(publicSource, publicTarget, { recursive: true })

await rm(staging, { force: true, recursive: true })
await mkdir(staging, { recursive: true })
await cp(standalone, path.join(staging, '.next', 'standalone'), { recursive: true })
await materializeRuntimePackages(
  path.join(standalone, 'node_modules'),
  path.join(staging, '.next', 'standalone', 'node_modules'),
)
await cp(path.join(root, 'electron'), path.join(staging, 'electron'), { recursive: true })
await cp(path.join(root, 'desktop'), path.join(staging, 'desktop'), { recursive: true })
await cp(path.join(root, 'desktop', 'package.json'), path.join(staging, 'package.json'))
await writeFile(
  path.join(staging, 'pnpm-lock.yaml'),
  "lockfileVersion: '9.0'\n\nimporters:\n  .: {}\n",
)

const stagingRequire = createRequire(path.join(staging, '.next', 'standalone', 'server.js'))
stagingRequire.resolve('next')
stagingRequire.resolve('@swc/helpers/_/_interop_require_default')

console.log('Prepared the self-contained Next.js server for Electron packaging.')
