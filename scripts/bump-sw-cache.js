



import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const changelogSrc = readFileSync(join(root, 'src/changelog.js'), 'utf8')
const versionMatch = changelogSrc.match(/APP_VERSION = '([^']+)'/)
if (!versionMatch) {
  console.error('bump-sw-cache: could not find APP_VERSION in src/changelog.js')
  process.exit(1)
}
const version = versionMatch[1]

const swPath = join(root, 'dist/sw.js')
const swSrc = readFileSync(swPath, 'utf8')
const updated = swSrc.replace(/const CACHE = '[^']*'/, `const CACHE = 'countly-shell-v${version}'`)

writeFileSync(swPath, updated)
console.log(`bump-sw-cache: dist/sw.js cache name set to countly-shell-v${version}`)
