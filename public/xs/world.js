/* Xender Secrets · shared 3D world. Each page lists its chapters' scenes; the world blends between them as you scroll.
   Scenes: core · blueprint · build · ring · launch · focus · globe */
const XS = window.XH, P = XS.page;
const root = document.documentElement;
function fallback() { root.classList.add("no-webgl"); }
if (XS.reduce || XS.saveData) fallback();
else {
  let THREE = null;
  try { THREE = await import(P.three); } catch (e) { fallback(); }
  if (THREE) { try { start(THREE); } catch (e) { console.warn("3D disabled:", e && e.message); fallback(); } }
}

function start(THREE) {
  const LITE = !!XS.lite;
  const canvas = document.getElementById("world");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LITE, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x04070c, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const mobile = () => innerWidth < 860;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 90);
  const CYAN = new THREE.Color(0x5ed8ff), AMBER = new THREE.Color(0xf2b24f);
  const ADD = THREE.AdditiveBlending;
  const holo = (op, col = CYAN) => { const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: ADD, depthWrite: false, side: THREE.DoubleSide }); m.userData.base = op; return m; };
  const lineMat = (op, col = CYAN) => { const m = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: ADD, depthWrite: false }); m.userData.base = op; return m; };
  const glowTex = (inner, outer) => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, inner); gr.addColorStop(0.3, outer); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  };
  const glowCyan = glowTex("rgba(94,216,255,0.9)", "rgba(94,216,255,0.18)");
  const glowAmber = glowTex("rgba(242,178,79,0.95)", "rgba(242,178,79,0.2)");
  const sprite = (tex, s, op) => { const m = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: ADD, depthWrite: false, opacity: op }); m.userData.base = op; const sp = new THREE.Sprite(m); sp.scale.set(s, s, 1); return sp; };

  const SCENES = P.chapters.map(c => c.scene), NCH = SCENES.length;
  const PANEL_SCENES = ["build", "ring", "launch", "focus"];
  const firstPanelCh = SCENES.findIndex(s => PANEL_SCENES.includes(s));
  const PANELS = P.panels || [], NP = PANELS.length;
  const CY = 1.35;
  let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- particles: core, blueprint, field ---------- */
  const N = LITE ? 1400 : 5200;
  const posA = new Float32Array(N * 3), posB = new Float32Array(N * 3), posC = new Float32Array(N * 3), rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < N * 0.7) { const t = i / (N * 0.7), phi = Math.acos(1 - 2 * t), th = Math.PI * (1 + Math.sqrt(5)) * i, r = 0.62 + (R() - 0.5) * 0.02; x = r * Math.sin(phi) * Math.cos(th); y = r * Math.cos(phi); z = r * Math.sin(phi) * Math.sin(th); }
    else { const r = Math.cbrt(R()) * 0.5, u = R() * 2 - 1, th = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); x = r * s * Math.cos(th); y = r * u; z = r * s * Math.sin(th); }
    posA.set([x, y + CY, z], i * 3);
    posC.set([(R() - 0.5) * 20, 0.1 + R() * 6, -16 + R() * 19], i * 3);
    rnd[i] = R();
  }
  const W = 3.0, H = 1.9, L = -W / 2, Rr = W / 2, T = CY + H / 2, B = CY - H / 2;
  const segs = [];
  const line = (x1, y1, x2, y2, wgt = 1) => segs.push([x1, y1, x2, y2, wgt]);
  const rect = (x1, y1, x2, y2, wgt = 1) => { line(x1, y1, x2, y1, wgt); line(x2, y1, x2, y2, wgt); line(x2, y2, x1, y2, wgt); line(x1, y2, x1, y1, wgt); };
  const circ = (cx, cy, r) => { for (let k = 0; k < 10; k++) { const a1 = k / 10 * Math.PI * 2, a2 = (k + 1) / 10 * Math.PI * 2; line(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r, 1.6); } };
  rect(L, B, Rr, T, 1.5); line(L, T - 0.24, Rr, T - 0.24, 1.2);
  circ(L + 0.16, T - 0.12, 0.035); circ(L + 0.28, T - 0.12, 0.035); circ(L + 0.40, T - 0.12, 0.035);
  rect(L + 0.62, T - 0.17, L + 2.1, T - 0.07, 0.8);
  line(L + 0.25, T - 0.55, L + 1.55, T - 0.55, 1.4); line(L + 0.25, T - 0.70, L + 1.25, T - 0.70, 1.4);
  line(L + 0.25, T - 0.88, L + 1.40, T - 0.88, 0.6); line(L + 0.25, T - 0.97, L + 1.18, T - 0.97, 0.6);
  rect(L + 0.25, T - 1.28, L + 0.85, T - 1.13, 1);
  rect(L + 1.80, T - 1.22, Rr - 0.25, T - 0.42, 1); line(L + 1.80, T - 1.22, Rr - 0.25, T - 0.42, 0.5); line(L + 1.80, T - 0.42, Rr - 0.25, T - 1.22, 0.5);
  const cwd = (W - 0.5 - 0.24) / 3;
  for (let k = 0; k < 3; k++) { const x1 = L + 0.25 + k * (cwd + 0.12); rect(x1, B + 0.14, x1 + cwd, B + 0.5, 0.9); line(x1 + 0.1, B + 0.38, x1 + cwd * 0.7, B + 0.38, 0.5); }
  const lens = segs.map(s => Math.hypot(s[2] - s[0], s[3] - s[1]) * s[4]);
  const total = lens.reduce((a, b) => a + b, 0);
  let si = 0, acc = 0;
  for (let i = 0; i < N; i++) {
    const target = (i + R() * 0.5) / N * total;
    while (si < segs.length - 1 && acc + lens[si] < target) { acc += lens[si]; si++; }
    const s = segs[si], f = Math.min(1, Math.max(0, (target - acc) / lens[si]));
    posB.set([s[0] + (s[2] - s[0]) * f + (R() - 0.5) * 0.01, s[1] + (s[3] - s[1]) * f + (R() - 0.5) * 0.01, (R() - 0.5) * 0.02], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(posA.slice(), 3));
  pg.setAttribute("posA", new THREE.BufferAttribute(posA, 3));
  pg.setAttribute("posB", new THREE.BufferAttribute(posB, 3));
  pg.setAttribute("posC", new THREE.BufferAttribute(posC, 3));
  pg.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
  const pu = {
    uTime: { value: 0 }, wA: { value: 1 }, wB: { value: 0 }, wC: { value: 0 }, uTurb: { value: 0 },
    uSize: { value: mobile() ? 2.4 : 2.1 }, uBp: { value: mobile() ? 1.2 : 0.75 }, uPx: { value: 1 }, uAlpha: { value: 1 }, uScanY: { value: 0 },
    uCyan: { value: new THREE.Vector3(0.37, 0.85, 1.0) }, uAmber: { value: new THREE.Vector3(0.95, 0.70, 0.31) }
  };
  const points = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: pu, transparent: true, depthWrite: false, blending: ADD,
    vertexShader: `
      attribute vec3 posA; attribute vec3 posB; attribute vec3 posC; attribute float aRand;
      uniform float uTime,wA,wB,wC,uTurb,uSize,uPx,uScanY,uBp;
      varying float vAlpha; varying float vAmber;
      vec2 rot(vec2 v,float a){float c=cos(a),s=sin(a);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}
      void main(){
        vec3 a=posA-vec3(0.,${CY.toFixed(2)},0.);
        a.xz=rot(a.xz,uTime*0.22); a.xy=rot(a.xy,0.3);
        a*=1.0+0.05*sin(uTime*2.2+aRand*6.28);
        a+=vec3(0.,${CY.toFixed(2)},0.);
        vec3 c=posC+vec3(sin(uTime*0.15+aRand*30.)*0.3,sin(uTime*0.11+aRand*17.)*0.18,cos(uTime*0.13+aRand*11.)*0.3);
        vec3 p=a*wA+posB*wB+c*wC;
        p+=vec3(sin(aRand*91.7+uTime*1.3),cos(aRand*57.3+uTime*1.1),sin(aRand*23.1+uTime*0.9))*uTurb*0.75;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        float sz=uSize*(0.55+aRand*0.9)*mix(1.0,uBp,wB);
        gl_PointSize=sz*uPx*(6.5/max(0.5,-mv.z));
        vAlpha=(0.35+0.65*fract(aRand*7.13))*smoothstep(28.,7.,-mv.z);
        float scan=wB*smoothstep(0.07,0.0,abs(posB.y-uScanY));
        vAmber=max(step(0.95,aRand),scan);
      }`,
    fragmentShader: `
      uniform float uAlpha; uniform vec3 uCyan,uAmber;
      varying float vAlpha; varying float vAmber;
      void main(){ float d=length(gl_PointCoord-0.5); float m=smoothstep(0.5,0.05,d); if(m<0.02) discard;
        gl_FragColor=vec4(mix(uCyan,uAmber,vAmber)*m*vAlpha*uAlpha*mix(1.0,1.6,vAmber),1.0); }`
  }));
  points.frustumCulled = false; scene.add(points);

  /* blueprint scan beam */
  const beamTex = (() => { const c = document.createElement("canvas"); c.width = 4; c.height = 128; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(94,216,255,0)"); gr.addColorStop(0.5, "rgba(94,216,255,0.55)"); gr.addColorStop(1, "rgba(94,216,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(c); })();
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: ADD, depthWrite: false, opacity: 0 });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, 0.26), beamMat); beam.position.z = 0.02; scene.add(beam);
  const beamLine = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, 0.006), holo(0)); beamLine.position.z = 0.025; scene.add(beamLine);

  /* ---------- core: gyroscope rings, data crystal, projector ---------- */
  const core = new THREE.Group(); core.position.set(0, CY, 0); scene.add(core);
  const coreMats = []; const reg = m => (coreMats.push(m), m);
  const RINGS = [{ r: 0.98, e: [1.2, 0.2, 0.0], s: [0.0, 0.55, 0.0] }, { r: 1.14, e: [0.35, 1.0, 0.3], s: [0.38, 0.0, 0.14] }, { r: 1.30, e: [Math.PI / 2, 0.0, 0.0], s: [0.0, 0.0, -0.26] }];
  const ringObjs = RINGS.map(cfg => {
    const g = new THREE.Group(); g.rotation.set(...cfg.e);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(cfg.r, LITE ? 0.008 : 0.0055, 5, LITE ? 96 : 220), reg(holo(0.95))));
    if (!LITE) g.add(new THREE.Mesh(new THREE.TorusGeometry(cfg.r, 0.03, 8, 160), reg(holo(0.07))));
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), reg(holo(1, AMBER))); bead.position.set(cfg.r, 0, 0); g.add(bead);
    core.add(g); return { g, cfg };
  });
  const arcs = new THREE.Group(); core.add(arcs);
  [[1.5, 1.528, 0.0, 1.1, CYAN, 0.8], [1.5, 1.528, 1.5, 0.5, CYAN, 0.8], [1.5, 1.528, 2.4, 1.6, CYAN, 0.8], [1.5, 1.528, 4.35, 0.35, AMBER, 1.0], [1.58, 1.59, 0.3, 2.6, CYAN, 0.35], [1.58, 1.59, 3.4, 2.4, CYAN, 0.35]]
    .forEach(([r1, r2, st, len, col, op]) => arcs.add(new THREE.Mesh(new THREE.RingGeometry(r1, LITE ? r2 + 0.006 : r2, LITE ? 40 : 96, 1, st, len), reg(holo(op, col)))));
  const tickPos = [];
  for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2, maj = k % 8 === 0, r1 = maj ? 1.64 : 1.69, r2 = 1.74; tickPos.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute(tickPos, 3));
  const ticks = new THREE.LineSegments(tg, reg(lineMat(0.45))); core.add(ticks);
  const crystal = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.36, 1)), reg(lineMat(0.6))); core.add(crystal);
  const coreGlow = sprite(glowCyan, 2.2, 0.55); reg(coreGlow.material); core.add(coreGlow);
  const coreHot = sprite(glowAmber, 0.5, 0.9); reg(coreHot.material); core.add(coreHot);
  const projMat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 1 }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: ADD, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uOp,uTime; varying vec2 vUv; void main(){ float stripes=0.55+0.45*step(0.5,fract(vUv.x*48.+uTime*0.15)); float a=pow(1.0-vUv.y,1.6)*0.16*stripes*uOp; gl_FragColor=vec4(vec3(0.37,0.85,1.0)*a,1.0); }`
  });
  const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 1.25, CY - 0.55, LITE ? 32 : 64, 1, true), projMat);
  proj.position.set(0, (CY - 0.55) / 2, 0); scene.add(proj);

  /* ---------- floor ---------- */
  const gu = { uGrid: { value: 0.6 }, uLaunch: { value: 0 }, uCore: { value: 1 }, uTime: { value: 0 } };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(LITE ? 34 : 80, LITE ? 34 : 80), new THREE.ShaderMaterial({
    uniforms: gu, transparent: true, depthWrite: false, blending: ADD,
    vertexShader: `varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform float uGrid,uLaunch,uCore,uTime; varying vec2 vP;
      float grid(vec2 p,float s){ vec2 q=p/s; vec2 g=abs(fract(q-0.5)-0.5)/fwidth(q); return 1.0-min(min(g.x,g.y),1.0); }
      void main(){
        float d=length(vP-vec2(0.,-1.5)); float fade=smoothstep(17.,1.0,d);
        float a=(grid(vP,0.5)*0.06+grid(vP,2.5)*0.11)*fade*uGrid;
        float dc=length(vP); float ang=atan(vP.y,vP.x)/6.2832; float rings=0.;
        rings+=smoothstep(0.014,0.0,abs(dc-0.7))*step(0.3,fract(ang*24.+uTime*0.05));
        rings+=smoothstep(0.012,0.0,abs(dc-1.25))*step(0.5,fract(ang*36.-uTime*0.035));
        rings+=smoothstep(0.02,0.0,abs(dc-1.8))*0.6; rings*=uCore*0.75;
        float dl=length(vP-vec2(0.,0.55)); float r=fract(dl*0.85-uTime*0.34);
        float radar=smoothstep(0.04,0.0,abs(r-0.5))*smoothstep(4.8,0.6,dl)*uLaunch*0.8;
        gl_FragColor=vec4(vec3(0.37,0.85,1.0)*(a+rings)+vec3(0.95,0.7,0.31)*radar,1.0);
      }`
  }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  /* ---------- holo screens ---------- */
  const PW = 2.2, PH = PW * 806 / 1200;
  const rr = (w, h, r) => { const s = new THREE.Shape(); s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h); return s; };
  const border = (pad, thick, r) => { const o = rr(PW / 2 + pad, PH / 2 + pad, r), hole = rr(PW / 2 + pad - thick, PH / 2 + pad - thick, Math.max(0.01, r - thick)); o.holes.push(hole); return new THREE.ShapeGeometry(o, 10); };
  const panels = [];
  if (firstPanelCh >= 0 && NP) {
    const edgeGeo = border(0.03, 0.009, 0.08), haloGeo = border(0.07, 0.05, 0.11), screenGeo = new THREE.PlaneGeometry(PW, PH);
    PANELS.forEach((cfg, i) => {
      const group = new THREE.Group();
      const em = holo(0.9), hm = holo(0.12);
      const sm = new THREE.ShaderMaterial({
        uniforms: { map: { value: null }, uHas: { value: 0 }, uOpacity: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 }, uActive: { value: 0 }, uTint: { value: new THREE.Vector3(0.37, 0.85, 1.0) } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `
          uniform sampler2D map; uniform float uHas,uOpacity,uReveal,uTime,uActive; uniform vec3 uTint; varying vec2 vUv;
          void main(){
            vec4 t=uHas>0.5?texture2D(map,vUv):vec4(0.04,0.08,0.12,1.0);
            float lum=dot(t.rgb,vec3(.299,.587,.114));
            vec3 hc=mix(uTint*(0.18+lum*0.95),t.rgb,0.5+0.45*uActive);
            float scan=0.9+0.1*sin(vUv.y*820.0-uTime*7.0);
            float y=1.0-vUv.y, front=uReveal*1.1;
            float vis=1.0-smoothstep(front-0.07,front,y);
            float edge=smoothstep(0.04,0.0,abs(y-front+0.03))*step(uReveal,0.999);
            float flick=uReveal<0.999?0.82+0.18*sin(uTime*47.0):1.0;
            float a=t.a*uOpacity*(vis*0.93*flick+edge);
            if(a<0.004) discard;
            gl_FragColor=vec4(hc*scan+uTint*edge*1.4,a);
          }`
      });
      const screen = new THREE.Mesh(screenGeo, sm);
      const edge = new THREE.Mesh(edgeGeo, em); edge.position.z = 0.004;
      const hal = new THREE.Mesh(haloGeo, hm); hal.position.z = -0.004;
      group.add(screen, edge, hal); group.visible = false; scene.add(group);
      const img = new Image(); img.decoding = "async"; img.src = P.img + cfg.slug + (LITE ? "-640.webp" : "-1200.webp");
      img.onload = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
        const k0 = LITE ? 640 / 1200 : 1;
        const c = document.createElement("canvas"); c.width = Math.round(1200 * k0); c.height = Math.round(806 * k0); const g = c.getContext("2d"); g.scale(k0, k0);
        const rrc = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
        g.save(); rrc(0, 0, 1200, 806, 22); g.clip();
        g.fillStyle = "#08121C"; g.fillRect(0, 0, 1200, 56);
        for (let k = 0; k < 3; k++) { g.strokeStyle = "rgba(94,216,255,0.6)"; g.lineWidth = 2; g.beginPath(); g.arc(30 + k * 22, 28, 6, 0, Math.PI * 2); g.stroke(); }
        g.strokeStyle = "rgba(94,216,255,0.35)"; rrc(110, 14, 560, 28, 14); g.stroke();
        g.fillStyle = "#5ED8FF"; g.font = "500 15px 'Geist Mono', ui-monospace, monospace"; g.textBaseline = "middle"; g.fillText(cfg.path || "xendersecrets.com", 128, 29);
        g.fillStyle = "#F2B24F"; g.beginPath(); g.arc(1160, 28, 5, 0, Math.PI * 2); g.fill();
        g.drawImage(img, 0, 56, 1200, 750); g.restore();
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        if (LITE) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; } else t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        sm.uniforms.map.value = t; sm.uniforms.uHas.value = 1;
      });
      panels.push({ group, sm, em, hm, i });
    });
  }

  /* ---------- globe ---------- */
  const hasGlobe = SCENES.includes("globe");
  const globe = new THREE.Group(); globe.position.set(0, 1.95, -0.8); scene.add(globe);
  const GR = 1.08, globeMats = [], arcU = [];
  const spin = new THREE.Group(); globe.add(spin);
  if (hasGlobe) {
    const gm = m => (globeMats.push(m), m);
    const gl = [], SEG = LITE ? 36 : 72;
    for (let lat = -60; lat <= 60; lat += 30) { const r = Math.cos(lat * Math.PI / 180) * GR, y = Math.sin(lat * Math.PI / 180) * GR; for (let k = 0; k < SEG; k++) { const a1 = k / SEG * Math.PI * 2, a2 = (k + 1) / SEG * Math.PI * 2; gl.push(Math.cos(a1) * r, y, Math.sin(a1) * r, Math.cos(a2) * r, y, Math.sin(a2) * r); } }
    for (let lon = 0; lon < 180; lon += LITE ? 30 : 20) { const a = lon * Math.PI / 180; for (let k = 0; k < SEG; k++) { const b1 = k / SEG * Math.PI * 2, b2 = (k + 1) / SEG * Math.PI * 2; gl.push(Math.cos(b1) * GR * Math.cos(a), Math.sin(b1) * GR, Math.cos(b1) * GR * Math.sin(a), Math.cos(b2) * GR * Math.cos(a), Math.sin(b2) * GR, Math.cos(b2) * GR * Math.sin(a)); } }
    const ggeo = new THREE.BufferGeometry(); ggeo.setAttribute("position", new THREE.Float32BufferAttribute(gl, 3));
    spin.add(new THREE.LineSegments(ggeo, gm(lineMat(0.34))));
    const gglow = sprite(glowCyan, 3.2, 0.22); gm(gglow.material); globe.add(gglow);
    const ll = (lat, lon, r = GR) => { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
    const G = P.globe || {}, HOME = ll(...(G.home || [28.46, 77.03]));
    const CITIES = G.cities || [[51.5, -0.13], [40.71, -74.0], [43.65, -79.38], [-33.87, 151.2], [25.2, 55.27]];
    const homeDot = sprite(glowAmber, 0.34, 1); gm(homeDot.material); homeDot.position.copy(HOME); spin.add(homeDot);
    CITIES.forEach(([la, lo], j) => {
      const end = ll(la, lo); const dot = sprite(glowCyan, 0.2, 0.95); gm(dot.material); dot.position.copy(end); spin.add(dot);
      const pts = [], ts = [], a = HOME.clone().normalize(), b = end.clone().normalize(), ang = Math.max(0.05, a.angleTo(b));
      for (let k = 0; k <= 80; k++) { const t = k / 80; const v = new THREE.Vector3().copy(a).multiplyScalar(Math.sin((1 - t) * ang)).add(new THREE.Vector3().copy(b).multiplyScalar(Math.sin(t * ang))).divideScalar(Math.sin(ang)); v.multiplyScalar(GR * (1 + Math.sin(Math.PI * t) * 0.18 * ang)); pts.push(v.x, v.y, v.z); ts.push(t); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); geo.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
      const u = { uHead: { value: 0 }, uOp: { value: 0 } }; arcU.push({ u, off: j * 0.37 });
      spin.add(new THREE.Line(geo, new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: ADD,
        vertexShader: `attribute float aT; varying float vT; void main(){ vT=aT; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform float uHead,uOp; varying float vT; void main(){ float trail=smoothstep(uHead-0.4,uHead,vT)*step(vT,uHead); float a=(0.16+trail*0.9)*uOp; gl_FragColor=vec4(mix(vec3(0.37,0.85,1.0),vec3(0.95,0.7,0.31),trail*0.5)*a,1.0); }` })));
    });
    spin.userData.base = Math.PI - (G.home ? (G.home[1] - 77) * Math.PI / 180 : 0) - 0.15;
  }
  globe.visible = false;

  /* ---------- choreography ---------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lin = (a, b, x) => clamp((x - a) / (b - a));
  const ease = t => t * t * (3 - 2 * t);
  const smo = (a, b, x) => ease(lin(a, b, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
  const TAU = Math.PI * 2;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const STEP = TAU / Math.max(1, NP);
  const ringSc = NP > 6 ? 0.62 : 0.8;
  const ringR = Math.max(1.72, NP * PW * ringSc * 1.06 / TAU);
  const ringCz = -0.28 - ringR;
  const focusIdx = ci => { const f = P.chapters[ci] && P.chapters[ci].focus; const k = f ? PANELS.findIndex(p => p.slug === f) : -1; return k >= 0 ? k : NP - 1; };

  const stackP = i => ({ x: -0.45 + Math.min(i, 5) * 0.17, y: 1.3 + Math.min(i, 5) * 0.05, z: -Math.min(i, 5) * 0.3, rx: -0.07, ry: -0.42, rz: 0.02, sc: 1, op: i < 6 ? 1 : 0, rv: 0 });
  const below = i => Object.assign(stackP(i), { y: 0.1, op: 0 });
  const away = i => ({ x: (i - (NP - 1) / 2) * 1.2, y: 4.2, z: -11, rx: 0.2, ry: 0, rz: 0, sc: 0.6, op: 0, rv: 1 });
  const fan = i => { if (i >= 6) return below(i); const a = (i - 2.5) * 0.27, Rf = 2.0; return { x: Math.sin(a) * Rf, y: 1.32 + Math.cos(i * 1.7) * 0.12, z: -(1 - Math.cos(a)) * Rf * 2 - 1.6 - Math.abs(i - 2.5) * 0.12, rx: -0.03, ry: -a * 1.1, rz: 0, sc: 0.9, op: 1, rv: 1 }; };
  const ring = (i, rot) => { const a = i * STEP - rot; return { x: Math.sin(a) * ringR, y: 1.32, z: ringCz + Math.cos(a) * ringR, rx: -0.03, ry: wrap(a), rz: 0, sc: ringSc, op: 1, rv: 1 }; };
  const lerpP = (p, q, t) => { const o = {}; for (const k in p) o[k] = k === "ry" ? p.ry + wrap(q.ry - p.ry) * t : mix(p[k], q[k], t); return o; };
  const focusP = (i, f, prevRing) => i === f ? { x: 0, y: 1.42, z: 0.6, rx: -0.035, ry: 0, rz: 0, sc: 1.08, op: 1, rv: 1 } : (prevRing ? Object.assign(ring(i, (NP - 1) * STEP), { z: -5.2, sc: 0.7, op: 0 }) : below(i));
  const build = (i, u) => { const st = stackP(i); st.rv = smo(0, 0.32, u); if (u < 0.4) return st; st.rv = 1; return lerpP(st, fan(i), smo(0.4, 0.95, u)); };
  function panelAt(name, i, u, ci) {
    switch (name) {
      case "build": return build(i, u);
      case "ring": return ring(i, u * (NP - 1) * STEP);
      case "launch": case "focus": return focusP(i, focusIdx(ci), ci > 0 && SCENES[ci - 1] === "ring");
      default: return firstPanelCh >= 0 && ci > firstPanelCh ? away(i) : below(i);
    }
  }
  const CAM0 = {
    core: [[0, 1.5, 7.4], [0, 1.32, 0], [0, 1.5, 7.4], [0, 1.32, 0]],
    blueprint: [[-0.3, 1.6, 7.0], [0, 1.35, 0], [0.3, 1.7, 6.8], [0, 1.35, 0]],
    build: [[0, 1.85, 7.8], [0, 1.2, -0.5], [0.25, 1.55, 7.6], [0, 1.3, -1.4]],
    ring: [[0, 2.0, 8.6 + (ringR - 1.72) * 2.4], [0, 1.22, ringCz + 0.8], [0, 2.0, 8.6 + (ringR - 1.72) * 2.4], [0, 1.22, ringCz + 0.8]],
    launch: [[0, 1.55, 7.1], [0, 1.42, 0.45], [0.3, 1.65, 6.8], [0, 1.42, 0.45]],
    focus: [[0, 1.55, 7.1], [0, 1.42, 0.45], [0.3, 1.65, 6.8], [0, 1.42, 0.45]],
    globe: [[0, 2.1, 7.2], [0, 1.8, -0.8], [0, 2.1, 7.2], [0, 1.8, -0.8]]
  };
  function stateOf(name, u) {
    const st = { wA: 0, wB: 0, wC: 1, alpha: 0.5, grid: 1, radar: 0, globe: 0, rOp: 0.25 };
    if (name === "core") { st.wA = 1; st.wC = 0; st.alpha = 1; st.grid = 0.55; st.rOp = 1; }
    else if (name === "blueprint") { st.wB = 1; st.wC = 0; st.alpha = 1; st.rOp = 0.2; }
    else if (name === "globe") { st.globe = 1; st.alpha = 0.9; st.grid = 0.55; st.rOp = 0.6; }
    else if (name === "launch") st.radar = 1;
    const c = CAM0[name] || CAM0.core, e = smo(0, 1, u);
    st.cp = mix3(c[0], c[2], e); st.cl = mix3(c[1], c[3], e);
    return st;
  }
  const blendS = (a, b, t) => { const o = {}; for (const k in a) o[k] = Array.isArray(a[k]) ? mix3(a[k], b[k], t) : mix(a[k], b[k], t); return o; };
  function storyState(S) {
    const ci = Math.min(NCH - 1, Math.max(0, Math.floor(S))), f = S - ci;
    if (f <= 0.75 || ci === NCH - 1) { const u = clamp(f / 0.75); return { st: stateOf(SCENES[ci], u), ci, u, t: 0, panel: i => panelAt(SCENES[ci], i, u, ci) }; }
    const t = smo(0, 1, (f - 0.75) / 0.25), a = stateOf(SCENES[ci], 1), b = stateOf(SCENES[ci + 1], 0);
    const st = blendS(a, b, t); st.turb = Math.sin(Math.PI * t) * (Math.abs(a.wA - b.wA) + Math.abs(a.wB - b.wB));
    return { st, ci, u: 1, t, panel: i => lerpP(panelAt(SCENES[ci], i, 1, ci), panelAt(SCENES[ci + 1], i, 0, ci + 1), t) };
  }

  /* ---------- 2D HUD hooks ---------- */
  const retEl = document.getElementById("reticle"), brkEl = document.getElementById("brk"), brkLbl = document.getElementById("brkLbl"), sweepEl = document.getElementById("sweep");
  const v3 = new THREE.Vector3(), camRight = new THREE.Vector3();
  const toScreen = p => { v3.copy(p).project(camera); return [(v3.x * 0.5 + 0.5) * innerWidth, (-v3.y * 0.5 + 0.5) * innerHeight]; };
  const CORE_C = new THREE.Vector3(0, CY, 0), GLOBE_C = globe.position.clone(), anchor = new THREE.Vector3(), tmp = new THREE.Vector3();
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let lastLbl = "", lastBrk = "";
  function brackets(pts, op, label) {
    if (op < 0.01) { if (lastBrk !== "0") { lastBrk = "0"; brkEl.style.opacity = "0"; } return; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { const [x, y] = toScreen(p); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 -= 12; y0 -= 12; x1 += 12; y1 += 12;
    const key = op.toFixed(2) + "|" + x0.toFixed(0) + "|" + y0.toFixed(0) + "|" + (x1 - x0).toFixed(0) + "|" + (y1 - y0).toFixed(0);
    if (key !== lastBrk) { lastBrk = key; brkEl.style.opacity = op.toFixed(2); brkEl.style.transform = `translate3d(${x0.toFixed(0)}px,${y0.toFixed(0)}px,0)`; brkEl.style.width = (x1 - x0).toFixed(0) + "px"; brkEl.style.height = (y1 - y0).toFixed(0) + "px"; }
    if (label !== lastLbl) { brkLbl.textContent = label; lastLbl = label; }
  }

  let mx = 0, my = 0, px = 0, py = 0;
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  let zScale = 1, q = 1;
  const baseDpr = () => Math.min(devicePixelRatio || 1, LITE ? 1 : 1.75);
  function resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.max(0.6, baseDpr() * q);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); pu.uPx.value = dpr;
    camera.aspect = w / h;
    if (mobile()) { camera.setViewOffset(w, h, 0, h * 0.25, w, h); zScale = 1 + Math.max(0, 1.25 - w / h) * 1.45; }
    else { camera.setViewOffset(w, h, -w * 0.19, 0, w, h); zScale = w / h < 1.45 ? 1.18 : 1; }
    camera.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize);

  let sd = XS.S, last = performance.now(), running = true; const t0 = last;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(tick); } });
  const look = new THREE.Vector3();
  const setOp = (mats, k) => { for (const m of mats) m.opacity = m.userData.base * k; };
  let lastRender = 0, fAcc = 0, fN = 0, wRet = "", wRop = "", wSw = "";
  function tick(now) {
    if (!running) return;
    if (XS.covered) { last = now; requestAnimationFrame(tick); return; }
    if (LITE && now - lastRender < 31) { requestAnimationFrame(tick); return; }
    const frameMs = now - lastRender; lastRender = now;
    if (frameMs < 250) { fAcc += frameMs; fN++; if (fN >= 45) { const avg = fAcc / fN; fAcc = 0; fN = 0; if (avg > (LITE ? 45 : 26)) { if (q > 0.65) { q -= 0.2; resize(); } else if (pg.drawRange.count > N / 3) pg.setDrawRange(0, Math.floor(N / 2)); } } }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const time = (now - t0) / 1000;
    sd += (XS.S - sd) * (1 - Math.exp(-dt * 5.5));
    XS.sd = sd;
    const boot = smo(0.0, 1.6, time);
    const ss = storyState(sd), { st, ci, u, t } = ss, PS = ss.panel;

    pu.wA.value = st.wA; pu.wB.value = st.wB; pu.wC.value = clamp(1 - st.wA - st.wB);
    pu.uTurb.value = (st.turb || 0) + (1 - boot) * 1.4;
    pu.uAlpha.value = st.alpha * boot; pu.uTime.value = time;
    const scanY = B + ((time * 0.32) % 1.3) * (H + 0.35) - 0.2;
    pu.uScanY.value = scanY;
    beam.position.y = beamLine.position.y = scanY; beamMat.opacity = st.wB * 0.9; beamLine.material.opacity = st.wB * 0.9;
    beam.visible = beamLine.visible = st.wB > 0.01;

    const cw = st.wA * boot;
    core.visible = cw > 0.01; proj.visible = core.visible;
    setOp(coreMats, cw); core.scale.setScalar((0.55 + 0.45 * cw) * 0.82);
    for (const { g, cfg } of ringObjs) { g.rotation.x += cfg.s[0] * dt; g.rotation.y += cfg.s[1] * dt; g.rotation.z += cfg.s[2] * dt; }
    arcs.rotation.z += dt * 0.18; ticks.rotation.z -= dt * 0.05; crystal.rotation.x += dt * 0.3; crystal.rotation.y += dt * 0.42;
    coreHot.scale.setScalar(0.45 + Math.sin(time * 3.1) * 0.06);
    projMat.uniforms.uOp.value = cw; projMat.uniforms.uTime.value = time;
    gu.uGrid.value = st.grid * boot; gu.uLaunch.value = st.radar; gu.uCore.value = cw; gu.uTime.value = time;

    const k = XS.ringIndex ? XS.ringIndex(sd) : 0;
    for (const p of panels) {
      const s2 = PS(p.i);
      const vis = s2.op * boot > 0.01;
      p.group.visible = vis; if (!vis) continue;
      const flo = Math.sin(time * 0.8 + p.i) * 0.012;
      p.group.position.set(s2.x, s2.y + flo, s2.z); p.group.rotation.set(s2.rx, s2.ry, s2.rz); p.group.scale.setScalar(s2.sc);
      const sc = SCENES[ci];
      const active = (sc === "ring" && t === 0 && p.i === k) || ((sc === "launch" || sc === "focus") && p.i === focusIdx(ci)) ? 1 : 0;
      p.sm.uniforms.uActive.value += (active - p.sm.uniforms.uActive.value) * 0.12;
      p.sm.uniforms.uOpacity.value = s2.op * boot; p.sm.uniforms.uReveal.value = s2.rv; p.sm.uniforms.uTime.value = time;
      p.em.opacity = 0.9 * clamp(s2.op * boot * 2.2); p.hm.opacity = 0.12 * s2.op * boot;
    }

    const wG = st.globe * boot;
    globe.visible = hasGlobe && wG > 0.01;
    if (globe.visible) {
      setOp(globeMats, wG); globe.scale.setScalar(0.7 + 0.3 * wG);
      spin.rotation.y = spin.userData.base + Math.sin(time * 0.18) * 0.55;
      for (const a of arcU) { a.u.uOp.value = wG; a.u.uHead.value = ((time * 0.35 + a.off) % 1.6); }
    }

    px += (mx - px) * (1 - Math.exp(-dt * 3)); py += (my - py) * (1 - Math.exp(-dt * 3));
    camera.position.set(st.cp[0] + px * 0.5, st.cp[1] - py * 0.28, st.cp[2] * zScale);
    look.set(st.cl[0], st.cl[1], st.cl[2]); camera.lookAt(look); camera.updateMatrixWorld();

    /* reticle */
    anchor.copy(CORE_C).lerp(GLOBE_C, st.globe);
    const r3 = mix(1.6, 1.3, st.globe);
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const [ax, ay] = toScreen(anchor), [bx, by] = toScreen(tmp.copy(anchor).addScaledVector(camRight, r3));
    const sc = Math.hypot(bx - ax, by - ay) / 400;
    const rt = `translate3d(${(ax - 500 * sc).toFixed(0)}px,${(ay - 500 * sc).toFixed(0)}px,0) scale(${sc.toFixed(3)})`;
    if (rt !== wRet) { wRet = rt; retEl.style.transform = rt; }
    const ro = (st.rOp * boot).toFixed(2); if (ro !== wRop) { wRop = ro; retEl.style.opacity = ro; }
    const sw = Math.min(1, st.wA + st.globe).toFixed(2); if (sw !== wSw) { wSw = sw; sweepEl.style.opacity = sw; }

    /* brackets */
    const name = SCENES[ci], bop = t > 0 ? 0 : smo(0, 0.08, u) * (1 - smo(0.94, 1, u)) * boot;
    if (name === "blueprint") {
      corners[0].set(L, B, 0); corners[1].set(Rr, B, 0); corners[2].set(L, T, 0); corners[3].set(Rr, T, 0);
      brackets(corners, bop, P.chapters[ci].bracket || "Scope · draft 01");
    } else if ((name === "ring" || name === "launch" || name === "focus") && panels.length) {
      const idx = name === "ring" ? k : focusIdx(ci), pn = panels[idx], cfg = PANELS[idx];
      const hw = PW / 2 + 0.03, hh = PH / 2 + 0.03;
      corners[0].set(-hw, -hh, 0); corners[1].set(hw, -hh, 0); corners[2].set(-hw, hh, 0); corners[3].set(hw, hh, 0);
      pn.group.updateMatrixWorld(); for (const p of corners) p.applyMatrix4(pn.group.matrixWorld);
      const lbl = name === "ring" ? "Target · " + cfg.name + " · " + cfg.badge : name === "launch" ? "Deploy · " + cfg.name : (P.chapters[ci].bracket || "Sample · " + cfg.name);
      brackets(corners, bop, lbl);
    } else brackets(corners, 0, "");

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  XS.ready = true;
  requestAnimationFrame(tick);
}
