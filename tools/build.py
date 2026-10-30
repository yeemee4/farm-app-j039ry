#!/usr/bin/env python3
"""src/ 를 합쳐 한 파일로 만든다.
   python3 tools/build.py          → test/index.html (시험용: 주황 ‘테스트’ 띠, 저장 공간 따로)
   python3 tools/build.py --prod   → index.html (본서버 = 실제 사용 주소)   [--no-tags]"""
import base64, glob, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda *p: os.path.join(ROOT, 'src', *p)
read = lambda p: open(p, encoding='utf-8').read()
# 입장 키 해시는 이미 배포된 index.html 에서 이어받는다(키 원문은 어디에도 두지 않음)
GATE = re.search(r'const GATE="([0-9a-f]{64})"', read(os.path.join(ROOT, 'index.html'))).group(1)
TAGS = '--no-tags' not in sys.argv          # 테스트 라벨(포스트잇) 기본 켜짐
PROD = '--prod' in sys.argv              # 기본은 시험용(test/)

icons = {os.path.basename(p)[:-4]: read(p).strip() for p in sorted(glob.glob(src('icons', '*.svg')))}
# 그림 아이콘(.png)이 있으면 .svg 보다 우선
polys = {os.path.basename(p)[:-4]: read(p).strip() for p in sorted(glob.glob(src('icons', 'poly', '*.svg')))}
cuts = {os.path.basename(p)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode() for p in sorted(glob.glob(src('icons', 'cut', '*.png')))}
imgs = {os.path.basename(p)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode() for p in sorted(glob.glob(src('icons', '*.png')))}

# PC 화면 설정(설정 › 화면 배치): 넓은 화면 규칙(@media min-width ≥700)을
#   자동 = 그대로 · 휴대폰(data-pc=off) = 끔 · PC(data-pc=on) = 창이 좁아도 켬
def pc_css(css):
    def pre(sel, cond):
        out = []
        for part in sel.split(','):
            q = part.strip()
            m = re.match(r'(html|:root)(?![\w-])', q)
            out.append(m.group(1) + ':where(%s)' % cond + q[len(m.group(1)):] if m else ':where(html%s) %s' % (cond, q))
        return ','.join(out)
    def rules(inner, cond):
        res, i = [], 0
        inner = re.sub(r'/\*.*?\*/', '', inner, flags=re.S)
        while True:
            a = inner.find('{', i)
            if a < 0: break
            sel = inner[i:a].strip(); b = inner.find('}', a)
            res.append(pre(sel, cond) + inner[a:b + 1]); i = b + 1
        return '\n'.join(res)
    out, i = [], 0
    for m in re.finditer(r'@media ?\(min-width:(\d+)px\)\{', css):
        if m.start() < i or int(m.group(1)) < 700: continue
        d, j = 1, m.end()
        while d:
            d += {'{': 1, '}': -1}.get(css[j], 0); j += 1
        inner = css[m.end():j - 1]
        assert '@' not in inner, inner[:80]
        out.append(css[i:m.start()] + m.group(0) + rules(inner, ':not([data-pc="off"])') + '}\n' + rules(inner, '[data-pc="on"]') + '\n')
        i = j
    return ''.join(out) + css[i:]
css = pc_css(''.join(read(p) for p in sorted(glob.glob(src('css', '*.css')))))
js = ''.join(read(p) for p in sorted(glob.glob(src('js', '*.js'))))
js = js.replace('%GATE%', GATE)
pre = 'const ICON_SVG=%s;\nconst ICON_IMG=%s;\nconst ICON_CUT=%s;\nconst ICON_POLY=%s;\nconst BUILD_TAGS=%s;\nconst ENV=%s;\nconst BUILD_AT=%s;\n' % (json.dumps(icons, ensure_ascii=False), json.dumps(imgs, ensure_ascii=False), json.dumps(cuts, ensure_ascii=False), json.dumps(polys, ensure_ascii=False), 'true' if TAGS else 'false', '"prod"' if PROD else '"test"', json.dumps(__import__('datetime').datetime.now(__import__('datetime').timezone(__import__('datetime').timedelta(hours=9))).strftime('%m-%d %H:%M')))

out = (read(src('head.html')) + read(src('meta.html')) + '<style>\n' + css + '</style>\n</head>\n<body>\n'
       + read(src('body.html')) + '<script>\n' + pre + js + '</script>\n</body>\n</html>\n')
def write(dest, html, depth):
    up = '../' * depth
    for f in ('manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png', 'icon-512.png', 'logo.png'):
        html = html.replace('href="%s"' % f, 'href="%s%s"' % (up, f)).replace('src="%s"' % f, 'src="%s%s"' % (up, f))
    os.makedirs(os.path.dirname(os.path.join(ROOT, dest)) or ROOT, exist_ok=True)
    open(os.path.join(ROOT, dest), 'w', encoding='utf-8').write(html)
base = '' if PROD else 'test/'
if not PROD:   # 시험용: 제목에 (테스트)
    out = re.sub(r'<title>(.*?)</title>', r'<title>\1 (테스트)</title>', out, count=1)
dest = base + 'index.html'
write(dest, out, 0 if PROD else 1)
# 별도 ‘초기 등록 앱’: 같은 코드·같은 저장 공간, 첫 화면 = 초기 등록, 메뉴 탭 없음
su = out.replace('const ENV=', 'const MODE="setup";\nconst ENV=', 1)
su = re.sub(r'<title>비담농장', '<title>비담농장 초기 등록', su, count=1)
write(base + 'setup/index.html', su, 1 if PROD else 2)
print('built', dest, '+', base + 'setup/index.html', len(out), 'bytes,', len(icons), 'svg +', len(imgs), 'png icons, tags', TAGS)
