#!/usr/bin/env python3
"""Renders brand/src/social/*.svg to PNG cards in brand/mascot-v2 with Edge headless.

Run brand/src/vudu_v2.py first. The SVG is inlined into an HTML page that loads the
brand fonts (Space Grotesk, JetBrains Mono) so the PNG uses them even when they are
not installed. Set EDGE to override the browser path.
"""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SOCIAL = os.path.join(HERE, 'social')
OUT = os.path.normpath(os.path.join(HERE, '..', 'mascot-v2'))
EDGE = os.environ.get('EDGE', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')

PAGE = '''<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400&display=block" rel="stylesheet">
<style>html,body{margin:0;padding:0;overflow:hidden;background:#14111F}svg{display:block}</style>
</head><body>%s</body></html>'''

CARDS = (('social-preview', 1280, 640), ('og', 1200, 630))


def main():
    for name, w, h in CARDS:
        svg = open(os.path.join(SOCIAL, name + '.svg'), encoding='utf-8').read()
        svg = svg[svg.index('<svg'):]
        page = os.path.join(SOCIAL, name + '.html')
        with open(page, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(PAGE % svg)
        png = os.path.join(OUT, name + '.png')
        subprocess.run([EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        '--virtual-time-budget=8000', '--window-size=%d,%d' % (w, h),
                        '--screenshot=%s' % png, 'file:///' + page.replace('\\', '/')],
                       timeout=90, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(png, os.path.getsize(png))


if __name__ == '__main__':
    main()
