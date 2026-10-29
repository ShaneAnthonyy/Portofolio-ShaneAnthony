import * as THREE from 'three'

const CLOUD_PERIOD = 128

export function createMinecraftSky(environment) {
  const uniforms = {
    uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() }, uCloud: { value: new THREE.Color() },
    uSun: { value: new THREE.Vector3() }, uMoon: { value: new THREE.Vector3() },
    uSunRight: { value: new THREE.Vector3() }, uSunUp: { value: new THREE.Vector3() },
    uMoonRight: { value: new THREE.Vector3() }, uMoonUp: { value: new THREE.Vector3() },
    uSunVisible: { value: 0 }, uMoonVisible: { value: 0 }, uStars: { value: 0 },
    uDark: { value: 0 }, uVeil: { value: 1 },
    uCloudOffset: { value: new THREE.Vector2() },
  }
  const geometry = new THREE.SphereGeometry(90, 48, 24)
  const material = new THREE.ShaderMaterial({
    name: 'MinecraftSkyMaterial', uniforms, side: THREE.BackSide,
    depthWrite: false, fog: false, toneMapped: false,
    vertexShader: `varying vec3 vDirection;
      varying vec2 vSkyUV;
      void main() {
        vDirection = position;
        vSkyUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDirection;
      varying vec2 vSkyUV;
      uniform vec3 uTop, uMid, uHorizon, uGlow, uSunColor, uCloud, uSun, uMoon;
      uniform vec3 uSunRight, uSunUp, uMoonRight, uMoonUp;
      uniform float uSunVisible, uMoonVisible, uStars, uDark, uVeil;
      uniform vec2 uCloudOffset;
      float hash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * .1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }
      float square(vec2 uv, float size) {
        return 1. - smoothstep(size, size + .0008, max(abs(uv.x), abs(uv.y)));
      }
      vec2 cloud(vec2 p) {
        vec2 tile = floor(p / 16.);
        tile.x = mod(tile.x + 4., 8.) - 4.;
        float seed = hash(tile);
        if (seed < .54) return vec2(0.);
        vec2 local = mod(p, 16.) - floor(vec2(seed * 3., fract(seed * 7.) * 3.));
        float width = 5. + floor(seed * 6.);
        float height = 2. + floor(fract(seed * 13.) * 3.);
        float a = step(1., local.x) * step(local.x, width + 1.) * step(3., local.y) * step(local.y, 4. + height);
        float b = step(4., local.x) * step(local.x, width + 3.) * step(4., local.y) * step(local.y, 6. + height);
        float shade = mix(.86, 1., step(4., local.y));
        return vec2(max(a, b), shade);
      }
      void main() {
        vec3 ray = normalize(vDirection);
        float height = max(ray.y, 0.);
        vec3 color = mix(uHorizon, uMid, smoothstep(0., .38, height));
        color = mix(color, uTop, smoothstep(.16, .62, height));
        float horizonGlow = (1. - smoothstep(0., .17, height)) * smoothstep(-.06, 0., ray.y);
        color = mix(color, uGlow, horizonGlow * .32);

        float azimuth = (fract(.25 - vSkyUV.x) - .5) * 6.2831853;
        if (uStars > .001 && ray.y > .015) {
          vec2 starsUV = vec2(azimuth, (vSkyUV.y - .5) * 3.1415927) * 95.;
          vec2 starCell = floor(starsUV);
          vec2 starPixel = abs(fract(starsUV) - .5);
          float star = step(.986, hash(starCell)) * (1. - step(.10, max(starPixel.x, starPixel.y)));
          color = mix(color, vec3(.72, .80, .94), star * uStars * smoothstep(.015, .10, height) * .8);
        }

        if (uSunVisible > .001 && dot(ray, uSun) > .9) {
          vec2 sunUV = vec2(dot(ray, uSunRight), dot(ray, uSunUp));
          float sun = square(sunUV, .020) * uSunVisible;
          float sunHalo = square(sunUV, .029) * .06 + square(sunUV, .024) * .1;
          color = mix(color, uSunColor, sunHalo * uSunVisible);
          color = mix(color, uSunColor, sun);
        }

        if (uMoonVisible > .001 && dot(ray, uMoon) > .9) {
          vec2 moonUV = vec2(dot(ray, uMoonRight), dot(ray, uMoonUp));
          float moon = square(moonUV, .019) * uMoonVisible;
          vec2 pixel = floor(moonUV / .006);
          float crater = step(.62, hash(pixel + 19.));
          vec3 moonColor = mix(vec3(.72, .80, .91), vec3(.46, .57, .72), crater * .48);
          color = mix(color, moonColor, moon);
        }

        if (ray.y > .075) {
          vec2 cloudUV = ray.xz / ray.y * 10. + vec2(5., 9.);
          // Keep the approved title lane fixed while complete cloud silhouettes translate.
          vec2 cloudMask = vec2(0.);
          if (!(abs(cloudUV.x - 5.) < 16. && cloudUV.y > -36. && cloudUV.y < -9.)) {
            cloudMask = cloud(cloudUV + vec2(uCloudOffset.x + uCloudOffset.y, 0.));
          }
          float clouds = cloudMask.x * smoothstep(.075, .19, ray.y);
          vec3 cloudColor = mix(uCloud, uHorizon, uDark * .55) * cloudMask.y;
          color = mix(color, cloudColor, clouds * mix(.88, .38, uDark));
        }

        if (ray.y < .005) {
          float block = floor(azimuth * 105.) / 105.;
          float farLine = -.022 + .011 * sin(block * 11.) + .006 * sin(block * 29. + 2.);
          float nearLine = -.048 + .014 * sin(block * 8. + 1.) + .008 * sin(block * 23.);
          color = mix(color, uHorizon * vec3(.49, .62, .64), 1. - step(farLine, ray.y));
          color = mix(color, uHorizon * vec3(.34, .48, .43), 1. - step(nearLine, ray.y));
        }
        gl_FragColor = vec4(color * uVeil, 1.);
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'MinecraftSky'
  // Draw last among opaque objects so terrain depth rejects hidden sky pixels.
  mesh.renderOrder = 1000
  mesh.frustumCulled = false
  const place = (target, direction, spread) => {
    const elevation = Math.sign(direction[1]) * THREE.MathUtils.smoothstep(Math.abs(direction[1]), 0, .35)
    return target.set(
      (direction[0] * .57 - direction[1] * .44) * spread,
      elevation * .425 + .02, -1,
    ).normalize()
  }
  const visibility = direction => THREE.MathUtils.smoothstep(direction[1], -.06, .06)
  const up = new THREE.Vector3(0, 1, 0)
  const orient = (right, vertical, direction) => {
    right.crossVectors(direction, up).normalize()
    vertical.crossVectors(right, direction)
  }
  let previousSample, previousAspect, previousMode, wind = 0, modeOffset = 0
  const wrap = value => THREE.MathUtils.euclideanModulo(value, CLOUD_PERIOD)
  const update = (sample, veil = 1, aspect = 1.6, delta = 0, mode = 'manual') => {
    uniforms.uVeil.value = veil
    // Keep ambient seconds independent of civil time and bounded for long sessions.
    wind = wrap(wind + Math.min(Math.max(delta, 0), .1) * .03)
    if (previousMode === 'manual' && mode === 'live') {
      modeOffset = wrap(modeOffset + (previousSample.minutes - sample.minutes) / 1440 * CLOUD_PERIOD)
    }
    uniforms.uCloudOffset.value.set(wrap((sample.minutes - 720) / 1440 * CLOUD_PERIOD), wrap(wind + modeOffset))
    previousMode = mode
    const changed = sample !== previousSample
    if (!changed && aspect === previousAspect) return
    if (changed) {
      uniforms.uTop.value.fromArray(sample.skyZenith)
      uniforms.uMid.value.fromArray(sample.skyMiddle)
      uniforms.uHorizon.value.fromArray(sample.skyLine)
      uniforms.uGlow.value.fromArray(sample.skyGlow)
      uniforms.uSunColor.value.fromArray(sample.skySun)
      uniforms.uCloud.value.fromArray(sample.cloudTint)
      uniforms.uSunVisible.value = visibility(sample.sunDirection)
      uniforms.uMoonVisible.value = visibility(sample.moonDirection)
      uniforms.uStars.value = sample.starVisibility
      uniforms.uDark.value = sample.darkness
    }
    const spread = THREE.MathUtils.clamp(aspect / .9, .5, 1)
    place(uniforms.uSun.value, sample.sunDirection, spread)
    place(uniforms.uMoon.value, sample.moonDirection, spread)
    orient(uniforms.uSunRight.value, uniforms.uSunUp.value, uniforms.uSun.value)
    orient(uniforms.uMoonRight.value, uniforms.uMoonUp.value, uniforms.uMoon.value)
    previousSample = sample
    previousAspect = aspect
  }
  update(environment)
  return { mesh, geometry, material, update }
}
