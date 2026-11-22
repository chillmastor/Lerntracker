# ADR 0001: Testbare Logikmodule als eigene Skriptdateien neben index.html

Status: angenommen (22.11.2026)

## Kontext

Der Lerntracker folgt dem Zero-Build-Single-File-Prinzip: Markup, Styling und Logik stehen in `index.html`. Für den Notenlisten-Export und die Klassenlisten-Erkennung entsteht Logik mit vielen Sonderfällen (Kopferkennung, Namensabgleich, XML-Patchen, Zerlegen von Texterkennungs-Ergebnissen). Fehler wären dort teuer (falsche Note beim falschen Kind) und sind ohne automatische Tests kaum abzusichern.

## Entscheidung

Reine Logik ohne DOM- und `appData`-Zugriff kommt in eigene Skriptdateien im Repo-Root (`notenliste.js`, `klassenliste.js`).

- Jede Datei ist ein UMD-Modul. Im Browser registriert sie ein globales Objekt (`Notenliste`, `Klassenliste`), in Node exportiert sie über `module.exports`.
- `index.html` bindet sie per `<script src>` ein. Es gibt weiterhin keinen Build-Step und keine `package.json`.
- Der Service Worker cacht die Dateien für den Offline-Betrieb.
- Tests liegen unter `tests/` und laufen mit `node --test tests/`. Sie nutzen nur `node:test` und `node:assert`.
- Fixtures enthalten ausschließlich erfundene Namen. Echte Schülerlisten und Fotos werden nie eingecheckt (`.gitignore`).

## Konsequenzen

- `index.html` bleibt der Ort für UI, Zustand und Adapter (SheetJS, JSZip, Tesseract.js). Die Module bleiben bibliotheksfrei.
- Neue Logik mit vielen Sonderfällen soll diesem Muster folgen, statt `index.html` weiter wachsen zu lassen.
