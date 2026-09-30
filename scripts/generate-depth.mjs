// Generates a depth map for every journey photo with Depth Anything V2 (small) via transformers.js.
//
//   npm install --no-save @huggingface/transformers
//   npm run depth
//
// The model (~100 MB) downloads from Hugging Face on first run. Output: public/depth/<name>-depth.png
// (512 px wide) and <name>-depth-sm.png (256 px, phones), greyscale, white = near.
// Any tool that produces that format works too; the -sm file is optional.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const NAMES = ['bahar', 'darwaza', 'lobby', 'reception', 'key', 'corridor', 'room1', 'room2', 'room3', 'restaurant']
const MODEL = process.env.DEPTH_MODEL ?? 'onnx-community/depth-anything-v2-small'

let transformers
try {
  transformers = await import('@huggingface/transformers')
} catch {
  console.error('Missing @huggingface/transformers. Run: npm install --no-save @huggingface/transformers')
  process.exit(1)
}
const { pipeline, RawImage } = transformers

const root = process.cwd()
const out = join(root, 'public', 'depth')
mkdirSync(out, { recursive: true })

console.log(`Loading ${MODEL} …`)
const estimate = await pipeline('depth-estimation', MODEL, { dtype: 'fp32' })

const only = process.argv.slice(2)
for (const name of only.length ? only : NAMES) {
  const image = await RawImage.read(join(root, 'public', 'images', `${name}.jpg`))
  const { depth } = await estimate(image)
  // The site smooths maps on load, so small files are enough: 512 px for desktop, 256 px for phones.
  for (const [suffix, width] of [['', 512], ['-sm', 256]]) {
    const resized = await depth.resize(width, Math.round((depth.height / depth.width) * width))
    await resized.save(join(out, `${name}-depth${suffix}.png`))
  }
  console.log(`  ${name}-depth.png`)
}

await import('./depth-manifest.mjs')
