# Captures every major screen state to /tmp/shots/<scheme>/<name>.png (390px). Requires static server on :8099.
import sys, os
from playwright.sync_api import sync_playwright
scheme = sys.argv[1] if len(sys.argv) > 1 else 'light'
out = f'/tmp/shots/{scheme}'; os.makedirs(out, exist_ok=True); errs = []
def run():
  with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, color_scheme=scheme, permissions=['microphone']); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and '404' not in m.text and 'config.js' not in m.text and errs.append(m.text))
    def shot(n): pg.wait_for_timeout(650); pg.screenshot(path=f'{out}/{n}.png')
    def tryc(sel, n=0):
      try: pg.locator(sel).nth(n).click(timeout=2500); pg.wait_for_timeout(250); return True
      except Exception as e: print('skip', sel); return False
    pg.goto('http://localhost:8099/'); pg.wait_for_selector('#app h1'); shot('01_onboarding')
    pg.fill('#obn', 'Amina'); pg.click('#obsave'); pg.wait_for_timeout(300); shot('02_home'); pg.evaluate('scrollTo(0,700)'); shot('03_home_scrolled'); pg.evaluate('scrollTo(0,0)')
    # review
    pg.click('.cta'); pg.wait_for_timeout(300); shot('04_review_front'); tryc('#show'); shot('05_review_back')
    tryc('.grades button', 3); pg.wait_for_timeout(300)
    # library
    pg.click('nav [data-t=library]'); shot('06_library_vocab'); tryc('[data-open]'); shot('07_word_detail'); tryc('[data-bm]'); tryc('[data-back]')
    tryc('[data-lm=grammar]'); shot('08_grammar_list'); tryc('[data-ls]'); shot('09_lesson_intro'); tryc('[data-lstart]'); shot('10_lesson_q'); tryc('[data-lo]', 0); shot('11_lesson_feedback'); tryc('[data-lnext]')
    tryc('[data-lback]'); tryc('[data-lback]')
    tryc('[data-lm=reading]'); shot('12_reading_list'); tryc('[data-ls]'); shot('13_reading_intro')
    pg.click('nav [data-t=library]'); tryc('[data-lm=professional]'); shot('14_professional'); tryc('[data-lm=search]'); pg.fill('#gq', 'book'); shot('15_search')
    # skills
    pg.click('nav [data-t=speak]'); shot('16_skills_talk'); tryc('[data-cs]'); shot('17_conversation')
    pg.click('nav [data-t=speak]'); tryc('[data-sk=listen]'); shot('18_listen_list'); tryc('[data-lnopen]'); shot('19_listen_player')
    pg.click('nav [data-t=speak]'); tryc('[data-sk=speak]'); shot('20_speaking'); tryc('#rec'); pg.wait_for_timeout(900); shot('21_recording'); tryc('#recstop'); shot('22_recorded')
    pg.click('nav [data-t=speak]'); tryc('[data-sk=write]'); shot('23_writing_list')
    # quiz
    pg.click('nav [data-t=quiz]'); shot('24_quiz_start'); tryc('#start'); shot('25_quiz_q')
    for _ in range(5):
      if not tryc('.card .opt, [data-qa]'): break
    shot('26_quiz_result')
    # plan
    pg.click('nav [data-t=plan]'); shot('27_plan'); pg.evaluate('scrollTo(0,650)'); shot('28_plan_mid'); pg.evaluate('scrollTo(0,1400)'); shot('29_plan_low')
    pg.evaluate('scrollTo(0,0)'); tryc('[data-ch]', 0); pg.wait_for_timeout(300); pg.fill('#al', 'Evening'); tryc('#addAlarm'); pg.evaluate('scrollTo(0,1200)'); shot('30_plan_alarm_challenge')
    tryc('[data-rm]'); shot('31_confirm_sheet'); tryc('[data-sheet-act=no]')
    # me
    pg.click('nav [data-t=me]'); shot('32_me'); pg.evaluate('scrollTo(0,900)'); shot('33_me_mid'); pg.evaluate('scrollTo(0,2200)'); shot('34_me_low'); pg.evaluate('scrollTo(0,99999)'); shot('35_me_settings')
    b.close()
run(); print('errors', errs)
