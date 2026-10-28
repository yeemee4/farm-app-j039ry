#!/usr/bin/env python3
"""src/ 를 합쳐 index.html 한 파일로 만든다.  python3 tools/build.py [--no-tags]"""
import base64, glob, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda *p: os.path.join(ROOT, 'src', *p)
read = lambda p: open(p, encoding='utf-8').read()
# 입장 키 해시는 이미 배포된 index.html 에서 이어받는다(키 원문은 어디에도 두지 않음)
GATE = re.search(r'const GATE="([0-9a-f]{64})"', read(os.path.join(ROOT, 'index.html'))).group(1)
TAGS = '--no-tags' not in sys.argv          # 테스트 라벨(포스트잇) 기본 켜짐

icons = {os.path.basename(p)[:-4]: read(p).strip() for p in sorted(glob.glob(src('icons', '*.svg')))}
# 그림 아이콘(.png)이 있으면 .svg 보다 우선
cuts = {os.path.basename(p)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode() for p in sorted(glob.glob(src('icons', 'cut', '*.png')))}
imgs = {os.path.basename(p)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode() for p in sorted(glob.glob(src('icons', '*.png')))}
css = ''.join(read(p) for p in sorted(glob.glob(src('css', '*.css'))))
js = ''.join(read(p) for p in sorted(glob.glob(src('js', '*.js'))))
js = js.replace('%GATE%', GATE)
pre = 'const ICON_SVG=%s;\nconst ICON_IMG=%s;\nconst ICON_CUT=%s;\nconst BUILD_TAGS=%s;\n' % (json.dumps(icons, ensure_ascii=False), json.dumps(imgs, ensure_ascii=False), json.dumps(cuts, ensure_ascii=False), 'true' if TAGS else 'false')

out = (read(src('head.html')) + read(src('meta.html')) + '<style>\n' + css + '</style>\n</head>\n<body>\n'
       + read(src('body.html')) + '<script>\n' + pre + js + '</script>\n</body>\n</html>\n')
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(out)
print('built index.html', len(out), 'bytes,', len(icons), 'svg +', len(imgs), 'png icons, tags', TAGS)
