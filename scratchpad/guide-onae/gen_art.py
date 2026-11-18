import math, random

def leaf_path(cx, cy, length, width, angle_deg):
    """A simple almond leaf shape pointing along angle_deg, base at (cx,cy)."""
    a = math.radians(angle_deg)
    dx, dy = math.cos(a), math.sin(a)
    px, py = -dy, dx  # perpendicular
    tip = (cx + dx*length, cy + dy*length)
    mid = (cx + dx*length*0.45, cy + dy*length*0.45)
    c1 = (mid[0] + px*width, mid[1] + py*width)
    c2 = (mid[0] - px*width, mid[1] - py*width)
    return f"M{cx:.1f},{cy:.1f} Q{c1[0]:.1f},{c1[1]:.1f} {tip[0]:.1f},{tip[1]:.1f} Q{c2[0]:.1f},{c2[1]:.1f} {cx:.1f},{cy:.1f} Z"

def laurel_half(n=7, stem_len=230, start=(60,250), base_angle=-100, spread=46, growth=0.78):
    """Vertical stem (bottom to top) with alternating leaves, going up."""
    x0,y0 = start
    stem = f"M{x0:.1f},{y0:.1f} C{x0-4:.1f},{y0-stem_len*0.5:.1f} {x0+4:.1f},{y0-stem_len*0.8:.1f} {x0:.1f},{y0-stem_len:.1f}"
    leaves = []
    for i in range(n):
        t = i/(n-1)
        y = y0 - t*stem_len*0.94 - 6
        x = x0 + math.sin(t*3.0)*2
        side = -1 if i % 2 == 0 else 1
        ang = base_angle + side*spread*(1-t*0.35)
        ln = 34*(1-t*0.42)
        wd = 10*(1-t*0.3)
        leaves.append(leaf_path(x, y, ln, wd, ang))
    return stem, leaves

def hair_wave(width=760, height=520, n=6, seed=1):
    random.seed(seed)
    paths = []
    for i in range(n):
        amp = random.uniform(50, 110)
        phase = random.uniform(0, 6.28)
        freq = random.uniform(1.4, 2.0)
        x0 = 40 + i*(width-80)/(n-1)
        pts = []
        steps = 7
        for s in range(steps+1):
            y = s/steps*height
            x = x0 + amp*math.sin(freq*(y/height*3.14159) + phase)
            pts.append((x,y))
        d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f} "
        for j in range(1,len(pts)):
            x0p,y0p = pts[j-1]; x1,y1 = pts[j]
            cy = (y0p+y1)/2
            d += f"C{x0p:.1f},{cy:.1f} {x1:.1f},{cy:.1f} {x1:.1f},{y1:.1f} "
        paths.append(d)
    return paths

def spiral(cx, cy, turns=2.2, r0=2, r1=22, steps=60):
    pts = []
    for i in range(steps+1):
        t = i/steps
        ang = t*turns*2*math.pi
        r = r0 + (r1-r0)*t
        x = cx + r*math.cos(ang)
        y = cy + r*math.sin(ang)
        pts.append((x,y))
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x,y in pts)
    return d

def zigzag(x0,y0,x1,y1,n=5,amp=10):
    pts=[]
    length = n
    for i in range(n+1):
        t = i/n
        x = x0 + (x1-x0)*t
        y = y0 + (y1-y0)*t
        off = amp if i%2==0 else -amp
        pts.append((x+off,y))
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x,y in pts)
    return d

def wave(x0,y0,x1,y1,n=4,amp=8):
    pts=[]
    for i in range(n+1):
        t=i/n
        x=x0+(x1-x0)*t
        y=y0+(y1-y0)*t
        pts.append((x,y,amp if i%2==0 else -amp))
    d=f"M{pts[0][0]:.1f},{pts[0][1]:.1f} "
    for j in range(1,len(pts)):
        xa,ya,oa = pts[j-1]
        xb,yb,ob = pts[j]
        mx=(xa+xb)/2
        d += f"Q{mx:.1f},{ya+oa:.1f} {xb:.1f},{yb:.1f} "
    return d

if __name__ == "__main__":
    stem, leaves = laurel_half(n=7, stem_len=230, start=(60,250), base_angle=-100, spread=44)
    print("LAUREL STEM:", stem)
    for l in leaves:
        print("LEAF:", l)
    print()
    print("HAIR WAVES:")
    for p in hair_wave(n=7, seed=3):
        print(p)
    print()
    print("SPIRAL (curl icon):", spiral(30,30,turns=2.3,r0=2,r1=24))
    print("ZIGZAG (coil icon):", zigzag(6,10,6,70,n=6,amp=11))
    print("WAVE (wavy icon):", wave(6,40,54,40,n=4,amp=12))
