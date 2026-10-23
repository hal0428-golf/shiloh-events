"""Shiloh Events app icon v2: 1024x1024 RGB PNG (no alpha, square corners; iOS applies the mask).
Fonts: Playfair Display + Montserrat (SIL Open Font License)."""
import math, os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

FONTS = os.path.expanduser("~/work/fonts/node_modules/@expo-google-fonts")
SERIF = f"{FONTS}/playfair-display/800ExtraBold/PlayfairDisplay_800ExtraBold.ttf"
SANS = f"{FONTS}/montserrat/600SemiBold/Montserrat_600SemiBold.ttf"

OUT, S = 1024, 3
N = OUT * S
NAVY_TOP, NAVY_BOT, GLOW = (16, 52, 112), (4, 22, 56), (36, 84, 160)
GOLD, WHITE = (214, 172, 66), (255, 255, 255)
s = lambda v: int(round(v * S))

# --- background: vertical navy gradient + soft glow behind the wordmark
bg = Image.new("RGB", (N, N))
d = ImageDraw.Draw(bg)
for y in range(N):
    t = y / (N - 1)
    d.line([(0, y), (N, y)], fill=tuple(int(NAVY_TOP[i] + (NAVY_BOT[i] - NAVY_TOP[i]) * t) for i in range(3)))
glow = ImageChops.invert(Image.radial_gradient("L")).resize((N, N), Image.BICUBIC).point(lambda v: int(v * 0.38))
bg.paste(GLOW, (0, 0), glow)
d = ImageDraw.Draw(bg)

def text_width(txt, font, track):
    return sum(font.getlength(c) for c in txt) + track * (len(txt) - 1)

def fit_font(path, txt, track_ratio, target_w):
    size = 100
    for _ in range(6):                      # converge on target width
        f = ImageFont.truetype(path, s(size))
        w = text_width(txt, f, s(size) * track_ratio) / S
        size *= target_w / w
    f = ImageFont.truetype(path, s(size))
    return f, s(size) * track_ratio, size

def draw_text(cx, baseline, txt, font, track, fill):
    x = s(cx) - text_width(txt, font, track) / 2
    for c in txt:
        d.text((x, s(baseline)), c, font=font, fill=fill, anchor="ls")
        x += font.getlength(c) + track

f1, tr1, sz1 = fit_font(SERIF, "SHILOH", 0.045, 850)
f2, tr2, sz2 = fit_font(SANS, "EVENTS", 0.34, 670)
cap1 = sz1 * 0.708                         # Playfair cap height
cap2 = sz2 * 0.70                          # Montserrat cap height

# --- vertical layout, centered as one block
glyph_h, gap1, gap2, gap3, rule_h = 150, 78, 52, 52, 18
block = glyph_h + gap1 + cap1 + gap2 + rule_h + gap3 + cap2
top = (OUT - block) / 2 + 6
g_top = top
base1 = g_top + glyph_h + gap1 + cap1
rule_y = base1 + gap2 + rule_h / 2
base2 = rule_y + rule_h / 2 + gap3 + cap2

# --- calendar mark (line art, gold)
gw, gx = 215, 512
x0, x1, y0, y1 = gx - gw / 2, gx + gw / 2, g_top + 22, g_top + glyph_h
lw = 11
d.rounded_rectangle([s(x0), s(y0), s(x1), s(y1)], radius=s(24), outline=GOLD, width=s(lw))
d.rectangle([s(x0 + lw / 2), s(y0 + 36), s(x1 - lw / 2), s(y0 + 36 + lw * 0.7)], fill=GOLD)   # header rule
for rx in (gx - 46, gx + 46):                                                                     # rings
    d.rounded_rectangle([s(rx - 8), s(g_top), s(rx + 8), s(y0 + 30)], radius=s(8), fill=GOLD)
cy = (y0 + 36 + y1) / 2 + 6
pts = []
for i in range(10):                                                                                # star
    ang = -math.pi / 2 + i * math.pi / 5
    r = 33 if i % 2 == 0 else 14
    pts.append((s(gx + r * math.cos(ang)), s(cy + 2 + r * math.sin(ang))))
d.polygon(pts, fill=GOLD)

# --- wordmark
draw_text(512, base1, "SHILOH", f1, tr1, WHITE)
d.rectangle([s(512 - 170), s(rule_y - 2.5), s(512 - 22), s(rule_y + 2.5)], fill=GOLD)
d.rectangle([s(512 + 22), s(rule_y - 2.5), s(512 + 170), s(rule_y + 2.5)], fill=GOLD)
d.polygon([(s(512), s(rule_y - 10)), (s(512 + 10), s(rule_y)), (s(512), s(rule_y + 10)), (s(512 - 10), s(rule_y))], fill=GOLD)
draw_text(512, base2, "EVENTS", f2, tr2, GOLD)

icon = bg.resize((OUT, OUT), Image.LANCZOS).convert("RGB")
icon.save("icon.png", optimize=True)
print("icon.png", icon.size, icon.mode, f"block={block:.0f}px top={top:.0f}")

sheet = Image.new("RGB", (1040, 340), (235, 238, 244))
x = 20
for size in (256, 180, 120, 60, 40):
    t = icon.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.2237), fill=255)
    sheet.paste(t, (x, 20 + (256 - size) // 2), m.resize((size, size), Image.LANCZOS))
    x += size + 30
sheet.save("preview.png")
