import { cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const rootOutput = resolve('.vercel', 'output')
const appOutput = resolve('as1726-logger', '.vercel', 'output')
const fallbackNitroOutput = resolve('as1726-logger', '.output')

if (!existsSync(appOutput)) {
  const detail = existsSync(fallbackNitroOutput)
    ? 'Found as1726-logger/.output instead. The Vercel deployment build must produce as1726-logger/.vercel/output.'
    : 'No as1726-logger/.vercel/output folder was produced.'

  throw new Error(`${detail} Check the TanStack Start/Nitro Vercel preset before deploying.`)
}

await rm(rootOutput, { recursive: true, force: true })
await cp(appOutput, rootOutput, { recursive: true })

console.log(`Prepared Vercel Build Output API at ${rootOutput}`)
