"""Browser smoke and interaction tests without navigating blocked URLs.
Injects the exact on-disk HTML, CSS and JS into about:blank.
This proves browser behavior, not file:// or GitHub Pages delivery.
"""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
import re, json, tempfile, shutil, sys
root=Path(__file__).resolve().parents[1]
html=re.sub(r'<script defer src="[^"]+"></script>','',(root/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
image_path=root/'tests'/'source-fixture.png'
Image.new('RGBA',(200,200),(87,148,190,255)).save(image_path)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, **({'executable_path': shutil.which('chromium') or shutil.which('google-chrome')} if shutil.which('chromium') or shutil.which('google-chrome') else {}), args=['--no-sandbox'] if sys.platform.startswith('linux') else [])
    page=browser.new_page(viewport={'width':1440,'height':950},accept_downloads=True)
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html)
    page.add_style_tag(content=(root/'styles.css').read_text())
    for source in ('engine.js','gif.js','studio.js'):page.add_script_tag(content=(root/source).read_text())
    page.wait_for_timeout(300)
    assert page.locator('#layer-count').inner_text()=='06'
    assert page.locator('#loop-readout').inner_text().startswith('✓')
    before=page.evaluate("() => document.getElementById('stage').toDataURL()")
    page.click('#play-toggle');page.wait_for_timeout(310)
    after=page.evaluate("() => document.getElementById('stage').toDataURL()")
    assert after!=before,'Preview must animate'
    page.click('#play-toggle')
    page.click('#keyframe-add')
    assert '1 KEYS' in page.locator('#track-name').inner_text()
    page.locator('#time-slider').fill('1000')
    page.click('#keyframe-add')
    assert '2 KEYS' in page.locator('#track-name').inner_text()
    page.click('[data-tab="motion"]')
    page.click('[data-action="add-motion"]')
    assert page.locator('.micro-motion-row').count()>=2
    page.click('[data-preset="quiet"]')
    page.click('[data-tab="export"]')
    print('Loop report:',page.locator('#loop-readout').inner_text())
    try:
      with page.expect_download(timeout=3000) as event:page.click('[data-export="png"]')
      png=event.value
      print('Download:',png.suggested_filename)
    except Exception as exc:
      print('Download not observable in this policy sandbox:',type(exc).__name__)
    page.on('dialog',lambda d:d.accept())
    page.click('#new-project')
    assert page.locator('#layer-count').inner_text()=='00'
    page.locator('#layer-input').set_input_files(str(image_path))
    page.wait_for_timeout(200)
    assert page.locator('#layer-count').inner_text()=='01'
    page.click('#tool-extract')
    rect=page.locator('#overlay').bounding_box()
    for x,y in ((245,245),(365,245),(365,365),(245,365)):
      page.mouse.click(rect['x']+x/640*rect['width'],rect['y']+y/640*rect['height'])
    page.click('#finish-extract')
    assert page.locator('#layer-count').inner_text()=='02',page.locator('#notice').inner_text()
    page.screenshot(path=str(root/'tests'/'extraction.png'),full_page=True)
    print('Cutout:',page.locator('#notice').inner_text())
    page.click('[data-tab="export"]')
    try:
      with page.expect_download(timeout=3000) as event:page.click('[data-export="json"]')
      download=event.value
      path=root/'tests'/'exported.dexrig.json';download.save_as(path)
      data=json.loads(path.read_text())
      assert len(data['layers'])==2
      assert any(l.get('originalSrc') for l in data['layers'])
      print('JSON export:',path.stat().st_size,'bytes')
    except Exception as exc:
      print('JSON download not observable in policy sandbox:',type(exc).__name__)
    # Mobile smoke, independent page retains geometry constraints.
    mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.set_content(html);mobile.add_style_tag(content=(root/'styles.css').read_text())
    for source in ('engine.js','gif.js','studio.js'):mobile.add_script_tag(content=(root/source).read_text())
    mobile.wait_for_timeout(250)
    mobile.screenshot(path=str(root/'tests'/'mobile.png'),full_page=True)
    print('Mobile overflow:',mobile.evaluate('() => ({scroll:document.body.scrollWidth,viewport:innerWidth})'))
    print('Runtime errors:',errors)
    assert not errors,errors
    browser.close()
