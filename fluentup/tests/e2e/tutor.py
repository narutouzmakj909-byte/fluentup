# Real-browser check of the AI Tutor screen (Playwright + Chromium). The Supabase Edge Function is STUBBED with page.route (no live backend here);
# everything else (Tutor client, session handling, IndexedDB history, UI) is the real code.
# Run: copy the project to a temp dir, add a config.js (SUPABASE_URL/ANON_KEY), serve it, then:  TUTOR_URL=http://localhost:8098/ python3 tests/e2e/tutor.py
import os, sys, json
from playwright.sync_api import sync_playwright
URL = os.environ.get('TUTOR_URL', 'http://localhost:8098/'); SHOTS = os.environ.get('SHOTS', ''); fails = []; errs = []; reqs = []
def check(name, cond):
    print(('PASS ' if cond else 'FAIL ') + name); cond or fails.append(name)
SESSION = json.dumps({'access_token': 'test-access-token', 'refresh_token': 'r', 'user': {'id': 'user-1', 'email': 'a@b.co'}, 'expires_at': 4102444800000})
mode = {'v': 'ok', 'delay': 0}
def handler(route):
    req = route.request; reqs.append(req)
    if req.method == 'OPTIONS': return route.fulfill(status=204, headers={'access-control-allow-origin': '*'})
    body = json.loads(req.post_data or '{}'); last = body['messages'][-1]['content']; h = {'access-control-allow-origin': '*', 'content-type': 'application/json'}
    if mode['delay']: import time; time.sleep(mode['delay'])
    if mode['v'] == '503': return route.fulfill(status=503, headers=h, body=json.dumps({'error': 'unavailable'}))
    if mode['v'] == '429': return route.fulfill(status=429, headers=h, body=json.dumps({'error': 'rate_limited'}))
    route.fulfill(status=200, headers=h, body=json.dumps({'reply': '**Incorrect:** ' + last + '\n**Correct:** I am going to school.\n\nWaa sax in aad isticmaasho:\n- am + going\n- is + going\n\n1. I am going\n2. She is going'}))
