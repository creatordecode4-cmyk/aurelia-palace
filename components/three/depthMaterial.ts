import * as THREE from 'three'

/** Largest parallax offset in UV units; must stay below uMargin so samples never leave the photo. */
export const MAX_SHIFT = 0.012
export const MARGIN = 0.03

/**
 * Photo material with depth parallax.
 *
 * - uShift: camera sway (mouse / tilt). Pixels are offset by (depth − focus), so near things move
 *   more and far things slightly the other way, like a real parallax.
 * - uDolly: scroll-driven push-in that magnifies near pixels more than far ones.
 * - uSlice: optional depth band (min, softness) so one photo can be split into planes at different z.
 * - uMargin: every sample is taken from an inset window of the photo, so the displacement never
 *   reaches past the image edge (no smeared or stretched borders).
 * - The sway shift is capped (MAX_SHIFT) and fades to zero near the frame border, so pixels at the
 *   edge of a photo (or of a door gap showing it) never get pulled or smeared.
 */
export function createDepthMaterial(map: THREE.Texture, depth: THREE.Texture, hasDepth: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uMap: { value: map },
      uDepth: { value: depth },
      uHasDepth: { value: hasDepth ? 1 : 0 },
      uShift: { value: new THREE.Vector2() },
      uStrength: { value: 1 },
      uDolly: { value: 0 },
      uFocus: { value: new THREE.Vector2(0.5, 0.5) },
      uSlice: { value: new THREE.Vector2(0, 0.08) },
      uMargin: { value: MARGIN },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform sampler2D uDepth;
      uniform float uHasDepth;
      uniform vec2 uShift;
      uniform float uStrength;
      uniform float uDolly;
      uniform vec2 uFocus;
      uniform vec2 uSlice;
      uniform float uMargin;
      uniform float uOpacity;
      varying vec2 vUv;

      // Map plane UV into the inset window [margin, 1 - margin].
      vec2 inset(vec2 uv) { return mix(vec2(uMargin), vec2(1.0 - uMargin), uv); }

      void main() {
        vec2 base = inset(vUv);
        float d = mix(0.5, texture2D(uDepth, base).r, uHasDepth);

        // Depth-aware push-in: near pixels are magnified more.
        vec2 uv = uFocus + (base - uFocus) / (1.0 + uDolly * d * uHasDepth);
        // Parallax: near (d > 0.4) moves with the camera sway, far moves slightly against it.
        // Capped, and faded out over the outer 8% of the frame so border pixels stay put.
        vec2 edge = min(vUv, 1.0 - vUv);
        float borderFade = smoothstep(0.0, 0.08, min(edge.x, edge.y));
        vec2 shift = uShift * (d - 0.4) * uStrength * uHasDepth * borderFade;
        float len = length(shift);
        if (len > ${MAX_SHIFT.toFixed(4)}) shift *= ${MAX_SHIFT.toFixed(4)} / len;
        uv -= shift;
        uv = clamp(uv, vec2(0.001), vec2(0.999));

        vec4 color = texture2D(uMap, uv);
        float alpha = uOpacity;
        if (uSlice.x > 0.0) {
          float ds = texture2D(uDepth, uv).r;
          alpha *= smoothstep(uSlice.x - uSlice.y, uSlice.x + uSlice.y, ds);
        }
        gl_FragColor = vec4(color.rgb, alpha);
        #include <colorspace_fragment>
      }
    `,
  })
}

export type DepthMaterial = ReturnType<typeof createDepthMaterial>
