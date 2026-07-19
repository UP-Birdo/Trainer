"""Erzeugt die App-Icons: weiße Athleten-Figur auf blauem Verlauf.

Vorlage ist das im Claude-Design gebaute Icon (Trainer_Icon.html, viewBox
0 0 300 300): ein abgerundetes Quadrat mit einer Figur aus Kopf, breitem
Arm-Querbalken, Rumpf und zwei Beinen, Figur bei 85 % Deckkraft.

Zwei bewusste Abweichungen von der SVG, damit es als Home-Screen-Icon
sauber aussieht:
  1. RANDLOS quadratisch (keine eingebauten runden Ecken) - iOS/Android
     legen ihre eigene Maske drueber; sonst gaebe es doppelte Ecken.
  2. Der Verlauf der Live-Version (#4fadff -> #1e73e6 -> #145fd0) statt des
     flachen Blaus der statischen SVG-Vorschau.

Gerendert wird EIN grosser Master mit Supersampling, dann per LANCZOS auf
512/192/180 heruntergerechnet - das glaettet die Rundungen.
"""
import math
import numpy as np
from PIL import Image, ImageDraw

V         = 300
WINKEL    = 160
STOPS     = [(0.00, (79, 173, 255)),
             (0.55, (30, 115, 230)),
             (1.00, (20,  95, 208))]
FIG_RGB   = (255, 255, 255)
FIG_ALPHA = 0.85

BASIS = 512
SS    = 4
M     = BASIS * SS

a = math.radians(WINKEL)
dx, dy = math.sin(a), -math.cos(a)
ys, xs = np.mgrid[0:M, 0:M].astype(np.float32)
t = xs * dx + ys * dy
t = (t - t.min()) / (t.max() - t.min())

def verlauf(t):
    out = np.zeros(t.shape + (3,), np.float32)
    for i in range(len(STOPS) - 1):
        t0, c0 = STOPS[i]
        t1, c1 = STOPS[i + 1]
        m = (t >= t0) & (t <= t1) if i == 0 else (t > t0) & (t <= t1)
        f = (t[m] - t0) / (t1 - t0)
        for k in range(3):
            out[m, k] = c0[k] + (c1[k] - c0[k]) * f
    return out

master = Image.fromarray(verlauf(t).astype(np.uint8), "RGB")

s = M / V
maske = Image.new("L", (M, M), 0)
d = ImageDraw.Draw(maske)
def rr(x, y, w, h, r):
    d.rounded_rectangle([x * s, y * s, (x + w) * s, (y + h) * s], radius=r * s, fill=255)

d.ellipse([(150 - 20) * s, (86 - 20) * s, (150 + 20) * s, (86 + 20) * s], fill=255)
rr(40, 120, 220, 26, 13)
rr(118, 120, 64, 150, 20)
rr(120, 200, 26, 70, 13)
rr(154, 200, 26, 70, 13)

weiss   = Image.new("RGB", (M, M), FIG_RGB)
maske85 = maske.point(lambda v: int(v * FIG_ALPHA))
master  = Image.composite(weiss, master, maske85)

for groesse in (512, 192, 180):
    master.resize((groesse, groesse), Image.LANCZOS).save(
        f"/home/claude/trainer/icon-{groesse}.png", optimize=True)
print("Icons erzeugt: icon-512.png, icon-192.png, icon-180.png")
