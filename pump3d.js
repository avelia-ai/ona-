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
  const PUMP2 = canvas.dataset.model === 'pump2';           // flacon pompe 30 ml blanc (sérum alternatif au rétinol)
  const AIRLESS = canvas.dataset.model === 'airless' || PUMP2;     // flacon airless 15 ml (crème contour des yeux)
  const BODY_H = canvas.dataset.bodyH ? +canvas.dataset.bodyH : (AIRLESS ? 3.68 : 3.236), BASE_H = 0.318;
  const SPOUT = canvas.dataset.spout !== '0';
  const GLOSS = +canvas.dataset.gloss || 1, AO = +canvas.dataset.ao || 0;     // brillance et occlusion (1 / 0 = rendu historique)            // bec rectangulaire (contour des yeux) ou tête inclinée percée (crème 50 ml)
  // airless : épaulement arrondi -> bague -> poussoir (mesures prises sur la photo, rayon du corps = 1)
  const SH_H = 0.26, COL_R = 0.667, COL_H = 0.253;
  // airless (photo studio, rayon du corps = 1) : bague striée 0.06, col 0.30 (r 0.648), poussoir r 0.56 haut de 0.58 à 0.88
  const NECK_R = 0.648, NECK_Y0 = BODY_H + 0.06, NECK_Y1 = BODY_H + 0.36;
  const COLLAR_Y0 = BODY_H, COLLAR_Y1 = AIRLESS ? NECK_Y1 : 4.509, COLLAR_R0 = 0.647, COLLAR_R1 = 0.570;
  const ACT_R = AIRLESS ? 0.56 : 0.50;
  const TOP_H = PUMP2 ? 2.5 : 1.2;
  const CENTER_Y = canvas.dataset.bodyH ? (BODY_H + TOP_H)/2 : 2.5;

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
  const tCollar = AIRLESS ? null : tex(P+'-collar.jpg'+V);
  const tBase = AIRLESS ? null : tex(P+'-base.png'+V);
  if(AIRLESS) pending -= 2;

  const vert = `
    varying vec3 vN; varying vec2 vUv; varying float vY;
    void main(){
      vN = normalize(normalMatrix * normal);
      vUv = uv; vY = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;
  // Body: albedo (rotates) x studio light profile (fixed) + soft glass highlights
  const bodyMat = new THREE.ShaderMaterial({
    uniforms:{ map:{value:tBody}, shade:{value:tShade}, mask:{value:tMask}, neutral:{value: AIRLESS ? 1.0 : 0.0}, gloss:{value:GLOSS}, ao:{value:AO}, bodyH:{value:BODY_H} },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D map, shade, mask; uniform float neutral, gloss, ao, bodyH; varying vec3 vN; varying vec2 vUv; varying float vY;
      void main(){
        vec3 n = normalize(vN);
        float nx = clamp(n.x, -0.995, 0.995);
        vec3 alb = texture2D(map, vUv).rgb;
        float lab = texture2D(mask, vUv).r;                 // 1 on the printed label
        vec3 sh = texture2D(shade, vec2(nx*0.5+0.5, 0.875)).rgb * 2.0;
        // the serum glass picks up warm falloff; the paper label shades neutrally
        float lum = dot(sh, vec3(0.3333));
        sh = mix(sh, vec3(lum), max(lab, neutral));   // plastique blanc : éclairage neutre
        vec3 c = alb * sh;
        // glass gloss: thin vertical streaks fixed to the light rig (satin on the label film)
        float s = 0.11*exp(-pow((nx-0.58)/0.035,2.0)) + 0.05*exp(-pow((nx-0.70)/0.09,2.0)) + 0.035*exp(-pow((nx+0.80)/0.03,2.0));
        s *= mix(1.0, 0.35, lab) * gloss;
        float fres = pow(1.0 - abs(n.z), 3.0);
        c = c + s - fres*0.06;
        // occlusion douce au pied et sous l'épaule (rendu « studio »)
        c *= 1.0 - ao*(0.22*exp(-vY*7.0) + 0.14*exp(-(bodyH - vY)*10.0));
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
    uniforms:{ shade:{value:tShade}, y0:{value:COLLAR_Y1}, gloss:{value:GLOSS} },
    vertexShader: vert,
    fragmentShader: `
      uniform sampler2D shade; uniform float y0, gloss; varying vec3 vN; varying float vY;
      void main(){
        vec3 n = normalize(vN);
        vec2 h = normalize(vec2(n.x, max(n.z, 0.0)) + 1e-4);
        vec3 sh = texture2D(shade, vec2(clamp(h.x,-0.99,0.99)*0.5+0.5, 0.625)).rgb * 2.0;
        vec3 c = vec3(0.985) * sh;
        c = mix(c, vec3(0.99), clamp(n.y, 0.0, 1.0)*0.6);       // top faces catch the softbox
        c *= 1.0 - 0.10*exp(-max(vY - y0, 0.0)*28.0);                    // contact shadow on the collar
        c += 0.06*gloss*exp(-pow((n.x-0.45)/0.08,2.0))*(1.0-abs(n.y)); // satin highlight
        c += 0.05*(gloss-1.0)*exp(-pow((n.x+0.42)/0.05,2.0))*(1.0-abs(n.y));      // 2e bande du softbox
        gl_FragColor = vec4(clamp(c,0.0,1.0),1.0);
      }`
  });

  // Weightless pose: the bottle spins on its own axis inside a tilted, slowly drifting pivot
  const pivot = new THREE.Group();
  pivot.position.y = CENTER_Y;
  scene.add(pivot);
  const UPRIGHT = canvas.dataset.tilt === '0';
  const TILT_Z = UPRIGHT ? 0 : -0.30, TILT_X = UPRIGHT ? 0.06 : 0.16;              // ~17° sideways, top leaning toward the viewer
  pivot.rotation.set(TILT_X, 0, TILT_Z);
  const bottle = new THREE.Group();
  bottle.position.y = -CENTER_Y;
  pivot.add(bottle);
  const SEG = 160;

  // Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, BODY_H, SEG, 1, true, Math.PI).translate(0, BODY_H/2, 0), bodyMat);
  bottle.add(body);
  if(PUMP2){
    // pompe 30 ml : fond arrondi, épaulement + bague, corps de pompe, poussoir à bec latéral (mesures sur photo, rayon du corps = 1)
    const lathe = (pts)=> new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,y])=> new THREE.Vector2(r, y)), SEG), whiteMat);
    const Y = BODY_H;
    bottle.add(lathe([[0.001,-0.07],[0.86,-0.07],[0.94,-0.06],[0.98,-0.04],[0.997,-0.015],[1,0]]));
    bottle.add(lathe([[1,Y-0.03],[0.995,Y-0.008],[0.975,Y],[0.90,Y],[0.89,Y+0.012],[0.885,Y+0.035],[0.885,Y+0.19],[0.872,Y+0.222],[0.845,Y+0.235],[0.735,Y+0.235],[0.722,Y+0.245]]));
    bottle.add(lathe([[0.722,Y+0.245],[0.722,Y+1.465],[0.712,Y+1.488],[0.692,Y+1.5],[0.535,Y+1.5],[0.518,Y+1.512]]));
    bottle.add(lathe([[0.518,Y+1.512],[0.518,Y+2.43],[0.512,Y+2.472],[0.492,Y+2.496],[0.46,Y+2.5],[0.001,Y+2.5]]));
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 32), whiteMat);
    noz.rotation.z = Math.PI/2; noz.position.set(-0.62, Y + 2.36, 0); bottle.add(noz);
    const tip = new THREE.Mesh(new THREE.CircleGeometry(0.04, 24), new THREE.MeshBasicMaterial({color:0x8a8380}));
    tip.rotation.y = -Math.PI/2; tip.position.set(-0.752, Y + 2.36, 0); bottle.add(tip);
  } else if(AIRLESS){
    // fond arrondi, épaulement, bague : plastique blanc
    const lathe = (pts)=> new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,y])=> new THREE.Vector2(r, y)), SEG), whiteMat);
    bottle.add(lathe([[0.001,-0.07],[0.86,-0.07],[0.94,-0.06],[0.98,-0.04],[0.997,-0.015],[1,0]]));
    const Y = BODY_H;
    // bord du corps arrondi, plateau, bague à deux stries, plateau intérieur
    bottle.add(lathe([[1,Y-0.035],[0.997,Y-0.012],[0.988,Y-0.002],[0.972,Y],[0.925,Y],[0.921,Y+0.018],[0.916,Y+0.045],[0.906,Y+0.058],
      [0.893,Y+0.06],[0.889,Y+0.052],[0.884,Y+0.052],[0.880,Y+0.06],[0.866,Y+0.06],[0.862,Y+0.052],[0.857,Y+0.052],[0.853,Y+0.06],
      [0.835,Y+0.062],[0.80,Y+0.06],[0.70,Y+0.06],[NECK_R+0.01,Y+0.06],[NECK_R,Y+0.064]]));
    // col du poussoir, arête supérieure adoucie, plateau jusqu'au poussoir
    bottle.add(lathe([[NECK_R,NECK_Y0],[NECK_R,NECK_Y1-0.03],[NECK_R-0.006,NECK_Y1-0.008],[NECK_R-0.022,NECK_Y1],[ACT_R+0.012,NECK_Y1],[ACT_R,NECK_Y1+0.004]]));
  } else {
  // Thick clear glass base (photo strip)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, BASE_H, SEG, 1, true).translate(0, -BASE_H/2, 0), stripMat(tBase, -BASE_H, 0, true));
  bottle.add(base);
  // Collar (photo strip, slight taper as on the product)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(COLLAR_R1, COLLAR_R0, COLLAR_Y1-COLLAR_Y0, SEG, 1, true).translate(0, (COLLAR_Y0+COLLAR_Y1)/2, 0), stripMat(tCollar, COLLAR_Y0, COLLAR_Y1));
  bottle.add(collar);
  const ring = new THREE.Mesh(new THREE.RingGeometry(ACT_R-0.02, COLLAR_R1, SEG), whiteMat);
  ring.rotation.x = -Math.PI/2; ring.position.y = COLLAR_Y1; bottle.add(ring);
  }

  if(!PUMP2){
  // Actuator: lathe with rounded top, then sculpted — slanted head leaning toward the nozzle
  const NOZ = (AIRLESS ? -90 : -51)*Math.PI/180;                       // nozzle direction measured on the photo
  const dn = new THREE.Vector2(Math.sin(NOZ), Math.cos(NOZ));   // (x, z)
  const pts = [];
  const R = ACT_R, F = AIRLESS ? 0.09 : 0.13;
  pts.push(new THREE.Vector2(R, 0));
  for(let i=0;i<=12;i++){ const a = i/12*Math.PI/2; pts.push(new THREE.Vector2(R - F + F*Math.cos(a), 1 - F + F*Math.sin(a))); }
  pts.push(new THREE.Vector2(0.001, 1));
  const actGeo = new THREE.LatheGeometry(pts, SEG);
  const p = actGeo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const proj = (x*dn.x + z*dn.y)/R;                 // -1 .. 1 toward the nozzle
    const top = AIRLESS ? 0.73 + 0.15*proj : 0.735 + 0.095*proj;                   // head height (0.64 back, 0.83 nozzle side)
    const t = y;                                      // 0 bottom .. 1 top
    const ny = t*top;
    const lean = (AIRLESS ? 0.0 : 0.085)*Math.pow(t, 2.6);
    p.setXYZ(i, x + dn.x*lean, COLLAR_Y1 + ny, z + dn.y*lean);
  }
  actGeo.computeVertexNormals();
  bottle.add(new THREE.Mesh(actGeo, whiteMat));

  if(AIRLESS && SPOUT){
    // bec rectangulaire au point haut, face de sortie légèrement grisée (photo)
    const ang = Math.atan2(dn.x, dn.y), topY = COLLAR_Y1 + 0.88;
    const spout = new THREE.Group(); spout.rotation.y = ang; bottle.add(spout);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.19), whiteMat);
    box.position.set(0, topY - 0.068, R - 0.045); spout.add(box);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.096, 0.094),
      new THREE.MeshBasicMaterial({color:0xddd7d0, polygonOffset:true, polygonOffsetFactor:-4}));
    face.position.set(0, topY - 0.068, R - 0.045 + 0.0951); spout.add(face);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.026),
      new THREE.MeshBasicMaterial({color:0xb9b1a9, polygonOffset:true, polygonOffsetFactor:-6}));
    slot.position.set(0, topY - 0.07, R - 0.045 + 0.0953); spout.add(slot);
  }
  // Nozzle orifice
  const hc = document.createElement('canvas'); hc.width = hc.height = 64;
  const hg = hc.getContext('2d'); const rg = hg.createRadialGradient(32,30,2,32,32,30);
  rg.addColorStop(0,'rgba(95,80,78,1)'); rg.addColorStop(.55,'rgba(130,118,116,.95)'); rg.addColorStop(.8,'rgba(200,196,196,.5)'); rg.addColorStop(1,'rgba(255,255,255,0)');
  hg.fillStyle = rg; hg.fillRect(0,0,64,64);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.055, 32),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(hc), transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4}));
  const HH = AIRLESS ? 0.72 : 0.66, lean = (AIRLESS ? 0.05 : 0.085)*Math.pow(HH/0.83, 2.6);
  const hp = new THREE.Vector3(dn.x*(R+lean+0.002), COLLAR_Y1 + HH, dn.y*(R+lean+0.002));
  hole.position.copy(hp);
  hole.lookAt(hp.clone().add(new THREE.Vector3(dn.x, 0.18, dn.y)));
  hole.scale.set(1, 1.15, 1);
  if(!AIRLESS || !SPOUT) bottle.add(hole);
  }

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
    const needH = canvas.dataset.bodyH ? (BODY_H + TOP_H + 0.1)*1.32 : 7.4, needW = UPRIGHT ? 4.2 : 4.3;
    const vH = Math.max(needH, needW / camera.aspect);
    camera.fov = 2*Math.atan(vH/2/DIST)*180/Math.PI;
    camera.updateProjectionMatrix();
    render();
  }
  window.addEventListener('resize', resize);

  // Turntable: slow premium spin, drag to rotate with inertia
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO = reduce ? 0 : (Math.PI*2)/((+canvas.dataset.turn || 14)*60);    // one turn every ~14 s at 60 fps
  let vel = AUTO, dragging = false, lastX = 0, kick = 0;
  // vitrine : au lieu de tourner en continu, le flacon montre sa face avant en se balançant (data-sway = amplitude en radians)
  const SWAY = canvas.dataset.sway != null ? +canvas.dataset.sway : null, START = +canvas.dataset.start || 0;
  const PERIOD = +canvas.dataset.turn || 14; let base = START;
  const story = canvas.closest('.ritual3d');
  if(story) story.addEventListener('r3beat', ()=>{ kick += Math.PI*2/6; });
  wrap.addEventListener('pointerdown', e=>{ dragging = true; lastX = e.clientX; try{wrap.setPointerCapture(e.pointerId);}catch(_){} });
  wrap.addEventListener('pointermove', e=>{ if(!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; const d = dx*0.011; if(SWAY !== null) base += d; else { bottle.rotation.y += d; vel = d; } });
  const end = ()=>{ dragging = false; };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);

  let visible = false, last = performance.now(), t = 0;
  function render(){ renderer.render(scene, camera); }
  function loop(now){
    if(!visible) return;
    const dt = Math.min(3, (now - last)/16.667); last = now; t += dt/60;
    if(SWAY !== null){
      if(kick){ const k = kick*Math.min(1, 0.05*dt); base += k; kick -= k; if(Math.abs(kick) < 1e-4) kick = 0; }
      if(!dragging && !kick){ const front = START + Math.PI*2*Math.round((base - START)/(Math.PI*2)); base += (front - base)*0.03*dt; }
      bottle.rotation.y = base + (reduce ? 0 : SWAY*Math.sin(t*Math.PI*2/PERIOD));
    } else {
    if(!dragging){ vel += (AUTO - vel)*0.025*dt; bottle.rotation.y += vel*dt; }
    }
    if(kick && SWAY === null){ const k = kick*Math.min(1, 0.045*dt); bottle.rotation.y += k; kick -= k; if(Math.abs(kick) < 1e-4) kick = 0; }
    const bob = reduce ? 0 : Math.sin(t*0.9)*0.10;
    pivot.position.y = CENTER_Y + bob;
    if(!reduce){
      const sway = UPRIGHT ? 0.4 : 1;
      pivot.rotation.z = TILT_Z + Math.sin(t*0.55)*0.045*sway;
      pivot.rotation.x = TILT_X + Math.sin(t*0.41 + 1.3)*0.035*sway;
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
  bottle.rotation.y = +canvas.dataset.start || 0;
  wrap.setRotation = a => { bottle.rotation.y = a; vel = 0; render(); };
  wrap.spin = (turns = 1) => { kick += Math.PI*2*turns; };
  canvas.style.opacity = 0; canvas.style.transition = 'opacity .6s';
  resize();
}
  function boot(){ document.querySelectorAll('#serum3d, canvas[data-engine="pump"]').forEach(initPump3D); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
