"""Génère onae-round.css à partir de scratchpad/round/audit-pc.json et audit-mob.json (voir audit.js).
Lancer depuis la racine : python3 scratchpad/round/gen.py
Pour changer les arrondis du site : modifier les variables --r-* en tête du fichier généré (ou ici, dans HEAD)."""
import json, collections
import glob
runs = [json.load(open(f)) for f in sorted(glob.glob('scratchpad/round/audit-*.json'))]   # audit-pc, audit-mob + passages ciblés (ex. espace client connecté)
bad = set().union(*[set(r['bad']) for r in runs])
# sélecteurs exclus à la main après relecture visuelle (voir CLAUDE.md)
EXCLUDE = set(json.load(open('scratchpad/round/exclude.json'))) if __import__('os').path.exists('scratchpad/round/exclude.json') else set()
PILL = set(json.load(open('scratchpad/round/pill.json'))) if __import__('os').path.exists('scratchpad/round/pill.json') else set()
agg = {}
for r in runs:
    for e in r['res']:
        a = agg.setdefault(e['s'], {'kinds': collections.Counter(), 'clip': set(), 'w': 0, 'h': 0})
        a['kinds'].update(e['kinds']); a['clip'].update(e['clip']); a['w'] = max(a['w'], e['w']); a['h'] = max(a['h'], e['h'])
groups = collections.defaultdict(list); clip = []
ORDER = ['block', 'card', 'small', 'btn', 'field', 'area', 'chip', 'media']
for s, a in sorted(agg.items()):
    if s in bad or s in EXCLUDE:
        continue
    k = a['kinds'].most_common()
    kind = sorted([x for x, n in k if n == k[0][1]], key=ORDER.index)[0]
    if s in PILL:
        kind = 'chip'                       # onglets / filtres déjà en pilule ailleurs : pilule partout
    elif kind == 'card' and a['w'] <= 140 and a['h'] <= 170:
        kind = 'small'                      # miniatures, petites vignettes : arrondi discret
    groups[kind].append(s)
    if kind in ('card', 'block') and 'add' in a['clip'] and 'unsafe' not in a['clip']:
        clip.append(s)
VAR = {'small': 'var(--r-media)', 'block': 'var(--r-block)', 'card': 'var(--r-card)', 'btn': 'var(--r-btn)', 'field': 'var(--r-field)',
       'area': 'var(--r-field)', 'chip': '999px', 'media': 'var(--r-media)'}
HEAD = """/* onae-round.css : arrondis de tout le site (26/11/2026, demande de Guillaume : « tous les coins arrondis partout »).
   FICHIER GÉNÉRÉ par scratchpad/round/gen.py depuis l'audit scratchpad/round/audit.js : ne pas modifier à la main
   (sauf les variables ci-dessous). Chargé sur toutes les pages par inject() de seo.js.
   Les sections bord à bord (bandeaux, en-tête, pied de page) restent droites ; les cercles existants ne sont pas touchés. */
:root{--r-btn:14px;--r-field:12px;--r-card:20px;--r-block:28px;--r-media:14px}
@media (max-width:760px){:root{--r-card:16px;--r-block:22px;--r-media:12px}}
"""
out = [HEAD]
for kind in ORDER:
    if groups[kind]:
        out.append(f"/* {kind} ({len(groups[kind])}) */\n" + ',\n'.join(groups[kind]) + '{border-radius:' + VAR[kind] + '!important}\n')
import os
TOP = json.load(open('scratchpad/round/top-only.json')) if os.path.exists('scratchpad/round/top-only.json') else []
present = set().union(*groups.values())
TOP = [t for t in TOP if t in present]
if TOP:   # cadre photo collé en haut d'une carte : arrondi en haut seulement, pour épouser la carte
    out.append(f"/* photo en haut de carte : arrondi en haut seulement ({len(TOP)}) */\n" + ',\n'.join(TOP) + '{border-radius:var(--r-card) var(--r-card) 0 0!important}\n')
mobwide = [k for k in (json.load(open('scratchpad/round/wide-mob.json')) if os.path.exists('scratchpad/round/wide-mob.json') else {}) if k != ':root' and k not in EXCLUDE]
if mobwide:   # pleine largeur sur mobile (pop-ups et volets plein écran, en-têtes) : droits sur mobile, arrondis sur ordinateur
    out.append(f"/* pleine largeur sur mobile : restent droits sur petit écran ({len(mobwide)}) */\n@media (max-width:760px){{\n" + ',\n'.join(sorted(mobwide)) + '{border-radius:0!important}\n}\n')
if clip:
    out.append(f"/* cartes dont le visuel touche un coin : on découpe pour que l'image suive l'arrondi ({len(clip)}) */\n" + ',\n'.join(clip) + '{overflow:hidden}\n')
open('onae-round.css', 'w', encoding='utf-8').write('\n'.join(out))
print({k: len(v) for k, v in groups.items()}, 'clip', len(clip))
