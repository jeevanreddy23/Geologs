import { spawnSync } from 'node:child_process'

const isWindows = process.platform === 'win32'
const command = isWindows ? 'cmd.exe' : 'npm'
const args = isWindows
  ? ['/d', '/s', '/c', 'npm', 'run', 'build', '--prefix', 'as1726-logger']
  : ['run', 'build', '--prefix', 'as1726-logger']

const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NITRO_PRESET: 'vercel',
  },
})

if (result.error) {
  console.error(result.error)
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