with sync_playwright() as p:
    b = p.chromium.launch()
    def new(scheme='light', w=390, h=800):
        ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=scheme, is_mobile=True, has_touch=False); ctx.add_init_script(f"localStorage.setItem('fluentup.session', JSON.stringify({SESSION}))")
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and not any(x in m.text for x in ('404', 'ERR_FAILED', 'Failed to load resource')) and errs.append(m.text))
        pg.route('**/functions/v1/tutor', handler); pg.route('**/rest/v1/**', lambda r: r.fulfill(status=200, body='[]', headers={'content-type': 'application/json'})); pg.route('**/auth/v1/**', lambda r: r.fulfill(status=400, body='{}'))
        pg.goto(URL); pg.wait_for_selector('#app h1'); pg.click('#obskip') if pg.query_selector('#obskip') else None; return ctx, pg
    ctx, pg = new()
    check('Home has an AI Tutor tile', pg.query_selector('button.tile[data-t=tutor]') is not None); check('top bar has the Tutor button', pg.query_selector('#tbTutor') is not None)
    pg.click('button.tile[data-t=tutor]'); pg.wait_for_selector('#tin'); pg.wait_for_timeout(500)
    check('welcome screen shows Somali heading and quick prompts', 'Ku soo dhawow NORA Tutor' in pg.inner_text('#app') and len(pg.query_selector_all('.tchips .chipb')) == 8)
    check('Send is disabled while empty', pg.is_disabled('#tsend')); check('Clear is disabled while empty', pg.is_disabled('[data-tclear]'))
    SHOTS and pg.screenshot(path=SHOTS + '/tutor-welcome-light.png')
    pg.click('.chipb[data-tchip="2"]'); pg.wait_for_timeout(100); check('chip fills the input and focuses it', pg.input_value('#tin') == 'Grammar-kayga sax: ' and pg.evaluate("document.activeElement.id") == 'tin'); check('chip did not call the backend', len(reqs) == 0)
    pg.fill('#tin', 'I am go to school'); check('Send enabled after typing', not pg.is_disabled('#tsend'))
    pg.press('#tin', 'Enter'); pg.wait_for_selector('.tm.a .tb strong'); pg.wait_for_timeout(300)
    check('Enter sent exactly one request with bearer token', len(reqs) == 1 and reqs[0].headers.get('authorization') == 'Bearer test-access-token'); sent = json.loads(reqs[0].post_data)
    check('request carries level, somaliLevel and the user message', sent['level'] in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2') and sent['somaliLevel'] == 'high' and sent['messages'] == [{'role': 'user', 'content': 'I am go to school'}])
    check('user and AI bubbles are rendered, AI markdown formatted', pg.query_selector('.tm.u .tb') is not None and pg.query_selector('.tm.a .tb ul li') is not None and pg.query_selector('.tm.a .tb ol li') is not None)
    check('composer cleared and keeps focus', pg.input_value('#tin') == '' and pg.evaluate("document.activeElement.id") == 'tin'); check('Clear now enabled', not pg.is_disabled('[data-tclear]'))
    SHOTS and pg.screenshot(path=SHOTS + '/tutor-chat-light.png')
    pg.press('#tin', 'Shift+Enter') if False else None
    pg.fill('#tin', 'line1'); pg.keyboard.press('Shift+Enter'); pg.keyboard.type('line2'); check('Shift+Enter makes a new line (not a send)', pg.input_value('#tin') == 'line1\nline2' and len(reqs) == 1)
    pg.fill('#tin', '')
    # persistence across reload (close and reopen)
    pg.reload(); pg.wait_for_selector('#app h1'); pg.click('#tbTutor'); pg.wait_for_selector('.tm'); check('history persisted after reload', 'I am go to school' in pg.inner_text('#tmsgs') and 'I am going to school' in pg.inner_text('#tmsgs'))
    # errors + retry
    mode['v'] = '503'; pg.fill('#tin', 'Where you live?'); pg.click('#tsend'); pg.wait_for_selector('.terr'); check('failure shows error and keeps the message with Retry', 'Where you live?' in pg.inner_text('#tmsgs') and 'Tutor-ku hadda lama heli karo' in pg.inner_text('.terr') and pg.query_selector('[data-tretry]') is not None)
    SHOTS and pg.screenshot(path=SHOTS + '/tutor-error-light.png'); n = len(reqs); mode['v'] = 'ok'; pg.click('[data-tretry]'); pg.wait_for_function("!document.querySelector('.terr')"); pg.wait_for_timeout(200)
    check('retry succeeded without duplicating the user message', len(reqs) == n + 1 and pg.inner_text('#tmsgs').count('Where you live?') >= 1 and len(pg.query_selector_all('.tm.u')) == 2)
    mode['v'] = '429'; pg.fill('#tin', 'again'); pg.click('#tsend'); pg.wait_for_selector('.terr'); check('rate limit message is shown', 'xadka' in pg.inner_text('.terr')); mode['v'] = 'ok'; pg.click('[data-tretry]'); pg.wait_for_function("!document.querySelector('.terr')")
    # offline
    ctx.set_offline(True); pg.wait_for_timeout(300); n = len(reqs); pg.fill('#tin', 'offline msg'); pg.click('#tsend'); pg.wait_for_selector('.terr'); check('offline: message kept, no request made, banner shown', len(reqs) == n and 'offline' in pg.inner_text('.terr').lower() and 'You are offline' in pg.inner_text('.tcomposer'))
    ctx.set_offline(False); pg.wait_for_timeout(300); pg.click('[data-tretry]'); pg.wait_for_function("!document.querySelector('.terr')"); check('back online: retry works', len(reqs) == n + 1)
    # duplicate prevention
    mode['delay'] = 0.6; n = len(reqs); pg.fill('#tin', 'double tap'); pg.click('#tsend'); pg.click('#tsend', force=True) if False else None; pg.keyboard.press('Enter'); pg.wait_for_selector('.typing'); check('typing indicator while waiting; Send disabled', pg.is_disabled('#tsend')); pg.wait_for_function("!document.querySelector('.typing')", timeout=8000); mode['delay'] = 0
    check('only one request for a double submit', len(reqs) == n + 1)
    # layout
    for w in (360, 390, 768):
        pg.set_viewport_size({'width': w, 'height': 780}); pg.wait_for_timeout(150); check(f'no horizontal overflow at {w}px', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
    pg.set_viewport_size({'width': 390, 'height': 800}); pg.wait_for_timeout(150); box = pg.eval_on_selector('.tbox', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, innerHeight] }'); nv = pg.eval_on_selector('nav', 'e => e.getBoundingClientRect().top')
    check('composer fully visible and above the floating nav', box[0] > 0 and box[1] <= nv + 1)
    # clear chat
    pg.click('[data-tclear]'); pg.wait_for_selector('.sheet.modal'); check('clear asks for confirmation', 'Clear chat' in pg.inner_text('.sheet')); pg.click('[data-sheet-act=no]'); pg.wait_for_timeout(100); check('cancel keeps the chat', len(pg.query_selector_all('.tm.u')) >= 2)
    pg.click('[data-tclear]'); pg.wait_for_selector('.sheet.modal'); pg.click('[data-sheet-act=yes]'); pg.wait_for_selector('.twelcome'); pg.reload(); pg.wait_for_selector('#app h1'); pg.click('#tbTutor'); pg.wait_for_selector('#tin'); pg.wait_for_timeout(300); check('cleared chat stays cleared after reload', pg.query_selector('.twelcome') is not None and pg.query_selector('.tm') is None)
    # existing navigation
    for t in ('library', 'speak', 'quiz', 'plan', 'me', 'home'):
        pg.click(f'nav button[data-t={t}]'); pg.wait_for_timeout(150); check(f'nav tab {t} still works', pg.query_selector('#tin') is None and len(pg.inner_text('#app')) > 20)
    pg.click('#tbTutor'); pg.wait_for_selector('#tin'); check('nav pill hidden on the tutor screen', pg.evaluate("document.querySelector('nav').classList.contains('nopill')")); pg.click('nav button[data-t=home]'); check('nav pill returns', not pg.evaluate("document.querySelector('nav').classList.contains('nopill')"))
    ctx.close()
    # dark theme + 360px
    mode['v'] = 'ok'; ctx, pg = new('dark', 360, 740); pg.click('#tbTutor'); pg.wait_for_selector('#tin'); pg.fill('#tin', 'Ii sharax tense-kan: present simple'); pg.press('#tin', 'Enter'); pg.wait_for_selector('.tm.a .tb strong'); pg.wait_for_timeout(500)
    SHOTS and pg.screenshot(path=SHOTS + '/tutor-chat-dark.png'); check('dark theme renders (system scheme)', pg.evaluate("matchMedia('(prefers-color-scheme: dark)').matches") and 'present simple' in pg.inner_text('#tmsgs'))
    bg = pg.eval_on_selector('.tm.a .tb', 'e => getComputedStyle(e).color'); check('AI bubble text is light in dark mode', bg.startswith('rgb(') and int(bg[4:].split(',')[0]) > 150)
    # explicit light theme chosen in Settings overrides system dark
    ctx.close()
    # signed out
    ctx = b.new_context(viewport={'width': 390, 'height': 800}); pg = ctx.new_page(); pg.route('**/rest/v1/**', lambda r: r.fulfill(status=200, body='[]')); pg.goto(URL); pg.wait_for_selector('#app h1'); pg.click('#obskip') if pg.query_selector('#obskip') else None; pg.click('#tbTutor'); pg.wait_for_timeout(200)
    check('signed out: asks to sign in, no chat box', 'Fadlan gal akoonkaaga' in pg.inner_text('#app') and pg.query_selector('#tin') is None); pg.click('#app [data-t=me]'); pg.wait_for_timeout(200); check('sign-in button leads to Account', 'Account' in pg.inner_text('#app'))
    ctx.close(); b.close()
check('no page errors / console errors', not errs)
if errs: print('ERRORS:', errs[:5])
print('FAILED:' if fails else 'ALL PASSED', fails); sys.exit(1 if fails else 0)
