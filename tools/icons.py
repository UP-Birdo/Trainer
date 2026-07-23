"""Erzeugt die App-Icons aus dem Master-PNG des Designs.

Quelle: Trainer-Icon-1024.png (1024x1024, RGBA) neben diesem Skript - die
glasige Athleten-Figur auf blauem Verlauf, exakt aus dem Claude-Design
exportiert. Das Master hat abgerundete Ecken mit TRANSPARENTEM Aussenrand.

Warum wir es nicht 1:1 nehmen: Home-Screen-Icons rundet iOS/Android selbst.
Eingebackene runde Ecken + Systemmaske ergaeben doppelte Ecken bzw. schwarze
Schnipsel (Transparenz wird dort schwarz gefuellt). Deshalb fuellen wir die
transparenten Ecken NAHTLOS auf, indem wir den jeweils naechsten
undurchsichtigen Bildpunkt fortsetzen (scipy-Distanztransformation). So bleibt
Figur + Verlauf 1:1 erhalten, das Icon wird aber randlos-quadratisch.

Danach per LANCZOS auf 512/192/180 herunterrechnen.
Ausgabe: icon-512/192/180.png im Projektordner (eine Ebene ueber tools/).
"""
import numpy as np
from scipy import ndimage
from PIL import Image
from pathlib import Path

HIER   = Path(__file__).resolve().parent      # tools/
WURZEL = HIER.parent                          # Projektordner (Repo-Wurzel)
QUELLE = HIER / "Trainer-Icon-1024.png"

im  = Image.open(QUELLE).convert("RGBA")
arr = np.array(im)
rgb, alpha = arr[..., :3], arr[..., 3]

# Fuer jeden Pixel den naechsten UNDURCHSICHTIGEN Pixel finden und dessen
# Farbe uebernehmen. Undurchsichtige Pixel bleiben sie selbst; die transparenten
# Ecken bekommen die Farbe der naechsten Kante -> Verlauf laeuft nahtlos weiter.
transparent = alpha == 0
idx = ndimage.distance_transform_edt(transparent, return_distances=False, return_indices=True)
randlos = rgb[idx[0], idx[1]]
master  = Image.fromarray(randlos.astype(np.uint8), "RGB")

for groesse in (512, 192, 180):
    master.resize((groesse, groesse), Image.LANCZOS).save(
        WURZEL / f"icon-{groesse}.png", optimize=True)
print("Icons erzeugt aus", QUELLE)
