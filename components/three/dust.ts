import * as THREE from 'three'

const DEPTH = 16

/** Gold dust as real points in 3D: nearer motes are bigger and stream past faster as the camera travels. */
export function createDust(count: number) {
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 9
    pos[i * 3 + 1] = (Math.random() - 0.5) * 6
    pos[i * 3 + 2] = -Math.random() * DEPTH
    seed[i] = Math.random()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uSize: { value: 60 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uTravel;
      uniform float uSize;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        // Stream toward the camera with travel and wrap around, so there is always dust ahead.
        p.z = mod(p.z + uTravel + ${DEPTH.toFixed(1)}, ${DEPTH.toFixed(1)}) - ${DEPTH.toFixed(1)};
        p.x += sin(uTime * 0.35 + aSeed * 40.0) * 0.25;
        p.y += mod(uTime * (0.05 + aSeed * 0.08) + aSeed * 6.0, 6.0) - 3.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        gl_PointSize = uSize * (0.4 + aSeed) * uPixelRatio / max(dist, 0.5);
        gl_Position = projectionMatrix * mv;
        // Fade in from the far end and out just before reaching the lens.
        float fade = smoothstep(${DEPTH.toFixed(1)}, ${(DEPTH - 4).toFixed(1)}, dist) * smoothstep(0.4, 1.6, dist);
        float twinkle = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 30.0);
        vAlpha = fade * twinkle;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float glow = smoothstep(0.5, 0.0, r);
        glow = glow * glow;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.55) * glow, glow * vAlpha);
      }
    `,
  })
  const points = new THREE.Points(geo, mat)
  points.renderOrder = 100
  points.frustumCulled = false
  return { points, mat }
}
