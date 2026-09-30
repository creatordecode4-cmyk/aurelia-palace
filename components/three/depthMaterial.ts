import * as THREE from 'three'

/**
 * Photo material with depth parallax.
 *
 * - uShift: camera sway (mouse / tilt). Pixels are offset by (depth − focus), so near things move
 *   more and far things slightly the other way, like a real parallax.
 * - uDolly: scroll-driven push-in that magnifies near pixels more than far ones.
 * - uSlice: optional depth band (min, softness) so one photo can be split into planes at different z.
 * - uMargin: every sample is taken from an inset window of the photo, so the displacement never
 *   reaches past the image edge (no smeared or stretched borders).
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
      uMargin: { value: 0.03 },
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
        uv -= uShift * (d - 0.4) * uStrength * uHasDepth;
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
