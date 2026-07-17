"""Erzeugt die App-Icons: vier schräge Striche, der letzte gelb (Satz-Strichliste).

Warum es das Skript diesmal gibt: Die alten Icons waren mit harten Pixelkanten
gezeichnet (0 % Mischpixel) — bei SCHRÄGEN Strichen ergibt das Treppenstufen,
und genau das liest sich auf dem Retina-Display als unscharf. Die Maße sind aus
dem alten icon-512 ausgemessen und unverändert übernommen; neu ist allein das
16-fache Supersampling mit LANCZOS-Verkleinerung, das die Schrägen glatt rechnet.
"""
from PIL import Image, ImageDraw

GRUND  = (22, 24, 28)     # --ground  #16181C
KREIDE = (140, 145, 153)  # --muted   #8C9199
SIGNAL = (242, 193, 78)   # --signal  #F2C14E
S = 16                    # Supersampling-Faktor

# Anteile der Kantenlänge, ausgemessen am alten 512er-Icon
BREITE  = 39.5 / 512      # Strichbreite
LUECKE  = 32.0 / 512      # Abstand zwischen den Strichen
HOEHE   = 216.0 / 512     # Strichhöhe
NEIGUNG = 23.0 / 512      # seitlicher Versatz oben

def icon(groesse):
    g = groesse * S
    bild = Image.new("RGB", (g, g), GRUND)
    d = ImageDraw.Draw(bild)
    breite, luecke, hoehe, neigung = BREITE*g, LUECKE*g, HOEHE*g, NEIGUNG*g
    gesamt  = 4*breite + 3*luecke + neigung          # Gesamtbreite inkl. Schräge
    x0      = (g - gesamt) / 2                       # waagerecht mittig (das alte Icon saß 11 px daneben)
    y_oben  = (g - hoehe) / 2
    y_unten = y_oben + hoehe
    for i in range(4):
        links = x0 + i * (breite + luecke)
        farbe = SIGNAL if i == 3 else KREIDE
        d.polygon([(links + neigung, y_oben), (links + neigung + breite, y_oben),
                   (links + breite,  y_unten), (links,                   y_unten)], fill=farbe)
    return bild.resize((groesse, groesse), Image.LANCZOS)

for n in (180, 192, 512):
    icon(n).save(f"/home/claude/trainer/icon-{n}.png", optimize=True)
