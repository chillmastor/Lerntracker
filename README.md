# 🎓 Lernfortschritts-Tracker (PWA)

Ein hochperformanter, datenschutzkonformer und 100 % offlinefähiger Lernfortschritts-Tracker für Lehrkräfte, optimiert für den Einsatz auf dem iPad, Smartphone, Mac oder PC.

[👉 **Direkt zur Web-App (Live-Version)**](https://lerntracker.vercel.app/)

---

## ✨ Wichtigste Funktionen

* **🔒 100 % lokaler Datenschutz (DSGVO-konform):** Alle Schülerdaten, Namen, Notizen und Niveaustufen verbleiben ausschließlich im internen Speicher des Geräts (IndexedDB). Es werden keinerlei personenbezogene Daten an externe Server übertragen.
* **📶 Vollständiger Offline-Betrieb (PWA):** Nach dem einmaligen Laden kann die Anwendung als eigenständige Web-App installiert werden und funktioniert dauerhaft ohne Internetverbindung oder im Flugmodus.
* **🏫 Lehrkraft- vs. Smartboard-Modus:**
  * **Lehrkraft-Modus:** Voller Zugriff auf private Notizen, Fehlzeiten, Schülernamen und Verwaltung.
  * **Smartboard-Modus:** Datenschutzkonforme Ansicht für Beamer und Whiteboard mit automatischem Abkürzen der Nachnamen (z. B. „Mia S.“) und ausgeblendeten Notizen bei voller Interaktivität.
* **🏕️ Differenziertes Stufen-Modell:** Schnelles Zuordnen von Leistungsstufen zur individuellen Förderung (🏕️ Basis, 🧗 Aufsteiger, 🏔️ Gipfelstürmer).
* **🔍 Flexible Skalierung & Gesamtansicht:** Stufenloser Zoom (A- / A+) sowie eine 1-Klick-Gesamtansicht, die die gesamte Klassentabelle passgenau und ohne Scrollen auf die Displaygröße skaliert.
* **📂 Kurs- und Klassenverwaltung:** Reibungsloser Wechsel zwischen Fächern und Lerngruppen inklusive Fokus-Ansicht für Elternsprechtage und Beratungsgespräche.
* **📊 Datensicherung & Export:** Vollständiger Export und Import via Excel (`.xlsx`), druckfertigem PDF im Querformat und CSV.

---

## 📲 Installation auf dem iPad (Homescreen-PWA)

1. Öffne die Live-URL in Safari: `https://lerntracker.vercel.app/`
2. Warte kurz, bis die Bestätigung **„📶 100% Offline bereit“** oben rechts erscheint.
3. Tippe in Safari auf das Teilen-Symbol (Viereck mit Pfeil nach oben).
4. Scrolle in den Optionen nach unten und wähle **„Zum Home-Bildschirm“**.
5. Starte die App künftig direkt über das Icon auf deinem Homescreen: komplett im Vollbildmodus, ohne störende Browserleisten und unabhängig vom Schul-WLAN.

---

## 🛠️ Technologie-Stack

* **Frontend:** Reines HTML5, Tailwind CSS, modernes Vanilla JavaScript (kein Build-Step oder Node-Setup erforderlich)
* **Persistenz:** Client-seitige IndexedDB mit automatischer Speichergarantie (`navigator.storage.persist()`)
* **Offline-Cache:** Eigener Service Worker (`sw.js`) mit Cache-First-Strategie
* **Bibliotheken:**
  * [SheetJS (xlsx)](https://sheetjs.com/) für Excel-Import und -Export
  * [jsPDF](https://github.com/parallax/jsPDF) & AutoTable für formatierte PDF-Exporte
  * [FontAwesome](https://fontawesome.com/) für UI-Icons

---

## 📄 Lizenz

Dieses Projekt ist für den praktischen Einsatz im Schulalltag konzipiert. Frei nutzbar, anpassbar und erweiterbar für Lehrkräfte und Schulen.
