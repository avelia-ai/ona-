import json, os, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
os.chdir('/home/claude/ona-')
P={p['id']:p for p in json.load(open('products.json'))['products']}
M=json.load(open('scratchpad/avant-apres-match.json'))
PAL={'boost':((199,219,244),(129,170,214),(226,236,250),(21,40,80),(16,28,52)),
     'hydraline':((247,242,200),(230,212,100),(248,244,199),(40,35,15),(28,24,10)),
     'care':((242,235,251),(186,162,219),(244,238,252),(50,32,74),(34,22,50)),
     'repare':((251,235,240),(228,160,184),(253,240,244),(78,24,46),(50,16,30))}
def gk(g):
    g=g.lower()
    for k in ('boost','hydraline','care','repare','répare'):
        if k in g: return 'repare' if k=='répare' else k
F=lambda n,s: ImageFont.truetype('/usr/share/fonts/truetype/'+n,s)
SERB='liberation/LiberationSerif-Bold.ttf'; SANS='dejavu/DejaVuSans.ttf'; SANSB='dejavu/DejaVuSans-Bold.ttf'
W,H=1050,1400; PW,PH=489,966; X=(28,533); Y=212
def src_panels(f):
    im=Image.open(f).convert('RGB'); m=M[f]
    side = f.startswith(('peeling','serum-niacinamide','serum-hydratant','creme-onctueuse','creme-alternative','creme-jour'))
    good = (not side) and all(x[0]>=0.86 for x in m) and m[0][1].replace('avant','X')==m[1][1].replace('apres','X')
    out=[]
    for i,x in enumerate(m):
        if good:
            o=Image.open(x[1]).convert('RGB'); Wm,(lx,ly)=x[2][0],x[2][1]; k=1050/Wm
            cx=(lx+24)*k   # centre du panneau dans l'original
            cw=int(o.height*PW/PH); x0=int(min(max(cx-cw/2,0),o.width-cw))
            out.append(o.crop((x0,0,x0+cw,o.height)))
        else:
            if side: box=[(0,0,521,1290),(529,0,1050,1290)][i]
            elif im.getpixel((10,700))!=im.getpixel((10,700)) : pass
            if not side:
                sat = np.asarray(im)[200,30].mean()<215 and Image.open(f).getpixel((28,200))!=None and M[f][0][3]=='sat'
                box=[(28,189,517,1170),(533,189,1021,1170)][i] if (f.startswith(('serum-vitamine','serum-alternatif'))) else [(40,275,518,1100),(531,275,1009,1100)][i]
            c=im.crop(box); r=PW/PH
            if c.width/c.height>r: nw=int(c.height*r); x0=(c.width-nw)//2; c=c.crop((x0,0,x0+nw,c.height))
            else: nh=int(c.width/r); c=c.crop((0,0,c.width,nh))
            out.append(c)
    return out,good
def rr_mask(w,h,r):
    m=Image.new('L',(w*3,h*3),0); ImageDraw.Draw(m).rounded_rectangle((0,0,w*3-1,h*3-1),r*3,fill=255); return m.resize((w,h),Image.LANCZOS)
def tracked(d,xy,text,font,fill,sp,anchor_center=True):
    ws=[d.textlength(ch,font=font) for ch in text]; tot=sum(ws)+sp*(len(text)-1); x=xy[0]-tot/2
    for ch,w in zip(text,ws): d.text((x,xy[1]),ch,font=font,fill=fill); x+=w+sp
def render(pid,f):
    p=P[pid]; top,bot,light,dark,ink=PAL[gk(p['gamme'])]
    g=np.linspace(0,1,H)[:,None]; arr=(np.array(top)[None,None,:]*(1-g[...,None])+np.array(bot)[None,None,:]*g[...,None])
    bg=Image.fromarray(np.repeat(arr,W,1).astype('uint8'))
    d=ImageDraw.Draw(bg)
    eb='APRÈS UNE UTILISATION' if 'patchs' in pid else 'RÉSULTAT VISIBLE'
    tracked(d,(W/2,84),eb,F(SANS,22),tuple(int(c*.6+t*.4) for c,t in zip(ink,(90,90,90))),6)
    tf=F(SERB,76); d.text((W/2,156),'Avant • Après',font=tf,fill=ink,anchor='mm')
    pans,good=src_panels(f)
    for i,pan in enumerate(pans):
        pan=pan.resize((PW,PH),Image.LANCZOS)
        sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).rounded_rectangle((X[i],Y+10,X[i]+PW,Y+PH+10),16,fill=70); sh=sh.filter(ImageFilter.GaussianBlur(14))
        bg=Image.composite(Image.new('RGB',(W,H),tuple(int(c*.55) for c in bot)),bg,sh)
        bg.paste(pan,(X[i],Y),rr_mask(PW,PH,16))
    d=ImageDraw.Draw(bg)
    pf=F(SANSB,26)
    for i,(t,fillp,tc) in enumerate([('AVANT',light,ink),('APRÈS',dark,light)]):
        tw=d.textlength(t,font=pf); x0=X[i]+18; y0=Y+PH-62
        d.rounded_rectangle((x0,y0,x0+tw+40,y0+44),22,fill=fillp); d.text((x0+20+tw/2,y0+23),t,font=pf,fill=tc,anchor='mm')
    name=(p['name']+' '+(p.get('name_line2') or '')).strip()
    s=31
    while F(SERB,s).getlength(name)>980: s-=1
    d.text((W/2,1226),name,font=F(SERB,s),fill=ink,anchor='mm')
    d.text((W/2,1264),"Résultats individuels, pouvant varier d'une personne à l'autre.",font=F(SANS,19),fill=tuple(int(c*.5+60) for c in ink),anchor='mm')
    out=f.rsplit('.',1)[0]+'-n.jpg'
    bg.save(out,quality=88,optimize=True); return out,good
REN=json.load(open('scratchpad/avant-apres-noms.json')); INV={v:k for k,v in REN.items()}
for pid,p in P.items():
    for f in (p.get('gallery') or []):
        if f in INV: o,g=render(pid,INV[f]); print(o,'HD' if g else 'extrait')
