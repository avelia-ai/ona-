/* Onaé — flacon pompe en 3D à partir de photos studio (sérums 30 ml).
   Utilisé par la page d'accueil (#serum3d) et les pages rituel (canvas[data-engine="pump"]).
   Textures : <data-tex>-body.jpg, -collar.jpg, -base.png ; masque et éclairage partagés (serum3d). */
(function(){
function initPump3D(canvas){
  if(!canvas) return;
  const wrap = canvas.parentElement;
  const fallback = wrap.querySelector('.motion-fallback, .r3-fallback');
  const fail = ()=>{ canvas.hidden = true; if(fallback) fallback.hidden = false; };
  const P = canvas.dataset.tex || 'serum3d', MASK = canvas.dataset.mask || 'serum3d', SHADE = canvas.dataset.shade || 'serum3d', V = '?v=' + (canvas.dataset.v || '4');
  if(!window.THREE) return fail();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, premultipliedAlpha:false}); }
  catch(e){ return fail(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  // Units: body radius = 1 (188.5 px on the photo). y = 0 at the top of the glass base.
  const BODY_H = 3.236, BASE_H = 0.318;
  const COLLAR_Y0 = BODY_H, COLLAR_Y1 = 4.509, COLLAR_R0 = 0.647, COLLAR_R1 = 0.570;
  const ACT_R = 0.50;
  const CENTER_Y = 2.5;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(9, 1, 1, 200);
  const DIST = 44;
  camera.position.set(0, CENTER_Y, DIST);
  camera.lookAt(0, CENTER_Y, 0);

  const loader = new THREE.TextureLoader();
  let pending = 5;
  const ready = ()=>{ if(--pending === 0){ render(); canvas.style.opacity = 1; } };
  const tex = (src, repeat)=>{ const t = loader.load(src, ready, undefined, fail);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if(repeat) t.wrapS = THREE.RepeatWrapping; return t; };
  const tBody = tex(P+'-body.jpg'+V, true);
  const tMask = tex(MASK+'-mask.png'+V, true);
  const tShade = tex(SHADE+'-shade.png'+V); tShade.minFilter = tShade.magFilter = THREE.LinearFilter; tShade.generateMipmaps = false;
  const tCollar = tex(P+'-collar.jpg'+V);
  const tBase = tex(P+'-base.png'+V);

  const vert = `
    varying vec3 vN; varying vec2 vUv; varying float vY;
    void main(){
      vN = normalize(normalMatrix * normal);
      vUv = uv; vY = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;
  // Body: albedo (rotates) x studio light profile (fixed) + soft glass highlights
  const bodyMat = new THREE.ShaderMaterial({
    uniforms:{ map:{value:tBody}, shade:{value:tShade}, mask:{value:tMask} },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D map, shade, mask; varying vec3 vN; varying vec2 vUv;
      void main(){
        vec3 n = normalize(vN);
        float nx = clamp(n.x, -0.995, 0.995);
        vec3 alb = texture2D(map, vUv).rgb;
        float lab = texture2D(mask, vUv).r;                 // 1 on the printed label
        vec3 sh = texture2D(shade, vec2(nx*0.5+0.5, 0.875)).rgb * 2.0;
        // the serum glass picks up warm falloff; the paper label shades neutrally
        float lum = dot(sh, vec3(0.3333));
        sh = mix(sh, vec3(lum), lab);
        vec3 c = alb * sh;
        // glass gloss: thin vertical streaks fixed to the light rig (satin on the label film)
        float s = 0.11*exp(-pow((nx-0.58)/0.035,2.0)) + 0.05*exp(-pow((nx-0.70)/0.09,2.0)) + 0.035*exp(-pow((nx+0.80)/0.03,2.0));
        s *= mix(1.0, 0.35, lab);
        float fres = pow(1.0 - abs(n.z), 3.0);
        c = c + s - fres*0.06;
        gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0);
      }`
  });
  // Rotationally symmetric parts: the photo itself, looked up by view-space normal
  const stripMat = (map, y0, y1, transparent)=> new THREE.ShaderMaterial({
    uniforms:{ map:{value:map}, y0:{value:y0}, y1:{value:y1} },
    vertexShader: vert, transparent: !!transparent,
    fragmentShader: `
      uniform sampler2D map; uniform float y0, y1; varying vec3 vN; varying float vY;
      void main(){
        vec3 n = normalize(vN);
        float u = clamp(n.x/0.985, -1.0, 1.0)*0.5+0.5;
        float v = clamp((vY - y0)/(y1 - y0), 0.0, 1.0);
        vec4 c = texture2D(map, vec2(u, v));
        if(c.a < 0.02) discard;
        gl_FragColor = c;
      }`
  });
  // White plastic actuator: studio profile of the collar, slightly brighter on top faces
  const whiteMat = new THREE.ShaderMaterial({
    uniforms:{ shade:{value:tShade}, y0:{value:COLLAR_Y1} },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D shade; uniform float y0; varying vec3 vN; varying float vY;
      void main(){
        vec3 n = normalize(vN);
        vec2 h = normalize(vec2(n.x, max(n.z, 0.0)) + 1e-4);
        vec3 sh = texture2D(shade, vec2(clamp(h.x,-0.99,0.99)*0.5+0.5, 0.625)).rgb * 2.0;
        vec3 c = vec3(0.985) * sh;
        c = mix(c, vec3(0.99), clamp(n.y, 0.0, 1.0)*0.6);       // top faces catch the softbox
        c *= 1.0 - 0.10*exp(-(vY - y0)*28.0);                    // contact shadow on the collar
        c += 0.06*exp(-pow((n.x-0.45)/0.08,2.0))*(1.0-abs(n.y)); // satin highlight
        gl_FragColor = vec4(clamp(c,0.0,1.0),1.0);
      }`
  });

  // Weightless pose: the bottle spins on its own axis inside a tilted, slowly drifting pivot
  const pivot = new THREE.Group();
  pivot.position.y = CENTER_Y;
  scene.add(pivot);
  const TILT_Z = -0.30, TILT_X = 0.16;              // ~17° sideways, top leaning toward the viewer
  pivot.rotation.set(TILT_X, 0, TILT_Z);
  const bottle = new THREE.Group();
  bottle.position.y = -CENTER_Y;
  pivot.add(bottle);
  const SEG = 160;

  // Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, BODY_H, SEG, 1, true, Math.PI).translate(0, BODY_H/2, 0), bodyMat);
  bottle.add(body);
  // Thick clear glass base (photo strip)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, BASE_H, SEG, 1, true).translate(0, -BASE_H/2, 0), stripMat(tBase, -BASE_H, 0, true));
  bottle.add(base);
  // Collar (photo strip, slight taper as on the product)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(COLLAR_R1, COLLAR_R0, COLLAR_Y1-COLLAR_Y0, SEG, 1, true).translate(0, (COLLAR_Y0+COLLAR_Y1)/2, 0), stripMat(tCollar, COLLAR_Y0, COLLAR_Y1));
  bottle.add(collar);
  const ring = new THREE.Mesh(new THREE.RingGeometry(ACT_R-0.02, COLLAR_R1, SEG), whiteMat);
  ring.rotation.x = -Math.PI/2; ring.position.y = COLLAR_Y1; bottle.add(ring);

  // Actuator: lathe with rounded top, then sculpted — slanted head leaning toward the nozzle
  const NOZ = -51*Math.PI/180;                       // nozzle direction measured on the photo
  const dn = new THREE.Vector2(Math.sin(NOZ), Math.cos(NOZ));   // (x, z)
  const pts = [];
  const R = ACT_R, F = 0.13;
  pts.push(new THREE.Vector2(R, 0));
  for(let i=0;i<=12;i++){ const a = i/12*Math.PI/2; pts.push(new THREE.Vector2(R - F + F*Math.cos(a), 1 - F + F*Math.sin(a))); }
  pts.push(new THREE.Vector2(0.001, 1));
  const actGeo = new THREE.LatheGeometry(pts, SEG);
  const p = actGeo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const proj = (x*dn.x + z*dn.y)/R;                 // -1 .. 1 toward the nozzle
    const top = 0.735 + 0.095*proj;                   // head height (0.64 back, 0.83 nozzle side)
    const t = y;                                      // 0 bottom .. 1 top
    const ny = t*top;
    const lean = 0.085*Math.pow(t, 2.6);
    p.setXYZ(i, x + dn.x*lean, COLLAR_Y1 + ny, z + dn.y*lean);
  }
  actGeo.computeVertexNormals();
  bottle.add(new THREE.Mesh(actGeo, whiteMat));

  // Nozzle orifice
  const hc = document.createElement('canvas'); hc.width = hc.height = 64;
  const hg = hc.getContext('2d'); const rg = hg.createRadialGradient(32,30,2,32,32,30);
  rg.addColorStop(0,'rgba(95,80,78,1)'); rg.addColorStop(.55,'rgba(130,118,116,.95)'); rg.addColorStop(.8,'rgba(200,196,196,.5)'); rg.addColorStop(1,'rgba(255,255,255,0)');
  hg.fillStyle = rg; hg.fillRect(0,0,64,64);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.055, 32),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(hc), transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4}));
  const lean = 0.085*Math.pow(0.66/0.83, 2.6);
  const hp = new THREE.Vector3(dn.x*(R+lean+0.002), COLLAR_Y1 + 0.66, dn.y*(R+lean+0.002));
  hole.position.copy(hp);
  hole.lookAt(hp.clone().add(new THREE.Vector3(dn.x, 0.18, dn.y)));
  hole.scale.set(1, 1.15, 1);
  bottle.add(hole);

  // Soft contact shadow on the "table"
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64;
  const sg = sc.getContext('2d'); const gr = sg.createRadialGradient(128,32,4,128,32,128);
  gr.addColorStop(0,'rgba(110,60,60,.45)'); gr.addColorStop(.35,'rgba(110,60,60,.18)'); gr.addColorStop(1,'rgba(110,60,60,0)');
  sg.setTransform(1,0,0,.25,0,24); sg.fillStyle = gr; sg.fillRect(0,-200,256,600);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc), transparent:true, depthWrite:false}));
  shadow.position.set(0.3, -0.5, -0.6);
  shadow.scale.set(1.1, 0.6, 1);
  scene.add(shadow);

  function resize(){
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    // fit bottle height (~5.9 units incl. margins) or width if the box is narrow
    const needH = 7.4, needW = 4.3;
    const vH = Math.max(needH, needW / camera.aspect);
    camera.fov = 2*Math.atan(vH/2/DIST)*180/Math.PI;
    camera.updateProjectionMatrix();
    render();
  }
  window.addEventListener('resize', resize);

  // Turntable: slow premium spin, drag to rotate with inertia
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO = reduce ? 0 : (Math.PI*2)/(14*60);    // one turn every ~14 s at 60 fps
  let vel = AUTO, dragging = false, lastX = 0, kick = 0;
  const story = canvas.closest('.ritual3d');
  if(story) story.addEventListener('r3beat', ()=>{ kick += Math.PI*2/6; });
  wrap.addEventListener('pointerdown', e=>{ dragging = true; lastX = e.clientX; try{wrap.setPointerCapture(e.pointerId);}catch(_){} });
  wrap.addEventListener('pointermove', e=>{ if(!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; const d = dx*0.011; bottle.rotation.y += d; vel = d; });
  const end = ()=>{ dragging = false; };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);

  let visible = false, last = performance.now(), t = 0;
  function render(){ renderer.render(scene, camera); }
  function loop(now){
    if(!visible) return;
    const dt = Math.min(3, (now - last)/16.667); last = now; t += dt/60;
    if(!dragging){ vel += (AUTO - vel)*0.025*dt; bottle.rotation.y += vel*dt; }
    if(kick){ const k = kick*Math.min(1, 0.045*dt); bottle.rotation.y += k; kick -= k; if(Math.abs(kick) < 1e-4) kick = 0; }
    const bob = reduce ? 0 : Math.sin(t*0.9)*0.10;
    pivot.position.y = CENTER_Y + bob;
    if(!reduce){
      pivot.rotation.z = TILT_Z + Math.sin(t*0.55)*0.045;
      pivot.rotation.x = TILT_X + Math.sin(t*0.41 + 1.3)*0.035;
    }
    shadow.material.opacity = 0.55 - bob*1.5;
    shadow.scale.set(1.1 - bob*0.6, 0.6 - bob*0.3, 1);
    render();
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es=>{
    const was = visible; visible = es[0].isIntersecting;
    if(visible && !was){ last = performance.now(); requestAnimationFrame(loop); }
  }, {threshold:0.05}).observe(wrap);
  bottle.rotation.y = 0;
  wrap.setRotation = a => { bottle.rotation.y = a; vel = 0; render(); };
  canvas.style.opacity = 0; canvas.style.transition = 'opacity .6s';
  resize();
}
  function boot(){ document.querySelectorAll('#serum3d, canvas[data-engine="pump"]').forEach(initPump3D); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
