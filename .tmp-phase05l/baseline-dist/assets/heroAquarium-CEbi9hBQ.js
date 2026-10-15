import{al as ce,S as le,aw as ve,W as ue,C as P,ap as X,aE as k,V as ee,z as B,u as Z,f as pe,I as q,aG as $,t as fe,aH as me,ay as de,D as he,O as ge,aI as J,aJ as we,U as xe,aK as Se,aL as Me,aM as ye}from"./BufferGeometryUtils-DK7Fls90.js";const o=i=>xe.euclideanModulo(Math.sin(i*127.1+311.7)*43758.5453,1),K=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,Q=`
  uniform float uTime;
  uniform vec2 uSize;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + 1.0), f.x), f.y);
  }
  float caustic(vec2 p) {
    // Organic water-light: low-frequency domain warp breaks the sine
    // lattice into irregular filaments; a slow noise mask keeps patches
    // faintly visible instead of a full-screen web. Exponents are soft
    // (8/10 vs 18/22) to avoid sharp crossing lines.
    vec2 warp = vec2(
      noise(p * 0.32 + vec2(uTime * 0.030, -uTime * 0.022)),
      noise(p * 0.32 + vec2(5.2, 1.3) + vec2(-uTime * 0.020, uTime * 0.026))
    ) * 2.0 - 1.0;
    vec2 q = p + warp * 1.1;
    float a = sin(q.x * 1.7 + q.y * 0.6 + uTime * 0.12) + sin(q.y * 1.5 - q.x * 0.5 - uTime * 0.09);
    float b = sin((q.x - q.y) * 1.1 + uTime * 0.07) + cos(q.y * 1.2 + q.x * 0.4 + 1.7);
    float filaments = pow(1.0 - abs(a) * 0.5, 8.0) * 0.55 + pow(1.0 - abs(b) * 0.5, 10.0) * 0.45;
    float mask = smoothstep(0.28, 0.75, noise(p * 0.27 + warp * 0.6 + uTime * 0.015));
    return filaments * (0.25 + 0.75 * mask);
  }
  // Two counter-drifting procedural normal layers over a low-frequency
  // calm mask. UVs are noise-warped so no sine lattice or stripe
  // repetition shows. Returns surface slope (not a unit normal).
  float wHeight(vec2 v) {
    return sin(dot(v, vec2(1.1, 0.6)) + uTime * 0.35) * 0.50
         + sin(dot(v, vec2(-0.7, 1.3)) + 1.7 - uTime * 0.27) * 0.35
         + sin(dot(v, vec2(0.5, -1.1)) * 1.7 + 0.6 + uTime * 0.22) * 0.15;
  }
  float calmMask(vec2 p) {
    return smoothstep(0.30, 0.70, noise(p * 0.16 - vec2(uTime * 0.012, uTime * 0.008)));
  }
  vec2 waterSlope(vec2 p) {
    vec2 w = vec2(
      noise(p * 0.25 + vec2(uTime * 0.020, uTime * 0.013)),
      noise(p * 0.25 + vec2(3.7, 9.1) - vec2(uTime * 0.017, -uTime * 0.011))
    ) - 0.5;
    vec2 q = p * 0.55 + w * 1.4;
    float e = 0.35;
    float s = 0.35 + 0.65 * calmMask(p);
    vec2 g = vec2(
      wHeight(q + vec2(e, 0.0)) - wHeight(q - vec2(e, 0.0)),
      wHeight(q + vec2(0.0, e)) - wHeight(q - vec2(0.0, e))
    ) / (2.0 * e);
    return g * 0.18 * s;
  }
  // Sun azimuth (scene sun sits at (-4, 6, 10)): soft broad glints where
  // slopes face the sun, plus a faint sharp accent. Restrained by design.
  float sunGlint(vec2 slope) {
    return pow(clamp(0.5 + dot(slope, vec2(-0.573, 0.819)) * 3.0, 0.0, 1.0), 6.0);
  }
  float sunAccent(vec2 slope) {
    return pow(clamp(0.5 + dot(slope, vec2(-0.573, 0.819)) * 4.0, 0.0, 1.0), 24.0);
  }
`;function be(){const i=[],c=(t,r)=>{t.setAttribute("aPart",new Se(new Float32Array(t.attributes.position.count).fill(r),1)),i.push(t.toNonIndexed()),t.dispose()},v=new J(1,20,12),s=v.attributes.position;for(let t=0;t<s.count;t++){const r=s.getX(t),p=.7+.3*(r+1)/2;s.setXYZ(t,r*.7,s.getY(t)*.23*p,s.getZ(t)*.18*p)}v.computeVertexNormals(),c(v,0);const g=t=>{const r=new Me(t.map(([x,b])=>new ee(x,b))),p=new ye(r);p.translate(0,0,.015),c(p,1)};g([[-.56,0],[-1.13,.34],[-1.03,.08],[-.92,0],[-1.03,-.08],[-1.13,-.34]]);for(const t of[-1,1]){g([[.25,t*.12],[-.16,t*.48],[-.34,t*.35],[-.08,t*.09]]);const r=new J(.037,8,5);r.scale(1,1,.55),r.translate(.47,t*.117,.116),c(r,2)}const u=we(i);return i.forEach(t=>t.dispose()),u}function Te(i,c,v,s,g=v<s){const t=(i%2?-1:1)*(.028+o(i+5)*.018),r=c*t+i*2.39996+.6,p=v*(.32+o(i+8)*.065),x=s*(g?.095:.31+o(i+12)*.07),b=g?(i%2?-1:1)*s*.32:0;return{x:Math.cos(r)*p,y:b+Math.sin(r)*x,angle:Math.atan2(Math.cos(r)*x*t,-Math.sin(r)*p*t),depth:.7+o(i+20)*.9,scale:.65+o(i+30)*.35}}function Pe(i){const c=new ce({antialias:!1,alpha:!1,powerPreference:"low-power",stencil:!1,depth:!0});c.outputColorSpace=le,c.setClearColor("#0c2636"),i.appendChild(c.domElement);const v=new ve,s=new ue(-10,10,7,-7,.1,30);s.position.set(0,0,20),s.lookAt(0,0,0);const g=new Set,u=e=>(g.add(e),e),t={value:18},r={value:new ee(20,14)},p={value:new P},x={value:new P},b={value:new P},j={value:new P},E={value:0},D={uTime:t,uSize:r,uDeep:p,uShallow:x,uSand:b,uLight:j,uDark:E},z=u(new X(1,1)),te=u(new k({uniforms:D,vertexShader:K,fragmentShader:`${Q}
      uniform vec3 uDeep, uShallow, uSand, uLight;
      uniform float uDark;
      void main() {
        vec2 p = (vUv - 0.5) * uSize;
        float n = noise(p * 0.55) * 0.65 + noise(p * 1.3) * 0.35;
        float large = noise(p * 0.18 + vec2(uTime * 0.010, 0.0));
        float edge = smoothstep(0.3, 0.72, length((vUv - 0.5) * vec2(1.0, 1.1)));
        float bank = smoothstep(0.52, 0.86, n + edge * 0.32);
        float center = 1.0 - smoothstep(0.12, 0.38, length((vUv - 0.5) * vec2(0.7, 1.6)));
        vec3 color = mix(uShallow, uDeep, (0.18 + n * 0.32 + edge * 0.48) * (1.0 - center * 0.5));
        color = mix(color, uDeep, large * 0.18 * (1.0 - center * 0.4));
        color = mix(color, uSand, bank * 0.36 * (1.0 - center));
        float grain = hash(floor(p * 110.0)) - 0.5;
        color += grain * 0.012 * (1.0 - uDark * 0.7);
        // Caustic lookup rides the surface slope (light coupled to the same
        // field that shades the surface) + normal-driven sun glints.
        vec2 slope = waterSlope(p);
        float cl = caustic(p * 0.9 + slope * 1.5);
        float cmask = smoothstep(0.30, 0.75, noise(p * 0.30 + uTime * 0.020));
        color += uLight * cl * (0.016 + edge * 0.030) * (0.35 + 0.65 * cmask) * (1.0 - center * 0.8);
        color += uLight * sunGlint(slope) * 0.022 * (1.0 - center * 0.7);
        color += uLight * sunAccent(slope) * 0.014 * (1.0 - center * 0.7);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `})),_=new B(z,te);v.add(_);const ae=u(new k({uniforms:D,side:Z,vertexShader:`
      uniform float uTime;
      attribute float aPart;
      attribute float aSeed;
      varying vec3 vPosition, vNormal;
      varying float vPart, vSeed, vDepth;
      varying vec2 vWaters;
      void main() {
        vec3 p = position;
        float flex = 1.0 - smoothstep(-1.15, 0.1, p.x);
        p.y += sin(uTime * (3.4 + aSeed * 0.7) + aSeed * 12.0 + p.x * 4.0) * flex * flex * 0.14;
        vPosition = position;
        vNormal = normalize(mat3(instanceMatrix) * normal);
        vPart = aPart; vSeed = aSeed; vDepth = instanceMatrix[3].z;
        vWaters = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xy;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,fragmentShader:`
      uniform vec3 uDeep, uShallow;
      uniform float uDark;
      uniform float uTime;
      varying vec3 vPosition, vNormal;
      varying float vPart, vSeed, vDepth;
      varying vec2 vWaters;
      // Single-pass approximation, NOT true refraction — the fish tint
      // breathes with the same slow field that moves the surface, so fish
      // read as seen through moving water. Subtle by design (±0.05 mix).
      float fishHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float fishNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(fishHash(i), fishHash(i + vec2(1, 0)), f.x), mix(fishHash(i + vec2(0, 1)), fishHash(i + 1.0), f.x), f.y);
      }
      void main() {
        vec2 p = vPosition.xy;
        float marking = sin(p.x * 13.0 + vSeed * 33.0 + sin(p.y * 18.0)) * cos(p.y * 13.0 - vSeed * 12.0);
        vec3 cream = vec3(0.73, 0.72, 0.59);
        vec3 pigment = mix(vec3(0.63, 0.22, 0.075), vec3(0.075, 0.22, 0.24), step(0.55, vSeed));
        vec3 color = mix(cream, pigment, smoothstep(-0.1, 0.35, marking));
        color = mix(color, vec3(0.025, 0.065, 0.065), smoothstep(0.72, 0.88, marking) * 0.7);
        if (vPart > 0.5) color = mix(cream, pigment, 0.22) * (0.65 + 0.2 * cos(p.x * 38.0 + p.y * 22.0));
        if (vPart > 1.5) color = vec3(0.012, 0.026, 0.03);
        float diffuse = 0.45 + 0.55 * max(0.0, dot(normalize(vNormal), normalize(vec3(-0.4, 0.5, 1.0))));
        color *= diffuse * (1.0 - uDark * 0.48);
        float wob = fishNoise(vWaters * 0.30 + uTime * 0.02) - 0.5;
        color = mix(color, mix(uDeep, uShallow, 0.45), clamp(0.22 + (1.6 - vDepth) * 0.16 + wob * 0.10, 0.0, 0.6));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `})),F=u(be());F.setAttribute("aSeed",new pe(new Float32Array(Array.from({length:6},(e,l)=>o(l+60))),1));const w=new q(F,ae,6);w.frustumCulled=!1,w.instanceMatrix.setUsage($),v.add(w);const oe=u(new k({transparent:!0,depthWrite:!1,vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",fragmentShader:"varying vec2 vUv; void main() { float a = pow(max(0.0, 1.0 - length((vUv - 0.5) * 2.0)), 2.0) * 0.28; gl_FragColor = vec4(0.01, 0.035, 0.045, a); }"})),S=new q(z,oe,6);S.frustumCulled=!1,S.instanceMatrix.setUsage($),v.add(S);const O=u(new fe({roughness:1,flatShading:!0})),h=new q(u(new me(1,1)),O,32);h.frustumCulled=!1,v.add(h),v.add(new de("#c7ece7",2.1));const G=new he("#d9f6f1",2.2);G.position.set(-4,6,10),v.add(G);const L=u(new X(1,1,1,7)),C=L.attributes.position;for(let e=0;e<C.count;e++){const l=C.getY(e)+.5;C.setXYZ(e,C.getX(e)*Math.sin(Math.PI*l)*.26+l*l*.18,l,Math.sin(l*2.5)*.18)}L.computeVertexNormals();const se=u(new k({uniforms:D,side:Z,vertexShader:`
      uniform float uTime;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.x += sin(uTime * 0.65 + instanceMatrix[3].x * 3.0 + p.y * 2.0) * p.y * p.y * 0.055;
        vShade = 0.55 + 0.45 * abs(normal.z);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,fragmentShader:`
      uniform float uDark;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vec3 color = mix(vec3(0.045, 0.165, 0.135), vec3(0.16, 0.30, 0.22), vUv.y);
        color *= vShade * (1.0 - uDark * 0.48);
        color += vec3(0.05, 0.10, 0.08) * pow(1.0 - abs(vUv.x - 0.5) * 2.0, 16.0);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `})),M=new q(L,se,64);M.frustumCulled=!1,v.add(M);const ne=u(new k({uniforms:D,transparent:!0,depthWrite:!1,vertexShader:K,fragmentShader:`${Q}
      uniform vec3 uLight;
      float ripple(vec2 p, vec2 origin, float offset) {
        float age = mod(uTime + offset, 15.0);
        float d = length(p - origin);
        float ring = sin(d * 20.0 - age * 6.0) * exp(-pow((d - age * 0.32) * 4.0, 2.0));
        return max(0.0, ring) * smoothstep(0.0, 0.6, age) * (1.0 - smoothstep(2.5, 4.5, age));
      }
      void main() {
        vec2 p = (vUv - 0.5) * uSize;
        float center = smoothstep(0.1, 0.38, length((vUv - 0.5) * vec2(0.8, 1.8)));
        float rings = ripple(p, uSize * vec2(-0.29, 0.27), 0.0) + ripple(p, uSize * vec2(0.3, -0.29), 7.0);
        // Surface sheen follows the same normal field as the floor glints,
        // so highlights sit on the same moving water.
        vec2 slope = waterSlope(p);
        float glint = sunGlint(slope);
        float accent = sunAccent(slope);
        float alpha = (caustic(p * 0.7 + slope) * 0.022 + rings * 0.16 + glint * 0.016 + accent * 0.022) * center;
        gl_FragColor = vec4(uLight, alpha);
        #include <colorspace_fragment>
      }
    `})),A=new B(z,ne);A.position.z=2.8,A.renderOrder=2,v.add(A);const n=new ge;let f=20,d=14,R=!1;function W(e,l,m=window.devicePixelRatio||1){const T=e<=720;R=T||e<l,c.setPixelRatio(Math.min(m,T?1:1.25)),c.setSize(e,l);const H=e/Math.max(l,1);f=H<1?9:16*H,d=f/H,r.value.set(f,d),s.left=-f/2,s.right=f/2,s.top=d/2,s.bottom=-d/2,s.updateProjectionMatrix(),_.scale.set(f,d,1),A.scale.copy(_.scale),w.count=S.count=T?3:6,h.count=T?18:32,M.count=T?36:64;for(let a=0;a<h.count;a++){const y=a%4,N=(o(a+120)-.5)*.07*f,I=(o(a+130)-.5)*.07*d,U=(y<2?-1:1)*(.43+o(a+80)*.09)*f+N,re=(y%2?-1:1)*(.31+o(a+95)*.23)*d+I,V=.25+o(a+100)*.52;n.position.set(U,re,-.04),n.rotation.set(o(a)*.8,o(a+2)*.8,o(a+4)*Math.PI),n.scale.set(V*1.5,V,V*.65),n.updateMatrix(),h.setMatrixAt(a,n.matrix),h.setColorAt(a,new P().setHSL(.45+o(a)*.05,.1,.38+o(a+1)*.12))}for(let a=0;a<M.count;a++){const y=Math.floor(a/8),N=y%2===0,I=y%4<2;n.position.set((N?-1:1)*f*(.435+o(y+170)*.05)+(o(a+180)-.5)*.08*f,(I?1:-1)*d*(.3+o(y+210)*.17)+(o(a+190)-.5)*.06*d,.18+o(a)*.1),n.rotation.set(0,0,o(a+150)*Math.PI*2);const U=.8+o(a+160)*1.1;n.scale.set(U,U,U),n.updateMatrix(),M.setMatrixAt(a,n.matrix)}h.instanceMatrix.needsUpdate=!0,h.instanceColor.needsUpdate=!0,M.instanceMatrix.needsUpdate=!0}function Y(e){E.value=e?1:0,p.value.set(e?"#061923":"#3f777f"),x.value.set(e?"#123948":"#b3dad6"),b.value.set(e?"#254249":"#a9bba6"),j.value.set(e?"#76c4cc":"#e1f2df"),O.color.set(e?"#527e89":"#b4c7b0"),G.intensity=e?1.1:2.2}function ie(e=18){t.value=e;for(let l=0;l<w.count;l++){const m=Te(l,e,f,d,R);n.position.set(m.x,m.y,m.depth),n.rotation.set(0,0,m.angle),n.scale.setScalar(m.scale),n.updateMatrix(),w.setMatrixAt(l,n.matrix),n.position.set(m.x+.16,m.y-.2,.02),n.scale.set(m.scale*2.4,m.scale*1.05,1),n.updateMatrix(),S.setMatrixAt(l,n.matrix)}w.instanceMatrix.needsUpdate=!0,S.instanceMatrix.needsUpdate=!0,c.render(v,s)}return Y(document.documentElement.dataset.theme==="dark"),W(i.clientWidth,i.clientHeight),{render:ie,resize:W,setTheme:Y,canvas:c.domElement,info:c.info,setApproach(e){s.position.y=-3.2*e,s.lookAt(0,0,0)},dispose(){for(const e of[w,S,h,M])e.dispose();g.forEach(e=>e.dispose()),c.dispose(),c.forceContextLoss(),c.domElement.remove()}}}export{Pe as createHeroAquarium,Te as fishPose};
