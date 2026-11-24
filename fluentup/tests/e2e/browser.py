# Real-browser end-to-end check (Playwright + Chromium). Run: python3 -m http.server 8099 & python3 tests/e2e/browser.py
import sys
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8099/'; fails = []; errs = []
def check(name, cond):
    print(('PASS ' if cond else 'FAIL ') + name); cond or fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']); ctx = b.new_context(viewport={'width': 390, 'height': 800}, permissions=['microphone']); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and 'config.js' not in m.text and '404' not in m.text and 'ERR_FAILED' not in m.text and errs.append(m.text))
    _click = pg.click
    def click(sel, **k): _click(sel, **k); pg.wait_for_timeout(120)
    pg.click = click
    pg.goto(URL); pg.wait_for_selector('#app h1'); txt = lambda: pg.inner_text('#app')
    pg.click('#obskip') if pg.query_selector('#obskip') else None
    check('home renders', 'Today' in txt())
    # conversations: count + play best path
    pg.click('nav button[data-t=speak]'); pg.wait_for_timeout(200)
    talk = pg.query_selector('button[data-sk=talk]') or pg.get_by_role('button', name='Talk'); talk.click(); pg.wait_for_timeout(200)
    n = len(pg.query_selector_all('button[data-cs]')); check(f'21 conversations listed ({n})', n == 21)
    pg.click('button[data-cs=c-doctor]'); pg.wait_for_timeout(100)
    for _ in range(3):
        pg.click('button[data-cc="0"]'); pg.wait_for_timeout(100)
    check('conversation finishes with a score', '100' in txt() or 'Rest well' in txt())
    # branching conversation: bad first choice routes to the recovery line
    pg.click('button[data-cback]'); pg.click('button[data-cs=c-roommate]'); pg.click('button[data-cc="1"]'); check('branch: insult leads to defensive reply', "not fair" in txt() or "That's not fair" in txt())
    pg.click('button[data-cback]')
    # listening: new C2 lesson present, plays through
    pg.click('button[data-sk=listen]') if pg.query_selector('button[data-sk=listen]') else pg.get_by_role('button', name='Listen').click(); pg.wait_for_timeout(150)
    check('listening has A1..C2 lessons', 'C2' in txt() and 'A1' in txt() and 'Asking the time' in txt())
    # speaking: real (fake-device) recording persists across reload
    (pg.query_selector('button[data-sk=speak]') or pg.get_by_role('button', name='Speak')).click(); pg.wait_for_timeout(150)
    pg.click('#rec'); pg.wait_for_timeout(1200)
    pg.click('#recstop'); pg.wait_for_timeout(600)
    check('recording appears', 'saved on this device' in txt())
    pg.reload(); pg.wait_for_selector('#app h1'); pg.click('nav button[data-t=speak]'); (pg.query_selector('button[data-sk=speak]') or pg.get_by_role('button', name='Speak')).click(); pg.wait_for_timeout(300)
    check('recording survives reload', 'saved on this device' in txt() and pg.query_selector('audio') is not None)
    # reading bookmark + history
    pg.click('nav button[data-t=library]'); pg.click('button[data-lm=reading]'); pg.wait_for_timeout(100)
    check('reading lessons listed A1..C2', all(l in txt() for l in ['A1 ·', 'C2 ·']))
    pg.click('button[data-ls=r-family]'); pg.click('button[data-lbm=r-family]'); check('bookmark toggles', 'Bookmarked' in txt())
    pg.click('button[data-lstart]')
    for _ in range(3):
        pg.click('button[data-lo="0"]'); pg.click('button[data-lnext]')
    check('reading score shown', 'correct' in txt()); pg.click('button[data-lback]')
    check('reading history shows completed lesson', 'Recently completed' in txt() and 'My family' in txt())
    pg.click('button[data-lbmf]'); check('bookmark filter lists the saved passage', 'My family' in txt() and 'The weather today' not in txt())
    pg.click('button[data-lm=professional]'); check('professional lessons expanded', 'Opening a presentation' in txt() or 'presentation' in txt().lower())
    # analytics
    pg.click('nav button[data-t=me]'); t = txt(); check('monthly + weekly analytics visible', 'Monthly' in t and 'Weekly' in t and 'Longest streak' in t)
    # dark mode + screenshot
    pg.click('[data-setk=th][data-setv=dark]'); pg.wait_for_timeout(200); check('dark theme applied', pg.evaluate("document.documentElement.dataset.theme") == 'dark')
    pg.screenshot(path='/tmp/me-dark.png', full_page=False)
    # persistence + offline
    pg.reload(); pg.wait_for_selector('#app h1'); pg.click('nav button[data-t=library]'); pg.click('button[data-lm=reading]'); check('history persists across reload (IndexedDB)', 'My family' in txt())
    pg.wait_for_timeout(800); ctx.set_offline(True); pg.reload(); pg.wait_for_selector('#app h1'); check('offline reload works', "Today's goal" in txt())
    # no horizontal overflow at mobile width
    check('no horizontal overflow', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    b.close()
print('console/page errors:', errs); sys.exit(1 if fails or errs else 0)
