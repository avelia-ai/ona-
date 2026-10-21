/* Onaé — Coffret Anti-âge aux Peptides en vraie 3D (WebGL / three.js r128).
   Les 4 faces imprimées sont dépliées à partir des photos studio du coffret
   (coffret3d-front / -back / -side-l / -side-r.jpg) et posées sur un pavé aux
   proportions réelles : la tranche du coffret apparaît pendant la rotation.
   API : OnaeCoffret3D.init(stage, onReady) -> { set(ryDeg, rxDeg, yPx, scale), alive } | null */
(function(){
  const W = 1.1, H = 1.0, D = 0.27;          // largeur / hauteur / profondeur (texture 1100×1000, tranche 270)
  const FOV = 30, DIST = 2.38;

  function init(stage, onReady){
    if (!window.THREE || !stage) return null;
    const T = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.className = 'gl3d';
    canvas.setAttribute('aria-hidden', 'true');
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(FOV, 1, .1, 20);
    camera.position.set(0, .16, DIST);
    camera.lookAt(0, -.02, 0);

    // Éclairage studio : douce lumière d'ambiance rosée, clé frontale, contre-jour rose sur les arêtes
    scene.add(new T.HemisphereLight(0xfff4f6, 0x3a1626, .55));
    const key = new T.DirectionalLight(0xffffff, .72); key.position.set(1.3, 1.5, 3.2); scene.add(key);
    const fill = new T.DirectionalLight(0xffe6ec, .22); fill.position.set(2.4, .2, 1.6); scene.add(fill);
    const rim = new T.DirectionalLight(0xe9a7b8, .55); rim.position.set(1.8, 1.2, -2.6); scene.add(rim);
    const rim2 = new T.DirectionalLight(0xf6c9d4, .35); rim2.position.set(-2.2, .6, -2.2); scene.add(rim2);

    let ready = false, failed = false, visible = true, w = 0, h = 0;
    const loader = new T.TextureLoader();
    const aniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    const v = '?v=1';
    let pending = 4;
    const tex = src => loader.load(src + v, t => {
      t.encoding = T.sRGBEncoding; t.anisotropy = aniso; t.needsUpdate = true;
      if (--pending === 0) { ready = true; onReady && onReady(); }
    }, undefined, () => { failed = true; });

    // Dessus / dessous : carton rose du coffret avec léger dégradé
    const cardTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#e3a9b6'); g.addColorStop(.5, '#e8b3bf'); g.addColorStop(1, '#dea2b0');
      x.fillStyle = g; x.fillRect(0, 0, 512, 128);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
    })();

    const mat = map => new T.MeshStandardMaterial({ map, roughness: .46, metalness: 0 });
    // Ordre BoxGeometry : +X (droite), -X (gauche), +Y, -Y, +Z (face), -Z (dos)
    const materials = [
      mat(tex('coffret3d-side-r.jpg')),
      mat(tex('coffret3d-side-l.jpg')),
      mat(cardTex), mat(cardTex),
      mat(tex('coffret3d-front.jpg')),
      mat(tex('coffret3d-back.jpg'))
    ];
    const box = new T.Mesh(new T.BoxGeometry(W, H, D), materials);
    const pivot = new T.Group(); pivot.add(box); scene.add(pivot);

    const ref = stage.querySelector('.box3d');
    ref ? stage.insertBefore(canvas, ref) : stage.appendChild(canvas);

    function resize(){
      const r = stage.getBoundingClientRect();
      if (!r.width || (r.width === w && r.height === h)) return;
      w = r.width; h = r.height;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // garder le coffret entier, y compris en rotation, quel que soit le format
      const fit = Math.max(1, (1.2 / camera.aspect));
      camera.position.z = DIST * fit;
      camera.updateProjectionMatrix();
    }
    resize();
    addEventListener('resize', resize, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(stage);

    return {
      get alive(){ return !failed; },
      get ready(){ return ready; },
      set(ry, rx, yPx, sc){
        if (!ready || !visible || document.hidden) return;
        resize();
        const unitsPerPx = (2 * camera.position.z * Math.tan(FOV * Math.PI / 360)) / (h || 1);
        pivot.rotation.set(rx * Math.PI / 180, ry * Math.PI / 180, 0);
        pivot.position.y = -yPx * unitsPerPx;
        pivot.scale.setScalar(sc);
        renderer.render(scene, camera);
      }
    };
  }
  window.OnaeCoffret3D = { init };
})();
