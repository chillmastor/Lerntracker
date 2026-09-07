# 🧭 Projekt-Architektur & Leitfaden für Agenten

Dieses Dokument dient als zentrale Orientierung und Strukturkarte für KI-Agenten und Entwickler, die an der Codebasis des **Lernfortschritts-Trackers** arbeiten.

---

## 1. 🎯 Projektübersicht & Philosophie

* **Zweck:** Ein hochperformanter, datenschutzkonformer (100 % DSGVO) und offline-fähiger Lernfortschritts-Tracker für Lehrkräfte (PWA), optimiert für Tablets (iPad), Laptops, Smartboards und Smartphones.
* **Architektur-Stil:** **Zero-Build Single-File Core**. Das gesamte Frontend (Markup, Styling, Business-Logik) befindet sich in [index.html](file:///d:/Programming/Lerntracker/index.html).
* **Kein Build-Step:** Kein Node.js-, Vite- oder Webpack-Setup. Keine `package.json`. Reines HTML5, Tailwind CSS via CDN und Vanilla JavaScript (ES6+).
* **Datenschutz:** Alle Daten verbleiben ausnahmslos in der lokalen Browser-Datenbank (`IndexedDB`). Es gibt **kein Backend** und keine Übertragung sensibler Schülerdaten an externe Server.
* **Offline-Fähigkeit:** Service Worker ([sw.js](file:///d:/Programming/Lerntracker/sw.js)) mit Cache-First für statische Bibliotheken/Fonts und Network-First für [index.html](file:///d:/Programming/Lerntracker/index.html).

---

## 2. 📁 Dateistruktur

```text
Lerntracker/
├── index.html                  # Komplette Web-App (HTML-Struktur, Tailwind-Klassen, CSS & JS-Logik)
├── sw.js                       # Service Worker für PWA-Offline-Caching
├── README.md                   # Benutzerdokumentation & Installationsanleitung
└── .agents/
    └── rules/
        ├── versioning.md       # Vorgaben zu Versionserhöhung & Changelog-Datumsformaten
        └── project_structure.md# Dieses Dokument (Projektübersicht & Code-Struktur)
```

---

## 3. 💾 Datenmodell (`appData`) & Persistenz

Der gesamte Anwendungszustand wird in der globalen JavaScript-Variable `appData` gehalten und über IndexedDB persistiert:
* **Datenbank:** `DB_NAME = 'LernfortschrittTrackerDB_V9'`, Version `1`, Store `STORE_NAME = 'appDataStore'`.
* **Schlüssel im Store:** Ein einzelner Record mit Key `'currentData'`.

### Datenstruktur-Schema:

```javascript
{
  activeCourseId: 'course_5a_deu', // Aktuell ausgewählte Kurs-ID
  sortOrder: 'last',               // 'last' (Nachname) | 'first' (Vorname) | 'custom' (Eigene Reihenfolge)
  isStudentMode: false,            // true = Smartboard-Modus (datenschutzkonform) | false = Lehrkraft-Modus
  zoomLevel: 1.0,                  // Zoom-Faktor für Tabellenansicht (0.5 bis 1.5)
  uiState: {
    headerCollapsed: false,        // Kopfzeile eingeklappt?
    actionBarCollapsed: false,     // Filter- & Aktionsleiste eingeklappt?
    showAllNotes: false            // Notizen in der Tabelle permanent eingeblendet?
  },
  statuses: [                      // Verfügbare Status-Stufen & Noten
    { id: 'stat_nb', label: 'Nicht begonnen', short: 'NB', color: '#94a3b8' },
    { id: 'stat_arbeit', label: 'In Bearbeitung', short: 'IB', color: '#3b82f6' },
    { id: 'stat_hilfe', label: 'Braucht Rückmeldung', short: 'HIL', color: '#f59e0b' },
    { id: 'stat_fertig', label: 'Abgeschlossen', short: 'OK', color: '#10b981' },
    // Notensystem (stat_note_1p bis stat_note_6) sowie benutzerdefinierte Status
  ],
  courses: [
    {
      id: 'course_5a_deu',
      name: '5a Deutsch',
      students: [
        {
          id: 's_01',
          firstName: 'Jonas',
          lastName: 'Albrecht',
          name: 'Jonas Albrecht',
          level: 'aufsteiger',     // 'basis' (🏕️) | 'aufsteiger' (🧗) | 'gipfel' (🏔️)
          absenceCount: 0,         // Fehlzeiten/Krankheitstage
          note: 'Sehr zuverlässig',// Private Notiz / Förderbedarf
          customOrder: 0           // Reihenfolge bei 'custom' Sortierung
        }
      ],
      tasks: [
        {
          id: 't_deu_1',
          title: 'M 1: Grammatik',
          collapsed: false         // Spalte eingeklappt (geschützt)?
        }
      ],
      // Lernstände: Key = `${studentId}_${taskId}` -> Value = statusId oder Freitext
      progress: {
        's_01_t_deu_1': 'stat_fertig'
      }
    }
  ]
}
```

---

## 4. ⚙️ Kern-Subsysteme & Funktionsübersicht

### A. Lebenszyklus & Persistenz
* `openDatabase()`: Öffnet IndexedDB (`LernfortschrittTrackerDB_V9`).
* `loadFromDB()`: Lädt Daten oder initialisiert mit `defaultData`.
* `saveToDB(pushUndo = false, actionDesc = '')`: Persistiert `appData` asynchron in der IndexedDB.
* `requestStoragePersistence()`: Bittet den Browser via `navigator.storage.persist()` um persistenten Speicher (verhindert Cache-Eviction auf iOS).

### B. Undo-System (Rückgängig-Funktion)
* `pushUndoState(actionDesc)`: Speichert bis zu 25 Snapshots von `appData` im `undoStack`.
* `undoLastAction()`: Stellt den vorherigen Zustand wieder her, speichert in DB und ruft `renderAll()` auf.
* Tastatur-Shortcut: `Strg+Z` bzw. `Cmd+Z` (ignoriert Eingaben in Textfeldern).

### C. Rendering & Ansichten
* `renderAll()`: Haupt-Renderfunktion; aktualisiert Tabs, Header-Status und rendert die aktive Ansicht (`renderTable()` oder `renderCardView()`).
* `renderTable()`: Erzeugt die Matrix-Tabelle (Schüler als Zeilen, Aufgaben/Materialien als Spalten).
  * Sticky First Column: Fixierte Namensspalte beim horizontalen Scrollen.
  * Eingeklappte Spalten: Schmale Vertikaldarstellung bei `task.collapsed = true`.
* `renderCardView()`: Fokus-Kartenansicht für einen ausgewählten Schüler mit Niveaustufe, Fehltagen, editierbaren Notizen und Aufgaben-Karten.
* `renderMultiCourseSummary(student)`: Der **Elternsprechtagsberater** – fasst die Leistungen und Notizen eines Schülers über **alle Kurse** zusammen; inkl. separater Druckansicht (`@media print` mit `.printing-berater`).

### D. Zell-Interaktion & Direkteingabe
* `resolveStatusInfo(value)`: Ermittelt Status-Details (Farbe, Hintergrund, Label) für IDs oder Freitext (z. B. Noten oder Punktwerte).
* `openStatusPopover(e, studentId, taskId, courseId)`: Öffnet das Auswahlmenü für Status, Noten und Freitext-Eingabe.
* `startInlineCellEdit(...)`: Startet Direkteingabe direkt in der Tabellenzelle.
* `handleCellKeydown(...)`: Umfassende Tastaturbedienung in der Tabelle:
  * `Enter` / `Shift+Enter`: Nächster/vorheriger Schüler in derselben Spalte.
  * `Tab` / `Shift+Tab`: Nächste/vorherige Aufgabe (Spalte).
  * `Pfeiltasten`: Freie Navigation im Raster.
  * `F2`: Inline-Bearbeitung starten.
  * `Leertaste`: Popover öffnen.
  * `Backspace` / `Entf`: Zelle leeren (`stat_nb`).
  * `Beliebiges Zeichen`: Startet sofortige Direkteingabe.

### E. Modi & Bildschirmanpassung
* `toggleStudentMode()`: Wechselt zwischen **Lehrkraft-Modus** und **Smartboard-Modus**.
  * Im Smartboard-Modus: Nachnamen werden via `formatStudentDisplayName()` abgekürzt (z. B. „Jonas A.“), Notizen werden ausgeblendet und Elemente mit der CSS-Klasse `.teacher-only` werden versteckt (`display: none !important`).
* `toggleFitToScreen()` & `fitEntireTableToScreen()`: Berechnet dynamisch den Skalierungsfaktor via CSS `transform: scale(...)` auf `#appWrapper`, sodass die gesamte Tabelle ohne Scrollbalken auf den Beamer/Bildschirm passt.
* `adjustZoom(delta)` & `resetZoom()`: Manueller stufenloser Zoom (A- / A+).
* `toggleAllBars()` / `toggleHeaderCollapse()`: Vollbild-/Kompaktmodus für maximale Tabellenhöhe.

### F. Datenimport & -export
* `exportExcel()`: Erzeugt `.xlsx` via SheetJS.
* `exportPDF()`: Erzeugt druckfertiges Querformat-PDF via `jsPDF` und `AutoTable`.
* `exportCSV()` & `exportAllCoursesCSV()`: Exportiert einzelnen Kurs oder Komplett-Backup aller Kurse mit UTF-8 BOM.
* `importCSVFile(event)` / `parseCSVTable(...)`: Intelligenter CSV-Parser mit automatischer Trennzeichen-Erkennung (`;`, `,`, `\t`), flexibler Spaltenerkennung (Vorname, Nachname, Niveau, Fehltage, Notizen) und Multi-Kurs-Unterstützung.

---

## 5. 🚨 Wichtige Richtlinien für Agenten bei Code-Änderungen

1. **Single-File-Prinzip wahren:**
   * Sämtliche UI-, CSS- und JS-Änderungen gehören in [index.html](file:///d:/Programming/Lerntracker/index.html).
   * Keine zusätzlichen Build-Pipelines, Node-Module oder externen Abhängigkeiten einführen.
2. **Offline & CDN-Konformität:**
   * Externe Bibliotheken müssen in [sw.js](file:///d:/Programming/Lerntracker/sw.js) im Array `ASSETS_TO_CACHE` registriert sein, damit die PWA offline funktioniert.
3. **Zustandsänderung immer absichern:**
   * Vor jeder benutzerinitiierten Änderung an `appData` immer `pushUndoState('Aktionsbeschreibung')` aufrufen!
   * Nach Änderungen immer `saveToDB()` aufrufen.
   * Anschließend die UI via `renderAll()` (oder die spezifische Render-Funktion) aktualisieren.
   * Wenn `isFitToScreenActive` aktiv ist, `fitEntireTableToScreen()` erneut triggern.
4. **XSS-Schutz beachten:**
   * Benutzereingaben (Namen, Notizen, Aufgabentitel) beim Einsetzen in `innerHTML` **stets** mit `escapeHTML(str)` maskieren!
5. **Datenschutz & Smartboard-Modus respektieren:**
   * Lehrer-spezifische Buttons oder Notizfelder immer mit der Klasse `teacher-only` versehen.
   * Schülernamen immer über `formatStudentDisplayName(student)` anzeigen.
6. **Versionierung & Changelog einhalten:**
   * Siehe [.agents/rules/versioning.md](file:///d:/Programming/Lerntracker/.agents/rules/versioning.md):
     * Bei jeder Funktionsanpassung Version in `fullHeaderBar`, `compactHeaderBar` und `changelogModal` synchronisieren.
     * Im Changelog immer das exakte Tagesdatum im Format `DD.MM.YYYY` angeben.
