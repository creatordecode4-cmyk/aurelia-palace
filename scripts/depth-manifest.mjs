// Lists the depth maps in public/depth so the site knows which photos get 3D depth.
// Runs automatically before `dev` and `build`; drop `<photo>-depth.png` in and it is picked up.
// An optional `<photo>-depth-sm.png` is used on phones instead of the full map.
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'public', 'depth')
const files = new Set(readdirSync(dir))
const images = [...files]
  .filter((f) => f.endsWith('-depth.png'))
  .map((f) => f.replace(/-depth\.png$/, ''))
  .sort()
const small = images.filter((name) => files.has(`${name}-depth-sm.png`))

writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ images, small }, null, 2) + '\n')
console.log(`depth manifest: ${images.length ? images.join(', ') : 'no depth maps yet'}`)
