# Reduced-motion + keyboard checks (Playwright). Needs static server on :8099.
from playwright.sync_api import sync_playwright
res=[]; errs=[]
def check(n,c): res.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n)
with sync_playwright() as p:
    b=p.chromium.launch()
    # reduced motion
    ctx=b.new_context(viewport={'width':390,'height':800},reduced_motion='reduce'); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8099/'); pg.wait_for_selector('#app h1'); pg.click('#obskip'); pg.wait_for_timeout(300)
    check('reduced motion: entrance animation off', pg.evaluate("getComputedStyle(document.querySelector('main>*')).animationName")=='none')
    check('reduced motion: button transitions off', pg.evaluate("parseFloat(getComputedStyle(document.querySelector('button')).transitionDuration)")==0)
    check('reduced motion: aurora drift off', pg.evaluate("getComputedStyle(document.body,'::before').animationName")=='none')
    ctx.close()
    # keyboard
    ctx=b.new_context(viewport={'width':390,'height':800}); pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8099/'); pg.wait_for_selector('#app h1'); pg.click('#obskip'); pg.wait_for_timeout(300)
    pg.focus('nav [data-t=plan]'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    check('keyboard: Enter on nav button navigates', pg.evaluate("document.querySelector('nav [data-t=plan]').getAttribute('aria-current')")=='true')
    check('nav indicator moved to index 4', pg.evaluate("document.querySelector('nav').style.getPropertyValue('--i')")=='4')
    pg.keyboard.press('Tab'); ring=pg.evaluate("getComputedStyle(document.activeElement).outlineStyle"); check('focus-visible ring on keyboard focus', ring!='none')
    pg.fill('#al','X'); pg.click('#addAlarm'); pg.wait_for_timeout(300)
    pg.focus('[data-rm]'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    check('modal opens with role=dialog + aria-modal', pg.evaluate("(()=>{const d=document.querySelector('.sheet');return d&&d.getAttribute('role')==='dialog'&&d.getAttribute('aria-modal')==='true'})()"))
    check('focus moves into modal', pg.evaluate("!!document.activeElement.closest('.sheet')"))
    pg.keyboard.press('Tab'); pg.keyboard.press('Tab'); pg.keyboard.press('Tab'); check('Tab is trapped inside modal', pg.evaluate("!!document.activeElement.closest('.sheet')"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check('Escape closes modal and keeps the reminder', pg.locator('.sheet').count()==0 and pg.locator('[data-rm]').count()==1)
    check('focus returns to the trigger after close', pg.evaluate("document.activeElement.dataset.rm!==undefined"))
    pg.keyboard.press('Space') if False else None
    # all buttons have an accessible name
    nameless=pg.evaluate("[...document.querySelectorAll('button')].filter(b=>!(b.textContent.trim()||b.getAttribute('aria-label'))).length"); check('every button has an accessible name', nameless==0)
    b.close()
print('page errors',errs); print('FAILED:',[n for n,c in res if not c])
