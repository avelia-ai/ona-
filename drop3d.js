/* Onaé — o·care dropper serum, photo-based 3D turntable + scroll storytelling.
   Glass, serum and dropper are rotationally symmetric: they are drawn straight from the
   studio photo (view-fixed, like a real turntable shoot). Only the printed label spins. */
(function(){
  const GEO = {"pts":[[0.0,5.6693],[0.0785,5.6587],[0.1448,5.648],[0.1825,5.6373],[0.1988,5.6267],[0.2103,5.616],[0.2222,5.6053],[0.2327,5.5947],[0.2437,5.584],[0.2538,5.5733],[0.2612,5.5627],[0.2677,5.552],[0.2746,5.5413],[0.2814,5.5307],[0.2869,5.52],[0.292,5.5093],[0.2972,5.4987],[0.3019,5.488],[0.3054,5.4773],[0.3076,5.4667],[0.3104,5.456],[0.3143,5.4453],[0.3172,5.4347],[0.3191,5.424],[0.3209,5.4133],[0.3224,5.4027],[0.3236,5.392],[0.3253,5.3813],[0.327,5.3707],[0.3279,5.36],[0.328,5.3493],[0.328,5.3387],[0.328,5.328],[0.328,5.3173],[0.328,5.3067],[0.328,5.296],[0.328,5.2853],[0.328,5.2747],[0.328,5.264],[0.328,5.2533],[0.328,5.2427],[0.328,5.232],[0.328,5.2213],[0.328,5.2107],[0.328,5.2],[0.328,5.1893],[0.328,5.1787],[0.328,5.168],[0.328,5.1573],[0.328,5.1467],[0.328,5.136],[0.328,5.1253],[0.328,5.1147],[0.3281,5.104],[0.3294,5.0933],[0.3319,5.0827],[0.3332,5.072],[0.3333,5.0613],[0.3333,5.0507],[0.3333,5.04],[0.3333,5.0293],[0.3333,5.0187],[0.3334,5.008],[0.3337,4.9973],[0.335,4.9867],[0.336,4.976],[0.337,4.9653],[0.3385,4.9547],[0.3406,4.944],[0.3432,4.9333],[0.344,4.9227],[0.344,4.912],[0.3444,4.9013],[0.3457,4.8907],[0.347,4.88],[0.3492,4.8693],[0.3526,4.8587],[0.3547,4.848],[0.3566,4.8373],[0.3592,4.8267],[0.3604,4.816],[0.3617,4.8053],[0.3631,4.7947],[0.3658,4.784],[0.37,4.7733],[0.3739,4.7627],[0.3763,4.752],[0.3788,4.7413],[0.3822,4.7307],[0.3855,4.72],[0.3886,4.7093],[0.3923,4.6987],[0.3957,4.688],[0.3996,4.6773],[0.4025,4.6667],[0.4057,4.656],[0.4108,4.6453],[0.4148,4.6347],[0.4184,4.624],[0.4237,4.6133],[0.4336,4.6027],[0.4439,4.5973],[0.4559,4.592],[0.5082,4.5867],[0.5313,4.5813],[0.5667,4.576],[0.6042,4.5707],[0.6449,4.56],[0.6505,4.5493],[0.6507,4.5387],[0.6507,4.528],[0.6507,4.5173],[0.6507,4.5067],[0.6507,4.496],[0.6507,4.4853],[0.6507,4.4747],[0.6507,4.464],[0.6507,4.4533],[0.6507,4.4427],[0.6507,4.432],[0.6507,4.4213],[0.6507,4.4107],[0.6507,4.4],[0.6507,4.3893],[0.6507,4.3787],[0.6507,4.368],[0.6507,4.3573],[0.6507,4.3467],[0.6507,4.336],[0.6507,4.3253],[0.6507,4.3147],[0.6507,4.304],[0.6505,4.2933],[0.6497,4.2827],[0.6484,4.272],[0.648,4.2613],[0.648,4.2507],[0.648,4.24],[0.648,4.2293],[0.648,4.2187],[0.6484,4.208],[0.6497,4.1973],[0.6505,4.1867],[0.6507,4.176],[0.6507,4.1653],[0.6507,4.1547],[0.6507,4.144],[0.6507,4.1333],[0.6505,4.1227],[0.6497,4.112],[0.6484,4.1013],[0.648,4.0907],[0.6481,4.08],[0.649,4.0693],[0.6503,4.0587],[0.6506,4.048],[0.6504,4.0373],[0.6487,4.0267],[0.6462,4.016],[0.6454,4.0053],[0.6455,3.9947],[0.6463,3.984],[0.6476,3.9733],[0.648,3.9627],[0.648,3.952],[0.648,3.9413],[0.648,3.9307],[0.648,3.92],[0.6479,3.9093],[0.647,3.8987],[0.6457,3.888],[0.6454,3.8773],[0.6453,3.8667],[0.6453,3.856],[0.6453,3.8453],[0.6453,3.8347],[0.6455,3.824],[0.6463,3.8133],[0.6476,3.8027],[0.648,3.792],[0.648,3.7813],[0.648,3.7707],[0.648,3.76],[0.648,3.7493],[0.6474,3.7387],[0.6431,3.728],[0.6367,3.7173],[0.6348,3.7067],[0.6347,3.696],[0.6347,3.6853],[0.6347,3.6747],[0.6347,3.664],[0.6347,3.6533],[0.6347,3.6427],[0.6347,3.632],[0.6347,3.6213],[0.6347,3.6107],[0.6347,3.6],[0.6347,3.5893],[0.6347,3.5787],[0.6354,3.568],[0.6427,3.5573],[0.6512,3.552],[0.6606,3.5467],[0.7325,3.5413],[0.764,3.536],[0.8056,3.5307],[0.8501,3.5253],[0.9224,3.5147],[0.9595,3.504],[0.9755,3.4933],[0.9856,3.4827],[0.9917,3.472],[0.9953,3.4613],[0.9971,3.4507],[0.9973,3.4453],[1.0,3.44],[1.0,3.4347],[1.0,3.4293],[1.0,3.4187],[1.0,3.408],[1.0,3.3973],[1.0,3.3867],[1.0,3.376],[1.0,3.3653],[1.0,3.3547],[1.0,3.344],[1.0,3.3333],[1.0,3.3227],[1.0,3.312],[1.0,3.3013],[1.0,3.2907],[1.0,3.28],[1.0,3.2693],[1.0,3.2587],[1.0,3.248],[1.0,3.2373],[1.0,3.2267],[1.0,3.216],[1.0,3.2053],[1.0,3.1947],[1.0,3.184],[1.0,3.1733],[1.0,3.1627],[1.0,3.152],[1.0,3.1413],[1.0,3.1307],[1.0,3.12],[1.0,3.1093],[1.0,3.0987],[1.0,3.088],[1.0,3.0773],[1.0,3.0667],[1.0,3.056],[1.0,3.0453],[1.0,3.0347],[1.0,3.024],[1.0,3.0133],[1.0,3.0027],[1.0,2.992],[1.0,2.9813],[1.0,2.9707],[1.0,2.96],[1.0,2.9493],[1.0,2.9387],[1.0,2.928],[1.0,2.9173],[1.0,2.9067],[1.0,2.896],[1.0,2.8853],[1.0,2.8747],[1.0,2.864],[1.0,2.8533],[1.0,2.8427],[1.0,2.832],[1.0,2.8213],[1.0,2.8107],[1.0,2.8],[1.0,2.7893],[1.0,2.7787],[1.0,2.768],[1.0,2.7573],[1.0,2.7467],[1.0,2.736],[1.0,2.7253],[1.0,2.7147],[1.0,2.704],[1.0,2.6933],[1.0,2.6827],[1.0,2.672],[1.0,2.6613],[1.0,2.6507],[1.0,2.64],[1.0,2.6293],[1.0,2.6187],[1.0,2.608],[1.0,2.5973],[1.0,2.5867],[1.0,2.576],[1.0,2.5653],[1.0,2.5547],[1.0,2.544],[1.0,2.5333],[1.0,2.5227],[1.0,2.512],[1.0,2.5013],[1.0,2.4907],[1.0,2.48],[1.0,2.4693],[1.0,2.4587],[1.0,2.448],[1.0,2.4373],[1.0,2.4267],[1.0,2.416],[1.0,2.4053],[1.0,2.3947],[1.0,2.384],[1.0,2.3733],[1.0,2.3627],[1.0,2.352],[1.0,2.3413],[1.0,2.3307],[1.0,2.32],[1.0,2.3093],[1.0,2.2987],[1.0,2.288],[1.0,2.2773],[1.0,2.2667],[1.0,2.256],[1.0,2.2453],[1.0,2.2347],[1.0,2.224],[1.0,2.2133],[1.0,2.2027],[1.0,2.192],[1.0,2.1813],[1.0,2.1707],[1.0,2.16],[1.0,2.1493],[1.0,2.1387],[1.0,2.128],[1.0,2.1173],[1.0,2.1067],[1.0,2.096],[1.0,2.0853],[1.0,2.0747],[1.0,2.064],[1.0,2.0533],[1.0,2.0427],[1.0,2.032],[1.0,2.0213],[1.0,2.0107],[1.0,2.0],[1.0,1.9893],[1.0,1.9787],[1.0,1.968],[1.0,1.9573],[1.0,1.9467],[1.0,1.936],[1.0,1.9253],[1.0,1.9147],[1.0,1.904],[1.0,1.8933],[1.0,1.8827],[1.0,1.872],[1.0,1.8613],[1.0,1.8507],[1.0,1.84],[1.0,1.8293],[1.0,1.8187],[1.0,1.808],[1.0,1.7973],[1.0,1.7867],[1.0,1.776],[1.0,1.7653],[1.0,1.7547],[1.0,1.744],[1.0,1.7333],[1.0,1.7227],[1.0,1.712],[1.0,1.7013],[1.0,1.6907],[1.0,1.68],[1.0,1.6693],[1.0,1.6587],[1.0,1.648],[1.0,1.6373],[1.0,1.6267],[1.0,1.616],[1.0,1.6053],[1.0,1.5947],[1.0,1.584],[1.0,1.5733],[1.0,1.5627],[1.0,1.552],[1.0,1.5413],[1.0,1.5307],[1.0,1.52],[1.0,1.5093],[1.0,1.4987],[1.0,1.488],[1.0,1.4773],[1.0,1.4667],[1.0,1.456],[1.0,1.4453],[1.0,1.4347],[1.0,1.424],[1.0,1.4133],[1.0,1.4027],[1.0,1.392],[1.0,1.3813],[1.0,1.3707],[1.0,1.36],[1.0,1.3493],[1.0,1.3387],[1.0,1.328],[1.0,1.3173],[1.0,1.3067],[1.0,1.296],[1.0,1.2853],[1.0,1.2747],[1.0,1.264],[1.0,1.2533],[1.0,1.2427],[1.0,1.232],[1.0,1.2213],[1.0,1.2107],[1.0,1.2],[1.0,1.1893],[1.0,1.1787],[1.0,1.168],[1.0,1.1573],[1.0,1.1467],[1.0,1.136],[1.0,1.1253],[1.0,1.1147],[1.0,1.104],[1.0,1.0933],[1.0,1.0827],[1.0,1.072],[1.0,1.0613],[1.0,1.0507],[1.0,1.04],[1.0,1.0293],[1.0,1.0187],[1.0,1.008],[1.0,0.9973],[1.0,0.9867],[1.0,0.976],[1.0,0.9653],[1.0,0.9547],[1.0,0.944],[1.0,0.9333],[1.0,0.9227],[1.0,0.912],[1.0,0.9013],[1.0,0.8907],[1.0,0.88],[1.0,0.8693],[1.0,0.8587],[1.0,0.848],[1.0,0.8373],[1.0,0.8267],[1.0,0.816],[1.0,0.8053],[1.0,0.7947],[1.0,0.784],[1.0,0.7733],[1.0,0.7627],[1.0,0.752],[1.0,0.7413],[1.0,0.7307],[1.0,0.72],[1.0,0.7093],[1.0,0.6987],[1.0,0.688],[1.0,0.6773],[1.0,0.6667],[1.0,0.656],[1.0,0.6453],[1.0,0.6347],[1.0,0.624],[1.0,0.6133],[1.0,0.6027],[1.0,0.592],[1.0,0.5813],[1.0,0.5707],[1.0,0.56],[1.0,0.5493],[1.0,0.5387],[1.0,0.528],[1.0,0.5173],[1.0,0.5067],[1.0,0.496],[1.0,0.4853],[1.0,0.4747],[1.0,0.464],[1.0,0.4533],[1.0,0.4427],[1.0,0.432],[1.0,0.4213],[1.0,0.4107],[1.0,0.4],[1.0,0.3893],[1.0,0.3787],[1.0,0.368],[1.0,0.3573],[1.0,0.3467],[1.0,0.336],[1.0,0.3253],[1.0,0.3147],[1.0,0.304],[1.0,0.2933],[1.0,0.2827],[1.0,0.272],[1.0,0.2613],[1.0,0.2507],[1.0,0.24],[1.0,0.2293],[1.0,0.2187],[1.0,0.208],[1.0,0.1973],[1.0,0.1867],[1.0,0.1813],[0.9973,0.176],[0.9973,0.1707],[0.9973,0.1653],[0.9973,0.1547],[0.9973,0.144],[0.9972,0.1333],[0.9956,0.1227],[0.9884,0.112],[0.9746,0.1013],[0.9543,0.0907],[0.932,0.08],[0.9114,0.0693],[0.8837,0.0587],[0.8605,0.048],[0.838,0.0373],[0.7821,0.0267],[0.6693,0.016],[0.4259,0.0053],[0.2886,0.0]],"yTop":5.6693,"labY0":0.6166,"labY1":3.0634};
  const section = document.getElementById('ritual3d');
  const canvas = document.getElementById('drop3d');
  if(!section || !canvas) return;
  const wrap = canvas.parentElement;
  const fallback = wrap.querySelector('.r3-fallback');
  const beats = [...section.querySelectorAll('.r3-beat')]
    .sort((a,b)=> parseInt(a.querySelector('.r3-num').textContent) - parseInt(b.querySelector('.r3-num').textContent));
  const dots = [...section.querySelectorAll('.r3-prog i')];
  const progLbl = section.querySelector('.r3-prog-lbl');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- autonomous storytelling (no scroll needed) ---------- */
  // split titles & paragraphs into masked words for the staggered reveal
  beats.forEach(b=>{
    b.querySelectorAll('h3, p').forEach(el=>{
      let i = 0;
      const walk = node=>{
        [...node.childNodes].forEach(n=>{
          if(n.nodeType === 3){
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(tok=>{
              if(!tok) return;
              if(/^\s+$/.test(tok)){ frag.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span'); w.className = 'w';
              const s = document.createElement('span'); s.textContent = tok; s.style.setProperty('--i', i++);
              w.appendChild(s); frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if(n.nodeType === 1) walk(n);
        });
      };
      walk(el);
      if(el.tagName === 'P') el.style.setProperty('--d', '.35s');
    });
  });
  const pc = section.querySelector('.r3-particles');
  if(pc && !reduce) for(let i=0;i<22;i++){
    const d = document.createElement('i'), z = 1 + Math.random()*2.5;
    d.style.cssText = `left:${Math.random()*100}%;width:${z}px;height:${z}px;--dx:${Math.random()*60-30}px;animation-duration:${6+Math.random()*7}s;animation-delay:${Math.random()*9}s`;
    pc.appendChild(d);
  }
  const BEAT = reduce ? 7000 : 5200, N = beats.length;
  let active = -1, timer = null, inView = false, turns = 0;
  function show(i){
    active = (i + N) % N;
    beats.forEach((b,k)=>{ b.classList.toggle('on', k === active); if(k !== active) b.classList.remove('in'); });
    requestAnimationFrame(()=> beats[active].classList.add('in'));
    dots.forEach((d,k)=>{ d.classList.toggle('done', k < active); d.classList.toggle('on', k === active); });
    if(progLbl) progLbl.textContent = beats[active].dataset.kind;
    turns += 1;                                         // the bottle turns to present each benefit
  }
  function next(){ show(active + 1); }
  function play(){ stop(); timer = setInterval(next, BEAT); }
  function stop(){ if(timer){ clearInterval(timer); timer = null; } }
  section.style.setProperty('--beat', BEAT + 'ms');
  dots.forEach((d,k)=> d.addEventListener('click', ()=>{ show(k); play(); }));
  new IntersectionObserver(es=>{
    inView = es[0].isIntersecting;
    if(inView){ if(active < 0) show(0); play(); } else stop();
  }, {threshold:0.35}).observe(section);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) stop(); else if(inView) play(); });

  /* ---------- 3D ---------- */
  const fail = ()=>{ canvas.hidden = true; if(fallback) fallback.hidden = false; };
  if(!window.THREE) return fail();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, premultipliedAlpha:false}); }
  catch(e){ return fail(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const YTOP = GEO.yTop, LY0 = GEO.labY0, LY1 = GEO.labY1, CENTER_Y = YTOP/2;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(9, 1, 1, 200);
  const DIST = 44;
  camera.position.set(0, 0, DIST); camera.lookAt(0, 0, 0);

  const loader = new THREE.TextureLoader();
  let pending = 4;
  const ready = ()=>{ if(--pending === 0){ render(); canvas.style.opacity = 1; } };
  const tex = (src)=>{ const t = loader.load(src, ready, undefined, fail);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const V = '?v=2';
  const tStrip = tex('drop3d-strip.jpg'+V);
  const tLabel = tex('drop3d-label.jpg'+V); tLabel.wrapS = THREE.RepeatWrapping;
  const tMask  = tex('drop3d-mask.png'+V);  tMask.wrapS = THREE.RepeatWrapping;
  const tShade = tex('drop3d-shade.png'+V); tShade.minFilter = tShade.magFilter = THREE.LinearFilter; tShade.generateMipmaps = false;

  const pivot = new THREE.Group(); scene.add(pivot);
  const TILT_Z = -0.22, TILT_X = 0.12;
  pivot.rotation.set(TILT_X, 0, TILT_Z);
  const fixed = new THREE.Group(); fixed.position.y = -CENTER_Y; pivot.add(fixed);   // view-fixed photo parts
  const spin  = new THREE.Group(); spin.position.y  = -CENTER_Y; pivot.add(spin);    // the label turns

  // whole silhouette as a lathe, textured with the photo itself
  const pts = GEO.pts.map(([r,y])=> new THREE.Vector2(Math.max(r, 0.0005), y));
  const lathe = new THREE.LatheGeometry(pts, 160);
  const stripMat = new THREE.ShaderMaterial({
    uniforms:{ map:{value:tStrip}, yTop:{value:YTOP}, inset:{value:0.985} },
    side: THREE.DoubleSide,
    vertexShader:`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`
      uniform sampler2D map; uniform float yTop, inset; varying vec3 vP;
      void main(){
        float u = vP.x / max(length(vP.xz), 1e-4);
        vec2 st = vec2(clamp(u/inset, -1.0, 1.0)*0.5 + 0.5, clamp(vP.y / yTop, 0.0, 1.0));
        gl_FragColor = vec4(texture2D(map, st).rgb, 1.0);
      }`
  });
  fixed.add(new THREE.Mesh(lathe, stripMat));

  // printed label: albedo (rotates) x studio light profile (fixed to the camera)
  const LH = LY1 - LY0, SEG = 200;
  const labelGeo = new THREE.CylinderGeometry(1.004, 1.004, LH, SEG, 1, true, Math.PI).translate(0, (LY0+LY1)/2, 0);
  const labelMat = new THREE.ShaderMaterial({
    uniforms:{ map:{value:tLabel}, mask:{value:tMask}, shade:{value:tShade} },
    vertexShader:`varying vec3 vN; varying vec2 vUv;
      void main(){ vN = normalize(normalMatrix*normal); vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`
      uniform sampler2D map, mask, shade; varying vec3 vN; varying vec2 vUv;
      void main(){
        float a = texture2D(mask, vUv).r;
        if(a < 0.5) discard;
        vec3 n = normalize(vN);
        float nx = clamp(n.x, -0.995, 0.995);
        vec3 alb = texture2D(map, vUv).rgb;
        vec3 sh = texture2D(shade, vec2(nx*0.5+0.5, 0.5)).rgb * 2.0;
        vec3 c = alb * sh;
        // satin film on the label + soft rim falloff
        float s = 0.045*exp(-pow((nx-0.52)/0.05,2.0)) + 0.025*exp(-pow((nx+0.78)/0.05,2.0));
        float rim = pow(1.0 - abs(n.z), 3.0);
        c = c + s - rim*0.10;
        gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0);
      }`
  });
  spin.add(new THREE.Mesh(labelGeo, labelMat));

  // soft contact shadow
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64;
  const sg = sc.getContext('2d'); const gr = sg.createRadialGradient(128,32,4,128,32,128);
  gr.addColorStop(0,'rgba(90,60,110,.42)'); gr.addColorStop(.35,'rgba(90,60,110,.16)'); gr.addColorStop(1,'rgba(90,60,110,0)');
  sg.setTransform(1,0,0,.25,0,24); sg.fillStyle = gr; sg.fillRect(0,-200,256,600);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc), transparent:true, depthWrite:false}));
  shadow.position.set(0.35, -CENTER_Y - 0.55, -0.6);
  scene.add(shadow);

  function resize(){
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    const needH = 7.3, needW = 3.9;
    const vH = Math.max(needH, needW / camera.aspect);
    camera.fov = 2*Math.atan(vH/2/DIST)*180/Math.PI;
    camera.updateProjectionMatrix();
    render();
  }
  window.addEventListener('resize', resize);

  // rotation = slow auto spin + scroll-driven turn + drag with inertia
  const AUTO = reduce ? 0 : (Math.PI*2)/(18*60);
  let base = 0, vel = AUTO, dragging = false, lastX = 0, shown = 0;
  wrap.addEventListener('pointerdown', e=>{ dragging = true; lastX = e.clientX; try{wrap.setPointerCapture(e.pointerId);}catch(_){} });
  wrap.addEventListener('pointermove', e=>{ if(!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; const d = dx*0.011; base += d; vel = d; });
  const end = ()=>{ dragging = false; };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);

  let visible = false, last = performance.now(), t = 0;
  function render(){ renderer.render(scene, camera); }
  function loop(now){
    if(!visible) return;
    const dt = Math.min(3, (now - last)/16.667); last = now; t += dt/60;
    if(!dragging){ vel += (AUTO - vel)*0.025*dt; base += vel*dt; }
    const target = base + turns * (Math.PI * 2 / 6);  // a sixth of a turn per benefit
    shown += (target - shown) * Math.min(1, 0.045*dt);
    spin.rotation.y = shown;
    const bob = reduce ? 0 : Math.sin(t*0.9)*0.09;
    pivot.position.y = bob;
    if(!reduce){
      pivot.rotation.z = TILT_Z + Math.sin(t*0.55)*0.04;
      pivot.rotation.x = TILT_X + Math.sin(t*0.41 + 1.3)*0.03;
    }
    shadow.material.opacity = 0.55 - bob*1.5;
    shadow.scale.set(1.1 - bob*0.6, 0.6 - bob*0.3, 1);
    render();
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es=>{
    const was = visible; visible = es[0].isIntersecting;
    if(visible && !was){ last = performance.now(); requestAnimationFrame(loop); }
  }, {threshold:0.02}).observe(wrap);
  wrap.setRotation = a => { base = a - turns*(Math.PI*2/6); shown = a; vel = 0; spin.rotation.y = shown; render(); };
  canvas.style.opacity = 0; canvas.style.transition = 'opacity .8s';
  resize();
})();
