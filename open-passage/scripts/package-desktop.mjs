import { spawn } from 'node:child_process'
import path from 'node:path'

const root = process.cwd()
const architecture = process.argv[2]
const supportedArchitectures = new Set(['arm64', 'x64'])

if (!supportedArchitectures.has(architecture)) {
  console.error('Usage: node scripts/package-desktop.mjs <arm64|x64>')
  process.exit(1)
}

const builder = path.join(root, 'node_modules', '.bin', 'electron-builder')
const staging = '/tmp/open-passage-desktop'
const output = path.join(root, 'release')

const child = spawn(
  builder,
  [
    '--mac',
    'pkg',
    `--${architecture}`,
    '--publish',
    'never',
    `--config.directories.output=${output}`,
  ],
  {
    cwd: staging,
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY || 'false',
    },
    stdio: 'inherit',
  },
)

child.once('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.once('exit', (code) => {
  process.exit(code ?? 1)
})
