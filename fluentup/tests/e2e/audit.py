# Visual/layout audit (Playwright). Run with the static server on :8099. Screenshots go to /tmp/shots.
import sys
from playwright.sync_api import sync_playwright
URL='http://localhost:8099/'; errs=[]; issues=[]
TABS=['home','library','speak','quiz','plan','me']
JS_SMALL="""()=>[...document.querySelectorAll('button,input:not([type=checkbox]),select,textarea,label.chip')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&s.visibility!=='hidden'&&!e.classList.contains('sr')&&(r.height<43.5||r.width<43.5)}).map(e=>e.tagName+'.'+e.className+'#'+e.id+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)).slice(0,8)"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for scheme in ['light','dark']:
        for w in [320,390,412]:
            ctx=b.new_context(viewport={'width':w,'height':820},color_scheme=scheme); pg=ctx.new_page()
            pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:m.type=='error' and '404' not in m.text and 'config.js' not in m.text and errs.append(m.text))
            pg.goto(URL); pg.wait_for_selector('#app h1'); pg.wait_for_timeout(500)
            for t in TABS:
                pg.click(f'nav [data-t={t}]'); pg.wait_for_timeout(700)
                ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
                if ov>0: issues.append(f'overflow {ov}px {scheme} {w} {t}')
                sm=pg.evaluate(JS_SMALL)
                if sm: issues.append(f'small targets {scheme} {w} {t}: {sm}')
                if w==390: pg.screenshot(path=f'/tmp/shots/{scheme}_{t}.png',full_page=False)
            ctx.close()
    b.close()
print('ISSUES:'); [print(' ',i) for i in sorted(set(issues))]; print('console errors:',errs)
