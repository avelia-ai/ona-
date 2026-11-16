# Visuels des e-mails Onaé : logo clair + bandeaux. Lancer depuis la racine du repo.
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, random
random.seed(7)
# logo crème pour fond bordeaux
lg = Image.open('checkout-logo-v2.png').convert('RGBA')
a = np.array(lg); a[..., :3] = (246, 228, 214); Image.fromarray(a).save('email-logo-clair.png', optimize=True)

def velvet(W, H):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, cy = W * .5, H * .62
    d = np.sqrt(((x - cx) / W) ** 2 * 1.4 + ((y - cy) / H) ** 2)
    top = np.array([42, 12, 24], np.float32); mid = np.array([110, 30, 58], np.float32)
    t = np.clip(1 - d * 1.55, 0, 1)[..., None] ** 1.4
    img = top + (mid - top) * t
    img += (np.random.rand(H, W, 1) - .5) * 6
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')

def hero(out, W=1200, H=760):
    bg = velvet(W, H).convert('RGBA')
    # arche lumineuse
    arch = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(arch)
    aw, top, bot = 520, 70, H + 40; l = (W - aw) // 2
    d.rounded_rectangle([l, top, l + aw, bot], radius=aw // 2, fill=(246, 214, 222, 255))
    g = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
    gd.rounded_rectangle([l - 30, top - 30, l + aw + 30, bot], radius=aw // 2 + 30, fill=(255, 190, 205, 120))
    bg = Image.alpha_composite(bg, g.filter(ImageFilter.GaussianBlur(40)))
    # dégradé intérieur de l'arche
    inner = Image.new('RGBA', (W, H)); idr = np.zeros((H, W, 4), np.uint8)
    yy = np.linspace(0, 1, H)[:, None]
    col = (np.array([250, 228, 233]) * (1 - yy[..., None]) + np.array([228, 160, 178]) * yy[..., None])
    idr[..., :3] = col.astype(np.uint8); idr[..., 3] = np.array(arch)[..., 3]
    bg = Image.alpha_composite(bg, Image.fromarray(idr, 'RGBA'))
    # double filet champagne
    f = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fd = ImageDraw.Draw(f)
    for k, w in ((-16, 2), (-26, 1)):
        fd.rounded_rectangle([l + k, top + k, l + aw - k, bot], radius=aw // 2 - k, outline=(214, 178, 128, 230), width=w)
    bg = Image.alpha_composite(bg, f)
    # mannequin
    m = Image.open('bar-noel-modele.webp').convert('RGBA'); mh = H - 90
    m = m.resize((int(m.width * mh / m.height), mh), Image.LANCZOS)
    bg.alpha_composite(m, ((W - m.width) // 2, H - mh))
    # poussière dorée + flocons
    p = Image.new('RGBA', (W, H), (0, 0, 0, 0)); pd = ImageDraw.Draw(p)
    for _ in range(140):
        x, y, r = random.uniform(0, W), random.uniform(0, H), random.uniform(.8, 3.2)
        c = (235, 205, 150, random.randint(90, 220)) if random.random() < .6 else (255, 248, 250, random.randint(70, 200))
        pd.ellipse([x - r, y - r, x + r, y + r], fill=c)
    bg = Image.alpha_composite(bg, p.filter(ImageFilter.GaussianBlur(.6)))
    # fondu bas
    fade = np.zeros((H, W, 4), np.uint8); fade[..., :3] = (42, 12, 24)
    fade[..., 3] = (np.clip((np.linspace(0, 1, H) - .86) / .14, 0, 1) * 200).astype(np.uint8)[:, None]
    bg = Image.alpha_composite(bg, Image.fromarray(fade, 'RGBA'))
    bg.convert('RGB').save(out, quality=86, optimize=True, progressive=True)

hero('email-ouverture.jpg')
print('ok')
