// Extrahiert den Haupt-<script>-Block aus index.html fuer node --check.
const fs = require("fs");
const path = require("path");
const quelle = process.argv[2];
const ziel = process.argv[3];
const src = fs.readFileSync(quelle, "utf8");
const start = src.lastIndexOf("<script>");
const ende = src.lastIndexOf("</script>");
if (start < 0 || ende < 0 || ende <= start) { console.error("Script-Block nicht gefunden"); process.exit(1); }
const js = src.slice(start + 8, ende);
fs.writeFileSync(ziel, js);
console.log("extrahiert:", js.length, "Zeichen ->", ziel);
