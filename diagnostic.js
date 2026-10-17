/* ═══════════ Onaé — Diagnostic peau & cheveux par IA ═══════════
   POST /api/diagnostic        { photos:[{data:'data:image/jpeg;base64,…', kind:'visage'|'cheveux'}], focus, answers, consent }
   GET  /api/diagnostic/:id    → résultat enregistré (sans les photos)
   Les photos ne sont JAMAIS enregistrées : elles sont envoyées à l'analyse puis oubliées.
   Variables : ANTHROPIC_API_KEY (obligatoire pour l'analyse photo), DIAG_MODEL (facultatif). */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = function (DATA_DIR, ROOT) {
  const FILE = path.join(DATA_DIR, 'diagnostics.json');
  const DEMO = ['serum-eclat-peptides', 'creme-reparatrice-intense', 'essence-hydratante-pro', 'huile-nuit-reparatrice'];
  const hits = new Map();
  const read = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return []; } };
  const write = list => { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(list.slice(-5000), null, 1)); };
  const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

  function catalog() {
    let d = {}; try { d = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8')); } catch (_) {}
    return (d.products || []).filter(p => !DEMO.includes(p.id)).map(p => ({
      id: p.id, nom: `${p.name} ${p.name_line2 || ''}`.trim(), gamme: p.gamme_label, zone: p.category || 'visage', resume: p.subtitle,
      bienfaits: (p.benefits || []).map(b => typeof b === 'string' ? b : b.title)
    }));
  }

  const METRIC = { type: 'object', properties: { key: { type: 'string' }, label: { type: 'string' }, score: { type: 'integer', minimum: 0, maximum: 100 }, note: { type: 'string' } }, required: ['key', 'label', 'score', 'note'] };
  const TOOL = {
    name: 'rapport_diagnostic',
    description: 'Rapport de diagnostic beauté (cosmétique, non médical) de la peau et/ou des cheveux visibles sur les photos.',
    input_schema: {
      type: 'object',
      properties: {
        photo_ok: { type: 'boolean', description: 'false si la photo est inexploitable (floue, trop sombre, pas de visage ni de cheveux visibles)' },
        photo_conseil: { type: 'string', description: 'Si photo_ok=false : conseil court pour reprendre la photo' },
        titre: { type: 'string', description: 'Phrase d’accroche bienveillante qui résume le diagnostic (max 12 mots)' },
        resume: { type: 'string', description: '2 à 3 phrases bienveillantes, concrètes, au vouvoiement' },
        peau: { type: 'object', properties: {
          visible: { type: 'boolean' }, score: { type: 'integer', minimum: 0, maximum: 100 }, type: { type: 'string', description: 'sèche, mixte, grasse, normale, sensible…' },
          metriques: { type: 'array', items: METRIC, description: 'Exactement ces clés : hydratation, eclat, texture, imperfections, rougeurs, fermete, regard. score 100 = excellent état (ex. imperfections 90 = très peu de boutons).' },
          observations: { type: 'array', items: { type: 'string' }, description: '2 à 4 observations visibles précises (zones T, joues, front, contour des yeux…)' } }, required: ['visible'] },
        cheveux: { type: 'object', properties: {
          visible: { type: 'boolean' }, score: { type: 'integer', minimum: 0, maximum: 100 },
          metriques: { type: 'array', items: METRIC, description: 'Clés : brillance, hydratation, force, cuir_chevelu' },
          observations: { type: 'array', items: { type: 'string' } } }, required: ['visible'] },
        produits: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'object', properties: {
          id: { type: 'string', description: 'id EXACT d’un produit du catalogue fourni' }, pourquoi: { type: 'string', description: '1 phrase liée à une observation' }, moment: { type: 'string', enum: ['matin', 'soir', 'matin et soir', 'hebdomadaire'] } }, required: ['id', 'pourquoi', 'moment'] } },
        conseils: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4, description: 'Conseils d’hygiène de vie / gestes beauté courts' },
        avis_dermato: { type: 'boolean', description: 'true si un signe visible justifie de consulter un dermatologue (acné sévère, lésion inhabituelle, plaque, inflammation importante, chute importante…)' },
        avis_dermato_texte: { type: 'string' }
      },
      required: ['photo_ok', 'titre', 'resume', 'peau', 'cheveux', 'produits', 'conseils', 'avis_dermato']
    }
  };

  function callClaude(photos, focus, answers) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return Promise.reject(Object.assign(new Error('no_key'), { code: 'ai_unavailable' }));
    const cat = catalog();
    const sys = `Tu es l’experte beauté d’Onaé, marque française de soins clean pour la peau et les cheveux. Tu réalises un diagnostic COSMÉTIQUE à partir de photos : tu décris uniquement ce qui est visible (hydratation apparente, éclat, grain de peau, imperfections/boutons, rougeurs/irritations, rides et fermeté, cernes et poches ; cheveux : brillance, sécheresse, casse, cuir chevelu, pellicules visibles).
Règles : jamais de diagnostic médical ni de nom de maladie ; ton bienveillant, valorisant et précis, vouvoiement, français. N’estime ni l’âge, ni l’origine, ni le poids, et ne commente pas l’apparence physique hors peau et cheveux. Si un signe visible justifie un avis médical, mets avis_dermato à true avec une phrase douce. Recommande 1 à 4 produits UNIQUEMENT parmi ce catalogue (utilise l’id exact), en reliant chacun à une observation. Si la zone n’est pas visible, mets visible=false et ne note pas cette zone.
Catalogue : ${JSON.stringify(cat)}`;
    const content = [];
    photos.forEach((p, i) => {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p.data || '');
      if (!m) return;
      content.push({ type: 'text', text: `Photo ${i + 1} (${p.kind === 'cheveux' ? 'cheveux / cuir chevelu' : 'visage'}) :` });
      content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
    });
    const ctx = [`Analyse demandée : ${focus === 'cheveux' ? 'cheveux et cuir chevelu' : focus === 'visage' ? 'peau du visage' : 'peau du visage et cheveux'}.`];
    if (answers && typeof answers === 'object') {
      if (answers.skin) ctx.push(`Ressenti de peau déclaré : ${String(answers.skin).slice(0, 60)}.`);
      if (Array.isArray(answers.concerns) && answers.concerns.length) ctx.push(`Préoccupations déclarées : ${answers.concerns.slice(0, 8).map(s => String(s).slice(0, 40)).join(', ')}.`);
    }
    content.push({ type: 'text', text: ctx.join(' ') + ' Rédige le rapport avec l’outil rapport_diagnostic.' });
    const body = JSON.stringify({ model: process.env.DIAG_MODEL || 'claude-sonnet-5-5', max_tokens: 2000, system: sys, tools: [TOOL], tool_choice: { type: 'tool', name: TOOL.name }, messages: [{ role: 'user', content }] });
    return new Promise((resolve, reject) => {
      const req = https.request({ hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST', timeout: 60000,
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-length': Buffer.byteLength(body) } }, r => {
        let s = ''; r.on('data', c => s += c); r.on('end', () => {
          try { const j = JSON.parse(s); if (r.statusCode >= 300) return reject(Object.assign(new Error(j.error && j.error.message || 'api'), { code: 'ai_error' }));
            const t = (j.content || []).find(c => c.type === 'tool_use'); if (!t) return reject(Object.assign(new Error('no tool'), { code: 'ai_error' })); resolve(t.input);
          } catch (e) { reject(Object.assign(e, { code: 'ai_error' })); }
        });
      });
      req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ai_error' })));
      req.on('error', e => reject(Object.assign(e, { code: e.code === 'ai_error' ? 'ai_error' : 'ai_error' })));
      req.end(body);
    });
  }

  /* nettoie et valide le rapport (ids produits, bornes des scores, longueurs) */
  function sanitize(r) {
    const ids = new Set(catalog().map(p => p.id));
    const str = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').slice(0, n);
    const met = a => (Array.isArray(a) ? a : []).slice(0, 8).map(m => ({ key: str(m.key, 20), label: str(m.label, 40), score: Math.max(0, Math.min(100, Math.round(+m.score || 0))), note: str(m.note, 160) }));
    const zone = z => z && z.visible ? { visible: true, score: Math.max(0, Math.min(100, Math.round(+z.score || 0))), type: str(z.type, 40), metriques: met(z.metriques), observations: (z.observations || []).slice(0, 5).map(o => str(o, 200)) } : { visible: false };
    const seen = new Set();
    return {
      photo_ok: r.photo_ok !== false, photo_conseil: str(r.photo_conseil, 200), titre: str(r.titre, 120), resume: str(r.resume, 600),
      peau: zone(r.peau), cheveux: zone(r.cheveux),
      produits: (r.produits || []).filter(p => ids.has(p.id) && !seen.has(p.id) && seen.add(p.id)).slice(0, 4).map(p => ({ id: p.id, pourquoi: str(p.pourquoi, 220), moment: str(p.moment, 20) })),
      conseils: (r.conseils || []).slice(0, 4).map(c => str(c, 200)),
      avis_dermato: !!r.avis_dermato, avis_dermato_texte: str(r.avis_dermato_texte, 240)
    };
  }

  function save(report, mode) {
    const id = crypto.randomBytes(6).toString('base64url');
    const list = read(); list.push({ id, at: new Date().toISOString(), mode, report }); write(list);
    return id;
  }

  return function route(req, res, urlPath) {
    if (urlPath === '/api/diagnostic/status' && req.method === 'GET') return send(res, 200, { ai: !!process.env.ANTHROPIC_API_KEY });
    if (urlPath.startsWith('/api/diagnostic/') && req.method === 'GET') {
      const id = urlPath.split('/').pop();
      const d = read().find(x => x.id === id);
      return d ? send(res, 200, { id: d.id, at: d.at, mode: d.mode, report: d.report }) : send(res, 404, { error: 'not_found' });
    }
    if (urlPath === '/api/diagnostic' && req.method === 'POST') {
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 3600e3);
      if (h.length >= 10) return send(res, 429, { error: 'too_many' });
      let body = '', big = false;
      req.on('data', c => { body += c; if (body.length > 9e6) { big = true; req.destroy(); } });
      req.on('end', async () => {
        if (big) return send(res, 413, { error: 'too_big' });
        let d; try { d = JSON.parse(body || '{}'); } catch (_) { return send(res, 400, { error: 'invalid_json' }); }
        if (d.consent !== true) return send(res, 400, { error: 'consent_required' });
        // Mode « guidé » (sans photo) : le rapport est calculé côté navigateur, on l’enregistre seulement pour le partage
        if (d.mode === 'guide' && d.report) { h.push(now); hits.set(ip, h); return send(res, 200, { id: save(sanitize(d.report), 'guide'), report: sanitize(d.report) }); }
        const photos = (Array.isArray(d.photos) ? d.photos : []).slice(0, 2);
        if (!photos.length) return send(res, 400, { error: 'photo_required' });
        h.push(now); hits.set(ip, h);
        try {
          const rep = sanitize(await callClaude(photos, d.focus, d.answers));
          if (!rep.photo_ok) return send(res, 200, { retake: true, report: rep });
          return send(res, 200, { id: save(rep, 'photo'), report: rep });
        } catch (e) {
          console.error('[diagnostic]', e.code, e.message);
          return send(res, e.code === 'ai_unavailable' ? 503 : 502, { error: e.code || 'ai_error' });
        }
      });
      return true;
    }
    return false;
  };
};
