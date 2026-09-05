🎓 Lernfortschritts-Tracker (PWA)

Ein hochperformanter, datenschutzkonformer und 100 % offlinefähiger Lernfortschritts-Tracker für Lehrkräfte, optimiert für den Einsatz auf dem iPad, Handy, Mac oder PC.

🔗 Direkt zur Web-App (Live-Version):

👉 https://lerntracker.vercel.app/ 👈

✨ Wichtigste Funktionen

🔒 100 % lokaler Datenschutz (DSGVO-konform): Alle Schülerdaten, Namen, Notizen und Niveaustufen verbleiben ausschließlich im internen Speicher des Geräts (IndexedDB). Es werden keinerlei personenbezogene Daten an externe Server gesendet.

📶 Offline-Betrieb (PWA): Nach dem einmaligen Laden kann die App über Safari („Zum Home-Bildschirm“) als eigenständige App installiert werden und läuft danach komplett ohne WLAN oder im Flugmodus.

🏫 Lehrkraft- vs. Smartboard-Modus:

Lehrkraft-Modus: Voller Zugriff auf private Notizen, Fehlzeiten, Schülernamen und Verwaltung.

Smartboard-Modus: Datenschutzkonforme Ansicht für Beamer & Whiteboard (automatisches Abkürzen der Nachnamen z. B. „Mia S.“, Ausblenden vertraulicher Notizen). Niveaustufen bleiben interaktiv anpassbar.

🏕️ Differenziertes Stufen-Modell: Schnelles Zuordnen von Leistungs- bzw. Niveaustufen (🏕️ Basis, 🧗 Aufsteiger, 🏔️ Gipfelstürmer).

🔍 Flexible Skalierung & Gesamtansicht: Präziser Zoom (A- / A+) sowie eine 1-Klick-Gesamtansicht, die die gesamte Klassentabelle passgenau und ohne Scrollen auf den Bildschirm einpasst.

📂 Kurs- und Klassenverwaltung: Schnelles Wechseln zwischen Fächern und Klassen sowie Sammelansicht für Elternsprechtage im Fokus-Modus.

📊 Datensicherung & Austausch: Vollständiger Export und Import via Excel (.xlsx), PDF (druckfertig im Querformat) und CSV.

📲 Installation auf dem iPad (Homescreen-App)

Öffne die Live-URL in Safari: https://lerntracker.vercel.app/

Warte kurz, bis oben rechts die grüne Meldung „📶 100% Offline bereit“ erscheint.

Tippe in Safari auf das Teilen-Symbol (Viereck mit Pfeil nach oben).

Scrolle nach unten und wähle „Zum Home-Bildschirm“.

Starte die App fortan direkt über das neue Icon auf deinem Homescreen – ganz ohne Adressleiste und ohne Internetzwang.

🛠️ Technologie

Frontend: Reines HTML5, Tailwind CSS, modernes Vanilla JavaScript (kein Build-Step erforderlich)

Persistenz: Client-seitige IndexedDB mit automatischer Speichergarantie (navigator.storage.persist())

Offline-Cache: Eigener Service Worker (sw.js) mit Cache-First-Strategie

Bibliotheken: SheetJS (xlsx), jsPDF & AutoTable, FontAwesome Icons
