# Browser check: export a backup, restore it into a fresh profile, reject a bad file. Run with a static server on :8099 (see docs/STATE.md).
import json, sys
from playwright.sync_api import sync_playwright
ok = True
def check(name, cond):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); c1 = b.new_context(accept_downloads=True); pg = c1.new_page(); pg.goto('http://localhost:8099/'); pg.wait_for_selector('#app h1')
    if pg.query_selector('#obskip'): pg.click('#obskip')
    pg.click('[data-t=review]'); pg.click('#show'); pg.click('[data-g="5"]'); pg.wait_for_timeout(200); pg.click('nav button[data-t=me]')
    with pg.expect_download() as dl: pg.click('#bkexp')
    dl.value.save_as('/tmp/fu-backup.json'); d = json.load(open('/tmp/fu-backup.json'))
    check('backup has cards and a reviewed card', len(d['cards']) > 100 and any(x['history'] for x in d['cards']))
    q = b.new_context().new_page(); q.goto('http://localhost:8099/'); q.wait_for_selector('#app h1')
    if q.query_selector('#obskip'): q.click('#obskip')
    q.click('nav button[data-t=me]'); q.set_input_files('#bkimp', '/tmp/fu-backup.json'); q.wait_for_selector('p.pill.ok')
    check('restore reports success', 'Restored' in q.inner_text('p.pill.ok'))
    q.set_input_files('#bkimp', files=[{'name': 'x.json', 'mimeType': 'application/json', 'buffer': b'{"hello":1}'}]); q.wait_for_selector('.warn')
    check('bad file rejected with message', 'not a FluentUp backup' in q.inner_text('.warn'))
    q.reload(); q.wait_for_selector('#app h1'); q.click('nav button[data-t=home]')
    check('restored progress survives reload', '1/5 reviews' in q.inner_text('#app'))
    b.close()
sys.exit(0 if ok else 1)
