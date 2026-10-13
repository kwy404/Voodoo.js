#!/usr/bin/env python3
"""Generator for the Vudu v2 mascot set.

Every pose is assembled from the same parts (pins, head, body, charm), so the
anatomy stays identical between files. Run from anywhere:

    python brand/src/vudu_v2.py            # writes brand/mascot-v2/*.svg
    python brand/src/vudu_v2.py --concepts DIR   # writes the concept sheet SVGs

The output is plain SVG with no external references.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'mascot-v2'))

# Brand palette (see brand/README.md). INK is the sticker outline.
INK = '#1b1033'
PURPLE = '#6D3BF5'
PURPLE_LIGHT = '#9B7BFF'
MAGENTA = '#FF3D8B'
AMBER = '#FFB35C'
MINT = '#2ED9A5'
CREAM = '#FBF7F2'
SAND = '#EDE4D8'

OUTLINE = 9       # sticker outline, drawn outside every fill
RIM = 8           # light rim used by the dark background variant

CONCEPTS = {
    # A: cream muslin doll, dark pendant with amber braces
    'cream': dict(base=CREAM, shade='#E6DACA', deep='#D3C3AE', stitch=PURPLE,
                  charm_bg=INK, charm_fg=AMBER, pins=(PURPLE, MAGENTA, MINT),
                  blush=MAGENTA, blush_op=0.30),
    # B: purple felt doll, amber pendant with ink braces
    'purple': dict(base=PURPLE_LIGHT, shade='#7F57FA', deep=PURPLE, stitch=CREAM,
                   charm_bg=AMBER, charm_fg=INK, pins=(MAGENTA, AMBER, MINT),
                   blush=MAGENTA, blush_op=0.55),
}


def f(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def attrs(d):
    return ' '.join('%s="%s"' % (k.replace('_', '-'), v) for k, v in d.items())


class Shape:
    """A filled silhouette part. Gets the sticker outline and optional shade."""

    def __init__(self, tag, geom, fill, shade=None, shade_off=(16, -14), outline=OUTLINE):
        self.tag, self.geom, self.fill = tag, geom, fill
        self.shade, self.shade_off, self.outline = shade, shade_off, outline

    def el(self, extra):
        return '<%s %s %s/>' % (self.tag, attrs(self.geom), attrs(extra))


class Line:
    """A stroked part (arms, needles)."""

    def __init__(self, d, width, color, outline=OUTLINE):
        self.d, self.width, self.color, self.outline = d, width, color, outline

    def el(self, color, width):
        return '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (
            self.d, color, f(width))


class Layer:
    def __init__(self, parts, details=(), transform=None, cls=None):
        self.parts, self.details = list(parts), list(details)
        self.transform, self.cls = transform, cls


class Doc:
    def __init__(self, prefix):
        self.prefix = prefix
        self.defs = []
        self.n = 0

    def uid(self, name):
        self.n += 1
        return '%s%s%d' % (self.prefix, name, self.n)


def outline_of(p, color, extra):
    if isinstance(p, Shape):
        return p.el({'fill': color, 'stroke': color, 'stroke-width': f(2 * (p.outline + extra)), 'stroke-linejoin': 'round'})
    return p.el(color, p.width + 2 * (p.outline + extra))


def fill_of(p, doc):
    if isinstance(p, Line):
        return p.el(p.color, p.width)
    if not p.shade:
        return p.el({'fill': p.fill})
    cid = doc.uid('clip')
    doc.defs.append('<clipPath id="%s">%s</clipPath>' % (cid, p.el({})))
    dx, dy = p.shade_off
    return '%s<g clip-path="url(#%s)">%s</g>' % (
        p.el({'fill': p.shade}), cid, p.el({'fill': p.fill, 'transform': 'translate(%s %s)' % (f(dx), f(dy))}))


def wrap(inner, transform=None, cls=None):
    a = {}
    if transform:
        a['transform'] = transform
    if cls:
        a['class'] = cls
    if not a:
        return inner
    return '<g %s>%s</g>' % (attrs(a), inner)


def render_layers(layers, doc, rim=None):
    out = []
    if rim:
        rim_parts = []
        for L in layers:
            rim_parts.append(wrap(''.join(outline_of(p, rim, RIM) for p in L.parts), L.transform, L.cls))
        out.append('<g>%s</g>' % ''.join(rim_parts))
    for L in layers:
        body = ''.join(outline_of(p, INK, 0) for p in L.parts)
        body += ''.join(fill_of(p, doc) for p in L.parts)
        body += ''.join(L.details)
        out.append(wrap(body, L.transform, L.cls))
    return '\n'.join(out)


# ---------------------------------------------------------------- geometry

HEAD_D = 'M256 92 C350 92 404 144 404 216 C404 290 344 334 256 334 C168 334 108 290 108 216 C108 144 162 92 256 92 Z'
TORSO_D = 'M200 306 C190 342 180 384 184 414 C188 444 222 452 256 452 C290 452 324 444 328 414 C332 384 322 342 312 306 Z'
HEAD_CX, HEAD_CY = 256, 216
NECK = (256, 330)


def brace_path(x, cy, w, h, right=False):
    """A curly brace as a stroke path. x is the pointed side for '{'."""
    s = -1 if right else 1
    t, b = cy - h / 2, cy + h / 2
    xa = x + s * w          # open ends
    xm = x + s * w * 0.42   # spine
    return ('M{xa} {t} Q{xm} {t} {xm} {t2} L{xm} {c1} Q{xm} {cy} {x} {cy} '
            'Q{xm} {cy} {xm} {c2} L{xm} {b2} Q{xm} {b} {xa} {b}').format(
        xa=f(xa), xm=f(xm), x=f(x), t=f(t), b=f(b), cy=f(cy),
        t2=f(t + h * 0.2), c1=f(cy - h * 0.13), c2=f(cy + h * 0.13), b2=f(b - h * 0.2))


def sparkle(cx, cy, r, color, op=1.0):
    k = r * 0.26
    d = ('M{x} {t} C{x} {a} {b} {y} {r_} {y} C{b} {y} {x} {c} {x} {bo} '
         'C{x} {c} {d_} {y} {l} {y} C{d_} {y} {x} {a} {x} {t} Z').format(
        x=f(cx), y=f(cy), t=f(cy - r), bo=f(cy + r), l=f(cx - r), r_=f(cx + r),
        a=f(cy - k), c=f(cy + k), b=f(cx + k), d_=f(cx - k))
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="4" stroke-linejoin="round" opacity="%s"/>' % (
        d, color, INK, f(op)) if op >= 1 else '<path d="%s" fill="%s" opacity="%s"/>' % (d, color, f(op))


def pin_parts(base, angle, length, color, flag_side=1):
    """A sewing pin stuck in the head with a pennant flag (a little directive)."""
    a = math.radians(angle)
    ux, uy = math.sin(a), -math.cos(a)
    nx, ny = math.cos(a) * flag_side, math.sin(a) * flag_side
    bx, by = base
    tx, ty = bx + ux * length, by + uy * length
    needle = Line('M%s %s L%s %s' % (f(bx), f(by), f(tx), f(ty)), 6, SAND, outline=5)
    p1 = (bx + ux * (length - 13), by + uy * (length - 13))
    p2 = (bx + ux * (length - 43), by + uy * (length - 43))
    mid = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
    tip = (mid[0] + nx * 38 - ux * 3, mid[1] + ny * 38 - uy * 3)
    c1 = ((p1[0] + tip[0]) / 2 + ux * 5, (p1[1] + tip[1]) / 2 + uy * 5)
    c2 = ((p2[0] + tip[0]) / 2 + ux * 5, (p2[1] + tip[1]) / 2 + uy * 5)
    flag_d = 'M%s %s Q%s %s %s %s Q%s %s %s %s Z' % (
        f(p1[0]), f(p1[1]), f(c1[0]), f(c1[1]), f(tip[0]), f(tip[1]), f(c2[0]), f(c2[1]), f(p2[0]), f(p2[1]))
    flag = Shape('path', {'d': flag_d}, color, outline=5)
    ball = Shape('circle', {'cx': f(tx), 'cy': f(ty), 'r': '11'}, color, outline=5)
    shine = '<circle cx="%s" cy="%s" r="3.6" fill="%s" opacity="0.9"/>' % (f(tx - 3.5), f(ty - 3.5), CREAM)
    return [needle, flag, ball], [shine]


# ---------------------------------------------------------------- face

def eyes(style, look=(0, 0), C=None):
    lx, rx, cy = 200, 312, 222
    dx, dy = look
    out = []
    if style in ('open', 'sad', 'look'):
        for cx in (lx, rx):
            ex, ey = cx + dx, cy + dy
            out.append('<ellipse cx="%s" cy="%s" rx="27" ry="34" fill="%s"/>' % (f(ex), f(ey), INK))
            out.append('<circle cx="%s" cy="%s" r="10.5" fill="#FFFFFF"/>' % (f(ex + 8), f(ey - 13)))
            out.append('<circle cx="%s" cy="%s" r="4.5" fill="#FFFFFF" opacity="0.85"/>' % (f(ex - 9), f(ey + 13)))
        if style == 'sad':
            out.append('<path d="M168 178 Q186 170 210 166" fill="none" stroke="%s" stroke-width="8" stroke-linecap="round"/>' % INK)
            out.append('<path d="M344 178 Q326 170 302 166" fill="none" stroke="%s" stroke-width="8" stroke-linecap="round"/>' % INK)
    elif style == 'happy':
        for cx in (lx, rx):
            out.append('<path d="M%s %s Q%s %s %s %s" fill="none" stroke="%s" stroke-width="10" stroke-linecap="round"/>' % (
                f(cx - 24), f(cy + 10), f(cx), f(cy - 26), f(cx + 24), f(cy + 10), INK))
    elif style == 'closed':
        for cx in (lx, rx):
            out.append('<path d="M%s %s Q%s %s %s %s" fill="none" stroke="%s" stroke-width="9" stroke-linecap="round"/>' % (
                f(cx - 24), f(cy + 4), f(cx), f(cy + 22), f(cx + 24), f(cy + 4), INK))
    return out


def mouth(style, C):
    o = []
    if style == 'smile':
        o.append('<path d="M232 270 Q256 292 280 270" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % INK)
        for x, y in ((242, 272), (256, 279), (270, 272)):
            o.append('<path d="M%s %s L%s %s" stroke="%s" stroke-width="4.5" stroke-linecap="round"/>' % (
                f(x), f(y - 8), f(x), f(y + 8), INK))
    elif style == 'open':
        o.append('<path d="M228 266 Q256 266 284 266 Q282 300 256 302 Q230 300 228 266 Z" fill="%s" stroke="%s" stroke-width="6" stroke-linejoin="round"/>' % (INK, INK))
        o.append('<path d="M240 292 Q256 280 272 292 Q264 300 256 300 Q248 300 240 292 Z" fill="%s"/>' % MAGENTA)
    elif style == 'frown':
        o.append('<path d="M234 290 Q256 270 278 290" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % INK)
        for x, y in ((244, 284), (256, 280), (268, 284)):
            o.append('<path d="M%s %s L%s %s" stroke="%s" stroke-width="4.5" stroke-linecap="round"/>' % (
                f(x), f(y - 8), f(x), f(y + 8), INK))
    elif style == 'hmm':
        o.append('<path d="M240 282 Q252 274 262 280 Q272 286 280 276" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % INK)
    elif style == 'sleep':
        o.append('<ellipse cx="256" cy="282" rx="9" ry="11" fill="%s"/>' % INK)
    return o


def cheeks(C, op_mul=1.0):
    return ['<ellipse cx="%d" cy="268" rx="22" ry="13" fill="%s" opacity="%s"/>' % (x, C['blush'], f(C['blush_op'] * op_mul))
            for x in (158, 354)]


def head_details(C):
    """Stitched seam along the left of the head and a tiny cross stitch."""
    d = []
    d.append('<path d="M150 150 C132 180 128 222 140 262" fill="none" stroke="%s" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 11" opacity="0.9"/>' % C['stitch'])
    d.append('<g stroke="%s" stroke-width="5" stroke-linecap="round" opacity="0.9"><path d="M352 130 L366 144"/><path d="M366 130 L352 144"/></g>' % C['stitch'])
    return d


def charm(C, glow_id, cy=380):
    d = []
    d.append('<circle cx="256" cy="%s" r="62" fill="url(#%s)"/>' % (f(cy), glow_id))
    d.append('<path d="M226 334 Q240 352 256 %s Q272 352 286 334" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (f(cy - 26), INK))
    d.append('<rect x="227" y="%s" width="58" height="50" rx="16" fill="%s" stroke="%s" stroke-width="6"/>' % (f(cy - 25), C['charm_bg'], INK))
    for right, x in ((False, 237), (True, 275)):
        d.append('<path d="%s" fill="none" stroke="%s" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>' % (
            brace_path(x, cy, 12, 30, right), C['charm_fg']))
    return d


def glow_def(gid, cy=380):
    return ('<radialGradient id="%s" cx="256" cy="%s" r="62" gradientUnits="userSpaceOnUse">'
            '<stop offset="0" stop-color="%s" stop-opacity="0.95"/><stop offset="0.5" stop-color="%s" stop-opacity="0.38"/>'
            '<stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient>') % (gid, f(cy), AMBER, AMBER, AMBER)


# ---------------------------------------------------------------- poses

POSES = {
    'main':     dict(arms=('down', 'down'), eyes='open', mouth='smile', tilt=0),
    'wave':     dict(arms=('down', 'up'), eyes='open', mouth='open', tilt=4),
    'happy':    dict(arms=('up', 'up'), eyes='happy', mouth='open', tilt=0),
    'thinking': dict(arms=('down', 'scratch'), eyes='look', look=(8, -8), mouth='hmm', tilt=-6),
    'error':    dict(arms=('droop', 'droop'), eyes='sad', look=(0, 4), mouth='frown', tilt=-5),
    'loading':  dict(arms=('down', 'down'), eyes='open', mouth='smile', tilt=0),
    'sleeping': dict(arms=('droop', 'droop'), eyes='closed', mouth='sleep', tilt=-7),
}

ARMS = {
    'down':  ('M204 346 Q178 364 150 394', 'M308 346 Q334 364 362 394'),
    'up':    ('M206 350 Q158 346 124 298', 'M306 350 Q354 346 388 298'),
    'droop': ('M204 350 Q186 380 170 414', 'M308 350 Q326 380 342 414'),
}


def arm_line(kind, side, C):
    if kind == 'scratch':
        return None
    d = ARMS[kind][0 if side == 'l' else 1]
    return Line(d, 44, C['shade'] if side == 'l' else C['base'])


def build(pose, C, prefix, rim=None, head_only=False, extras=True, anim=False):
    P = POSES[pose]
    doc = Doc(prefix)
    tilt = P.get('tilt', 0)
    head_tf = 'rotate(%s %s %s)' % (f(tilt), NECK[0], NECK[1]) if tilt else None

    # pins (behind head, same tilt)
    pins, pin_det = [], []
    pin_specs = [((196, 132), -28, 92, C['pins'][0], -1),
                 ((262, 120), 5, 96, C['pins'][1], 1),
                 ((324, 136), 34, 84, C['pins'][2], 1)]
    if pose == 'error':
        pin_specs.pop(1)   # the middle pin fell out and lies on the ground
    for base, ang, ln, col, side in pin_specs:
        parts, det = pin_parts(base, ang, ln, col, side)
        pins += parts
        pin_det += det

    head = Shape('path', {'d': HEAD_D}, C['base'], shade=C['shade'], shade_off=(18, -16))
    face = head_details(C) + cheeks(C, 1.0) + eyes(P['eyes'], P.get('look', (0, 0)), C) + mouth(P['mouth'], C)

    layers = []
    if not head_only:
        legs = [Shape('ellipse', {'cx': '222', 'cy': '452', 'rx': '30', 'ry': '24'}, C['shade']),
                Shape('ellipse', {'cx': '290', 'cy': '452', 'rx': '30', 'ry': '24'}, C['base'])]
        al, ar = P['arms']
        arms = [a for a in (arm_line(al, 'l', C), arm_line(ar, 'r', C)) if a]
        torso = Shape('path', {'d': TORSO_D}, C['base'], shade=C['shade'], shade_off=(16, -10))
        body_det = []
        # stitched hem on the torso
        body_det.append('<path d="M196 424 Q256 446 316 424" fill="none" stroke="%s" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 10" opacity="0.9"/>' % C['stitch'])
        gid = doc.uid('glow')
        doc.defs.append(glow_def(gid))
        body_det += charm(C, gid)
        layers.append(Layer(legs + arms + [torso], body_det, cls=('%sbody' % prefix) if anim else None))
    layers.append(Layer(pins, pin_det, head_tf, cls=('%shead' % prefix) if anim else None))
    layers.append(Layer([head], face, head_tf, cls=('%shead' % prefix) if anim else None))
    if not head_only and 'scratch' in P['arms']:
        scratch = Line('M308 348 Q368 340 384 284', 44, C['base'])
        layers.append(Layer([scratch], []))

    if not head_only and pose == 'error':
        fallen, fdet = pin_parts((350, 478), 78, 88, C['pins'][1], -1)
        layers.append(Layer(fallen, fdet))
    art = render_layers(layers, doc, rim)

    pre, post = [], []
    if extras and not head_only:
        pre.append('<ellipse cx="256" cy="484" rx="120" ry="14" fill="%s" opacity="0.14"%s/>' % (
            INK, (' class="%sshadow"' % prefix) if anim else ''))
        if pose == 'main':
            post += [sparkle(436, 178, 20, AMBER), sparkle(80, 210, 10, PURPLE_LIGHT, 0.9)]
        if pose == 'wave':
            lines = '<path d="M410 236 Q424 252 420 272"/><path d="M430 218 Q450 246 442 280"/>'
            post.append('<g fill="none" stroke="%s" stroke-width="13" stroke-linecap="round">%s</g>' % (INK, lines))
            post.append('<g fill="none" stroke="%s" stroke-width="6" stroke-linecap="round">%s</g>' % (PURPLE_LIGHT, lines))
            post.append(sparkle(90, 196, 18, AMBER))
        if pose == 'happy':
            post += [sparkle(84, 150, 22, AMBER), sparkle(432, 140, 19, MINT), sparkle(60, 236, 12, MAGENTA, 0.9),
                     sparkle(456, 226, 12, PURPLE_LIGHT, 0.9)]
        if pose == 'thinking':
            post.append('<g transform="translate(426 108)">'
                        '<circle cx="-44" cy="58" r="7" fill="%s" stroke="%s" stroke-width="5"/>'
                        '<circle cx="-22" cy="40" r="11" fill="%s" stroke="%s" stroke-width="5"/>'
                        '<rect x="-30" y="-36" width="80" height="58" rx="22" fill="%s" stroke="%s" stroke-width="6"/>'
                        '<path d="%s" fill="none" stroke="%s" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
                        '<path d="%s" fill="none" stroke="%s" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
                        '</g>' % (CREAM, INK, CREAM, INK, CREAM, INK,
                                  brace_path(-14, -7, 12, 30), PURPLE, brace_path(34, -7, 12, 30, True), PURPLE))
        if pose == 'error':
            post.append('<path d="M175 252 Q166 268 168 278 Q172 290 182 286 Q190 282 186 270 Q183 262 175 252 Z" fill="%s" stroke="%s" stroke-width="4.5" stroke-linejoin="round"/>' % (PURPLE_LIGHT if C['base'] == CREAM else CREAM, INK))
        if pose == 'sleeping':
            for x, y, s, op in ((416, 176, 0.85, 1), (446, 122, 1.1, 1), (474, 60, 1.35, 1)):
                w = 16 * s
                zd = 'M%s %s L%s %s L%s %s L%s %s' % (f(x - w), f(y - w), f(x + w), f(y - w), f(x - w), f(y + w), f(x + w), f(y + w))
                for col, sw in ((INK, 12 + s * 1.5), (PURPLE_LIGHT, 5 + s * 1.5)):
                    post.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (zd, col, f(sw)))
        if pose == 'loading':
            for i, x in enumerate((222, 256, 290)):
                post.append('<circle class="%sdot %sd%d" cx="%d" cy="505" r="7" fill="%s"/>' % (prefix, prefix, i, x, PURPLE))
    return doc, '\n'.join(pre), art, '\n'.join(post)


def svg_file(title, desc, inner, defs, viewbox='0 0 512 512', w=512, h=512, style='', pid='vd'):
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" width="%d" height="%d" role="img" aria-labelledby="%sT %sD">\n'
            '  <title id="%sT">%s</title>\n'
            '  <desc id="%sD">%s</desc>\n'
            '  <defs>%s%s</defs>\n%s\n</svg>\n') % (viewbox, w, h, pid, pid, pid, title, pid, desc,
                                                  ('<style>%s</style>' % style) if style else '', ''.join(defs), inner)


def mascot_svg(pose, C, prefix, title, desc, rim=None, head_only=False, viewbox='0 0 512 512', size=(512, 512), anim=False):
    doc, pre, art, post = build(pose, C, prefix, rim=rim, head_only=head_only, anim=anim)
    style = ''
    if anim:
        p = prefix
        style = (
            '.{p}body,.{p}head{{animation:{p}hop 1.1s cubic-bezier(.45,0,.55,1) infinite;transform-origin:256px 470px}}'
            '.{p}shadow{{animation:{p}sh 1.1s cubic-bezier(.45,0,.55,1) infinite;transform-origin:256px 484px}}'
            '.{p}dot{{animation:{p}dot 1.1s ease-in-out infinite}}'
            '.{p}d1{{animation-delay:.18s}}.{p}d2{{animation-delay:.36s}}'
            '@keyframes {p}hop{{0%,100%{{transform:translateY(0) scale(1.03,.97)}}45%{{transform:translateY(-26px) scale(.98,1.02)}}55%{{transform:translateY(-26px) scale(.98,1.02)}}}}'
            '@keyframes {p}sh{{0%,100%{{transform:scale(1);opacity:.14}}50%{{transform:scale(.72);opacity:.07}}}}'
            '@keyframes {p}dot{{0%,100%{{opacity:.25}}50%{{opacity:1}}}}'
            '@media (prefers-reduced-motion: reduce){{.{p}body,.{p}head,.{p}shadow,.{p}dot{{animation:none}}.{p}dot{{opacity:.6}}}}'
        ).format(p=p)
    inner = '%s\n%s\n%s' % (pre, art, post)
    return svg_file(title, desc, inner, doc.defs, viewbox, size[0], size[1], style, prefix)


def mascot_group(pose, C, prefix, rim=None, head_only=False, extras=True):
    """Returns (defs, inner) so a pose can be embedded in a larger SVG."""
    doc, pre, art, post = build(pose, C, prefix, rim=rim, head_only=head_only, extras=extras)
    return doc.defs, '%s\n%s\n%s' % (pre, art, post)


HEAD_VIEWBOX = '81 0 350 350'


def concepts(dest):
    os.makedirs(dest, exist_ok=True)
    for name, C in CONCEPTS.items():
        for pose in ('main', 'happy', 'error'):
            s = mascot_svg(pose, C, 'c%s%s' % (name[0], pose[:2]), 'Vudu concept %s' % name, 'Concept sketch.')
            open(os.path.join(dest, '%s-%s.svg' % (name, pose)), 'w', encoding='utf-8').write(s)
        s = mascot_svg('main', C, 'c%sh' % name[0], 'Vudu head', 'Concept head.', head_only=True,
                       viewbox=HEAD_VIEWBOX, size=(350, 350))
        open(os.path.join(dest, '%s-head.svg' % name), 'w', encoding='utf-8').write(s)


# ---------------------------------------------------------------- final set

C = CONCEPTS['purple']
FONT_DISPLAY = "'Space Grotesk', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
FONT_MONO = "'JetBrains Mono', 'Fira Code', ui-monospace, Consolas, monospace"
CDN = 'https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js'

ANATOMY = ('a small purple felt voodoo doll with cream stitching, big glossy eyes, '
           'three sewing pins with pennant flags in its head and a glowing amber charm with curly braces on its chest')

FILES = [
    ('vudu.svg', 'main', 'Vudu, the Voodoo.js mascot', 'Vudu, %s, smiling.'),
    ('vudu-wave.svg', 'wave', 'Vudu waving', 'Vudu, %s, waving hello with one arm up.'),
    ('vudu-happy.svg', 'happy', 'Vudu celebrating', 'Vudu, %s, with both arms up, eyes closed in joy and sparkles around.'),
    ('vudu-thinking.svg', 'thinking', 'Vudu thinking', 'Vudu, %s, scratching its head and looking up at a thought bubble with curly braces.'),
    ('vudu-error.svg', 'error', 'Vudu sad', 'Vudu, %s, sad with a tear and a frown, its middle pin fallen to the ground. For error and 404 pages.'),
    ('vudu-sleeping.svg', 'sleeping', 'Vudu sleeping', 'Vudu, %s, asleep with closed eyes and floating Z letters.'),
]


def write(name, text, dest=None):
    dest = dest or OUT
    os.makedirs(dest, exist_ok=True)
    assert chr(0x2014) not in text and chr(0x2013) not in text
    with open(os.path.join(dest, name), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)


def wordmark(x, y, size, ink, accent, anchor='start'):
    return ('<text x="%s" y="%s" font-family="%s" font-size="%s" font-weight="700" letter-spacing="%s" '
            'fill="%s" text-anchor="%s">Voodoo<tspan fill="%s">.js</tspan></text>') % (
        f(x), f(y), FONT_DISPLAY, f(size), f(-size * 0.028), ink, anchor, accent)


def code_chip(x, y, size, dark, center=False):
    """The CDN script tag on a rounded chip. Monospace advance is fixed to 0.6em with textLength."""
    text_len = len('<script src="%s">' % CDN)
    tw = text_len * size * 0.6
    w = tw + size * 2.6
    h = size * 2.7
    if center:
        x = x - w / 2
    out = '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s"/>' % (
        f(x), f(y), f(w), f(h), f(h / 2), '#241C40' if dark else INK)
    if dark:
        out += '<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="none" stroke="%s" stroke-opacity="0.45" stroke-width="1.5"/>' % (
            f(x + .75), f(y + .75), f(w - 1.5), f(h - 1.5), f(h / 2 - .75), PURPLE_LIGHT)
    out += ('<text x="%s" y="%s" font-family="%s" font-size="%s" text-anchor="middle" fill="%s" textLength="%s" lengthAdjust="spacingAndGlyphs">'
            '<tspan fill="%s">&lt;script</tspan> <tspan fill="%s">src</tspan>=<tspan fill="%s">"%s"</tspan><tspan fill="%s">&gt;</tspan></text>') % (
        f(x + w / 2), f(y + h / 2 + size * 0.36), FONT_MONO, f(size), CREAM, f(tw),
        PURPLE_LIGHT, AMBER, MINT, CDN, PURPLE_LIGHT)
    return out


def layout(W, H, dark, prefix, kind):
    """Banner and social layouts: mascot on the left, wordmark, tagline and the CDN chip."""
    bg = '#14111F' if dark else CREAM
    ink = CREAM if dark else INK
    accent = PURPLE_LIGHT if dark else PURPLE
    sub = 'rgba(251,247,242,0.74)' if dark else '#4A4166'
    defs, art = mascot_group('main', C, prefix, rim=CREAM if dark else None)
    defs = list(defs)
    gid, pid = prefix + 'bgGlow', prefix + 'dots'
    defs.append('<radialGradient id="%s" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="%s" stop-opacity="%s"/>'
                '<stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient>' % (gid, PURPLE, '0.5' if dark else '0.16', PURPLE))
    defs.append('<pattern id="%s" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="%s" opacity="%s"/></pattern>' % (
        pid, PURPLE_LIGHT if dark else PURPLE, '0.16' if dark else '0.10'))
    parts = ['<rect width="%d" height="%d" fill="%s"/>' % (W, H, bg),
             '<rect width="%d" height="%d" fill="url(#%s)"/>' % (W, H, pid)]
    if kind == 'banner':
        ms, mx, my = 0.70, 64, 16
        tx, wy, ws, ts, cy, cs = 470, 172, 86, 30, 262, 15.5
        tag = [('JSX in plain HTML. No build step.', 226)]
    else:
        ms = 0.92
        mx, my = 36 if W >= 1280 else 24, (H - 512 * ms) / 2 - 44
        tx = 548 if W >= 1280 else 520
        wy, ws, ts = H * 0.43, 104 if W >= 1280 else 98, 40
        tag = [('JSX in plain HTML.', wy + 66), ('No build step.', wy + 116)]
        cs = 20 if W >= 1280 else 18.5
        cy = H - 46 - cs * 2.7
    parts.append('<circle cx="%s" cy="%s" r="%s" fill="url(#%s)"/>' % (f(mx + 256 * ms), f(my + 270 * ms), f(310 * ms), gid))
    parts.append('<g transform="translate(%s %s) scale(%s)">%s</g>' % (f(mx), f(my), f(ms), art))
    parts.append(wordmark(tx, wy, ws, ink, accent))
    for text, y in tag:
        parts.append('<text x="%s" y="%s" font-family="%s" font-size="%s" font-weight="500" fill="%s">%s</text>' % (
            f(tx), f(y), FONT_DISPLAY, f(ts), sub, text))
    if kind == 'banner':
        parts.append(code_chip(tx, cy, cs, dark))
    else:
        parts.append('<text x="%s" y="%s" font-family="%s" font-size="22" font-weight="600" letter-spacing="0.5" fill="%s">JavaScript feels like magic.</text>' % (
            f(tx + 4), f(wy - ws - 2), FONT_DISPLAY, AMBER))
        parts.append(code_chip(W / 2, cy, cs, dark, center=True))
    return defs, '\n'.join(parts)


def build_all():
    for name, pose, title, desc in FILES:
        write(name, mascot_svg(pose, C, 'v' + pose[:3], title, desc % ANATOMY))
    write('vudu-loading.svg', mascot_svg(
        'loading', C, 'vload', 'Vudu loading',
        'Vudu, %s, hopping in place above three pulsing dots. The animation stops when reduced motion is requested.' % ANATOMY,
        anim=True))
    write('vudu-dark.svg', mascot_svg(
        'main', C, 'vdark', 'Vudu for dark backgrounds',
        'Vudu, %s, with a light cream rim around the sticker outline so it stands out on dark backgrounds.' % ANATOMY,
        rim=CREAM))
    write('vudu-head.svg', mascot_svg(
        'main', C, 'vhead', 'Vudu head', 'The head of Vudu with its three flag pins, for avatars.',
        head_only=True, viewbox=HEAD_VIEWBOX, size=(350, 350)))

    # favicon: the head on a rounded square
    defs, art = mascot_group('main', C, 'vfav', head_only=True)
    inner = ('<rect width="512" height="512" rx="120" fill="%s"/>'
             '<circle cx="256" cy="300" r="230" fill="url(#vfavGlow)"/>'
             '<g transform="translate(256 262) scale(1.18) translate(-256 -176)">%s</g>') % (INK, art)
    defs = list(defs) + ['<radialGradient id="vfavGlow" cx="256" cy="300" r="230" gradientUnits="userSpaceOnUse">'
                         '<stop offset="0" stop-color="%s" stop-opacity="0.7"/><stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient>' % (PURPLE, PURPLE)]
    write('favicon.svg', svg_file('Voodoo.js favicon', 'The head of Vudu on a deep ink rounded square.', inner, defs,
                                  '0 0 512 512', 64, 64, '', 'vfav'))

    for name, dark in (('banner.svg', False), ('banner-dark.svg', True)):
        prefix = 'bd' if dark else 'bl'
        defs, inner = layout(1280, 400, dark, prefix, 'banner')
        write(name, svg_file('Voodoo.js', 'Vudu the mascot next to the Voodoo.js wordmark, the line JSX in plain HTML. No build step, and the CDN script tag.',
                             inner, defs, '0 0 1280 400', 1280, 400, '', prefix))
    build_social(os.path.join(HERE, 'social'))


def build_social(dest):
    """Social card sources. render-social.html in brand/src turns them into PNGs."""
    for name, W, H in (('social-preview', 1280, 640), ('og', 1200, 630)):
        prefix = 's' + name[:2]
        defs, inner = layout(W, H, True, prefix, 'social')
        write(name + '.svg', svg_file('Voodoo.js', 'Vudu with the Voodoo.js wordmark, tagline and CDN script tag.', inner, defs,
                                      '0 0 %d %d' % (W, H), W, H, '', prefix), dest)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--concepts':
        concepts(sys.argv[2])
        print('concepts written to', sys.argv[2])
    else:
        build_all()
        print('mascot-v2 written to', OUT)
