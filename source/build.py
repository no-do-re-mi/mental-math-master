# Inline engine.js into index.src.html -> index.html (one self-contained file).
#   python3 build.py            local build: Google-hosted fonts, tester tools on ?dev
#   python3 build.py --public   ../index.html: fonts served from the site, no tester tools
import re
import sys

src = open('index.src.html').read()
eng = open('engine.js').read()
assert '/*ENGINE*/' in src
html = src.replace('/*ENGINE*/', eng)

if '--public' in sys.argv:
    # Fonts come from the site itself, so a child's visit never calls Google.
    fonts = re.search(r'<link rel="preconnect" href="https://fonts.googleapis.com">.*?display=swap" rel="stylesheet">', html, re.S)
    assert fonts, 'font links not found'
    face = lambda fam, w, f: (f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;"
                              f"src:url(fonts/{f}.woff2) format('woff2')}}")
    html = html.replace(fonts.group(0), '<style>' + face('Atkinson Hyperlegible', 400, 'atkinson-hyperlegible-400')
                        + face('Atkinson Hyperlegible', 700, 'atkinson-hyperlegible-700')
                        + face('Patrick Hand', 400, 'patrick-hand-400') + '</style>')
    # No tester tools on the public site, whatever the address says.
    dev = "const DEV = new URLSearchParams(location.search).has('dev');"
    assert dev in html
    html = html.replace(dev, 'const DEV = false;')
    assert 'googleapis' not in html and 'gstatic' not in html
    open('../index.html', 'w').write(html)
    print('built ../index.html', len(html), 'bytes (public)')
else:
    open('index.html', 'w').write(html)
    print('built index.html', len(html), 'bytes')
