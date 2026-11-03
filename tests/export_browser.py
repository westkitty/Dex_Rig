from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import re, shutil, sys
root=Path(__file__).resolve().parents[1]
html=re.sub(r'<script defer src="[^"]+"></script>','',(root/'index.html').read_text())
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True, **({'executable_path': shutil.which('chromium') or shutil.which('google-chrome')} if shutil.which('chromium') or shutil.which('google-chrome') else {}), args=['--no-sandbox'] if sys.platform.startswith('linux') else [])
 page=b.new_page(viewport={'width':1366,'height':900},accept_downloads=True)
 page.set_content(html);page.add_style_tag(content=(root/'styles.css').read_text())
 for name in ['engine.js','gif.js','studio.js']:page.add_script_tag(content=(root/name).read_text())
 page.wait_for_timeout(300)
 page.click('[data-tab="export"]')
 with page.expect_download(timeout=60000) as info:page.click('[data-export="gif"]')
 d=info.value;d.save_as(root/'tests'/'demo.gif')
 print('GIF notice',page.locator('#notice').inner_text())
 with page.expect_download(timeout=60000) as info:page.click('[data-export="sheet"]')
 d=info.value;d.save_as(root/'tests'/'spritesheet.png')
 print('sheet notice',page.locator('#notice').inner_text())
 b.close()
with Image.open(root/'tests'/'demo.gif') as g:
 print('GIF size',g.size,'frames',g.n_frames,'file bytes',(root/'tests'/'demo.gif').stat().st_size)
 first=g.convert('RGBA');g.seek(g.n_frames//2);mid=g.convert('RGBA')
 print('animated frames distinct',ImageChops.difference(first,mid).getbbox() is not None)
 assert g.n_frames>5 and ImageChops.difference(first,mid).getbbox() is not None
with Image.open(root/'tests'/'spritesheet.png') as im:
 print('Sheet',im.size,'RGBA alpha at corner',im.getpixel((0,0)))
 assert im.mode=='RGBA' and im.getpixel((0,0))[3]==0
