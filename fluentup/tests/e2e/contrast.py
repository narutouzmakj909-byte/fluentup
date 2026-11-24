# Measures WCAG contrast of rendered text against the actual rendered backdrop (text hidden, pixels sampled). Needs server on :8099.
import sys, io, statistics
from playwright.sync_api import sync_playwright
from PIL import Image
COLLECT="""()=>{const out=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.textContent.trim();if(!t)continue;const e=n.parentElement;if(!e||e.closest('script,style,noscript,.sr,svg'))continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none')continue;const r=document.createRange();r.selectNodeContents(n);const b=r.getBoundingClientRect();if(b.width<2||b.height<2||b.bottom<0||b.top>innerHeight)continue;const hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);if(hit&&!e.contains(hit)&&!hit.contains(e))continue;let op=1,p=e;while(p){op*=+getComputedStyle(p).opacity;p=p.parentElement}out.push({t:t.slice(0,28),c:cs.color,fs:parseFloat(cs.fontSize),fw:+cs.fontWeight,op,x:b.left,y:b.top,w:b.width,h:b.height})}return out}"""
def lum(c):
    f=lambda v:(v/255/12.92) if v/255<=.03928 else (((v/255)+.055)/1.055)**2.4
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])
def cr(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+.05)/(min(la,lb)+.05)
def parse(c):
    v=[float(x) for x in c[c.index('(')+1:-1].replace('/',',').split(',') if x.strip()] if ',' in c else [float(x) for x in c[c.index('(')+1:-1].replace('/',' ').split()]
    return v[:3],(v[3] if len(v)>3 else 1)
bad=[]; total=0
def measure(pg,label):
    global total
    pg.wait_for_timeout(1100); items=pg.evaluate(COLLECT)
    pg.add_style_tag(content='*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}svg{opacity:0!important}')
    pg.wait_for_timeout(250); img=Image.open(io.BytesIO(pg.screenshot())).convert('RGB'); pg.evaluate("document.querySelectorAll('style').forEach(s=>{if(s.textContent.startsWith('*{color:transparent'))s.remove()})")
    W,H=img.size
    for it in items:
        x0,y0,x1,y1=[int(v) for v in (it['x'],it['y'],it['x']+it['w'],it['y']+it['h'])]
        px=[img.getpixel((min(W-1,max(0,x)),min(H-1,max(0,y)))) for x in range(x0,x1,max(1,(x1-x0)//8)) for y in range(y0,y1,max(1,(y1-y0)//3))]
        if not px: continue
        bg=tuple(int(statistics.median(p[i] for p in px)) for i in range(3)); fg,a=parse(it['c']); a*=it['op']
        fgb=[fg[i]*a+bg[i]*(1-a) for i in range(3)]; r=cr(fgb,bg); total+=1
        large=it['fs']>=24 or (it['fs']>=18.66 and it['fw']>=700); need=3 if large else 4.5
        if r<need: bad.append((round(r,2),need,label,it['t'],round(it['fs']),bg))
with sync_playwright() as p:
    b=p.chromium.launch()
    for scheme in ['light','dark']:
        ctx=b.new_context(viewport={'width':390,'height':800},color_scheme=scheme); pg=ctx.new_page(); pg.goto('http://localhost:8099/'); pg.wait_for_selector('#app h1'); pg.wait_for_timeout(500)
        measure(pg,scheme+' onboarding'); pg.click('#obsave'); pg.wait_for_timeout(300); measure(pg,scheme+' home')
        for t in ['library','speak','quiz','plan','me']:
            pg.click(f'nav [data-t={t}]'); pg.wait_for_timeout(700); measure(pg,f'{scheme} {t}')
        pg.click('nav [data-t=library]'); pg.wait_for_timeout(300); pg.click('[data-open]'); pg.wait_for_timeout(500); measure(pg,scheme+' detail')
        pg.click('nav [data-t=home]'); pg.click('.cta'); pg.wait_for_timeout(400); pg.click('#show'); pg.wait_for_timeout(500); measure(pg,scheme+' review')
        ctx.close()
    b.close()
print('text runs measured:',total); seen=set()
for r in sorted(bad):
    k=(r[2],r[3])
    if k in seen: continue
    seen.add(k); print(r)
print('FAILING runs:',len(bad),'unique',len(seen))
