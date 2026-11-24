import sys,os
from playwright.sync_api import sync_playwright
scheme=sys.argv[1]; out=f'/tmp/shots/s_{scheme}'; os.makedirs(out,exist_ok=True); errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(viewport={'width':390,'height':800},color_scheme=scheme).new_page()
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:m.type=='error' and '404' not in m.text and 'config.js' not in m.text and errs.append(m.text))
    def shot(n): pg.wait_for_timeout(800); pg.screenshot(path=f'{out}/{n}.png')
    def tc(sel,i=0):
        try: pg.locator(sel).nth(i).click(timeout=700); pg.wait_for_timeout(200); return True
        except: print('skip',sel); return False
    pg.goto('http://localhost:8099/'); pg.wait_for_selector('#app h1'); pg.click('#obskip')
    pg.click('nav [data-t=library]'); tc('[data-lm=grammar]')
    n=min(pg.locator('[data-ls]').count(),6)
    for i in range(n):                       # find a lesson that starts with a multiple-choice exercise
        tc('[data-ls]',i); tc('[data-lstart]')
        if pg.locator('[data-lo]').count(): break
        tc('[data-lback]'); tc('[data-lback]')
    tc('[data-lo]',0); shot('1_lesson_feedback'); tc('[data-lnext]')
    pg.click('nav [data-t=library]'); tc('[data-lback]'); tc('[data-lm=reading]'); tc('[data-ls]'); shot('2_reading_intro')
    pg.click('nav [data-t=speak]'); tc('[data-sk=write]'); tc('[data-wopen]'); pg.fill('#wtext','i go to school yesterday and it were fun'); tc('#wcheck'); shot('3_writing_feedback')
    pg.click('nav [data-t=speak]'); tc('[data-sk=talk]'); tc('[data-cs]'); 
    for _ in range(4):
        if not tc('[data-cc]'): break
    shot('4_conversation_end')
    pg.click('nav [data-t=speak]'); tc('[data-sk=listen]'); tc('[data-lnopen]'); tc('[data-lnq]'); shot('5_listen_questions')
    pg.click('nav [data-t=quiz]'); tc('#start')
    for _ in range(5):
        if pg.locator('[data-o]').count(): pg.locator('[data-o]').first.click(no_wait_after=True); pg.wait_for_timeout(700)
        elif pg.locator('#fill').count(): pg.fill('#fill','x'); pg.click('#submit',no_wait_after=True); pg.wait_for_timeout(700)
    shot('6_quiz_result')
    pg.click('nav [data-t=plan]'); tc('[data-ch]',0); pg.evaluate('scrollTo(0,520)'); shot('7_plan_challenge')
    pg.click('nav [data-t=me]'); pg.evaluate('scrollTo(0,1500)'); shot('8_me_mistakes')
    b.close()
print('errors',errs)
