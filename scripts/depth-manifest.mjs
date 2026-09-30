// Lists the depth maps in public/depth so the site knows which photos get 3D depth.
// Runs automatically before `dev` and `build`; drop a PNG in and it is picked up.
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'public', 'depth')
const images = readdirSync(dir)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.replace(/\.png$/, ''))
  .sort()

writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ images }, null, 2) + '\n')
console.log(`depth manifest: ${images.length ? images.join(', ') : 'no depth maps yet'}`)
