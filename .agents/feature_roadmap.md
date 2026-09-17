# Feature-Roadmap & Ideen-Backlog für den Lerntracker

Dieses Dokument dient als zentrale Ideensammlung und strategische Roadmap für zukünftige Versionen des Lernfortschritts-Trackers.
Alle Vorschläge sind nach Aufwand und Wirkungsbereich geordnet – von schnellen Alltagshelfern bis hin zu visionären Smartboard- und Kollaborations-Funktionen.

---

## 🟢 Kategorie 1: Quick Wins & Bedienung (Aufwand: Gering | Sofortiger Mehrwert)

### 1.1 Spalten-Überkategorien / Themen-Gruppierung
- **Idee:** Aufgaben zu Themenblöcken zusammenfassen (z. B. *„Thema 1: Wortarten“* über 4 Spalten, *„Thema 2: Satzglieder“* über 3 Spalten).
- **Nutzen:** Die Tabelle bleibt auch bei 20+ Materialien übersichtlich und thematisch gegliedert.
- **Umsetzung:** Optionales Feld `category` pro Aufgabe; in `renderTable` wird eine farbige Über-Kopfzeile gerendert.

### 1.2 Schnellfilter nach Niveau & Status
- **Idee:** Ein-Klick-Filter in der Aktionsleiste:
  - Nur *Basis* 🏕️, *Aufsteiger* 🧗 oder *Gipfel* 🏔️ anzeigen.
  - Nur Schüler mit Handlungsbedarf anzeigen (z. B. *„Braucht Hilfe“* oder *„Nicht begonnen“* bei einer bestimmten Aufgabe).
- **Nutzen:** Die Lehrkraft sieht während der Arbeitsphase sofort, wer gezielte Förderung oder Zusatzmaterial benötigt.

### 1.3 Aufgaben-Schnellaktion: „Nur leere Zellen füllen“
- **Idee:** Im Spaltenmenü neben *„Alle auf Status setzen“* die Option *„Nur nicht bearbeitete (NB) Zellen auf diesen Status setzen“*.
- **Nutzen:** Wenn die Mehrheit fertig ist, kann man alle verbliebenen Schüler auf einen Rutsch erfassen, ohne bestehende Einträge zu überschreiben.

### 1.4 Tastatur-Shortcuts Hilfe-Modal (`?`)
- **Idee:** Drücken der Taste `?` öffnet eine kompakte Übersicht aller Shortcuts:
  - <kbd>F2</kbd> / Doppelklick: Inline-Editor
  - <kbd>Enter</kbd> / <kbd>↓</kbd>: Nächste Schülerzeile
  - <kbd>Pfeiltasten</kbd>: Navigation
  - <kbd>Leertaste</kbd>: Status-Popover
  - <kbd>Esc</kbd>: Schließen
- **Nutzen:** Macht die mächtigen Tastaturfunktionen für alle Lehrkräfte sofort auffindbar.

### 1.5 Fehltage-Schwellenwert mit visueller Warnung
- **Idee:** Sobald ein Kind z. B. mehr als 5 Fehltage hat, wird der Fehltage-Badge rot hinterlegt oder erhält ein Warnsymbol.
- **Nutzen:** Schneller Überblick über Kinder mit hohem Nachholbedarf.

---

## 🟡 Kategorie 2: Pädagogik, Analysen & Unterrichtsfluss (Aufwand: Mittel)

### 2.1 Fortschrittsbalken pro Schüler
- **Idee:** In der Schülerzelle oder auf der Schülerkarte ein dezenter Fortschrittsbalken (z. B. *„12/15 Materialien erledigt (80%)“*).
- **Nutzen:** Sofortige visuelle Rückmeldung über den Gesamtfortschritt eines Kindes im aktuellen Kurs.

### 2.2 Material-Statistik in der Kopfzeile (Klassenüberblick)
- **Idee:** Am Fuß oder Kopf jeder Aufgabenspalte ein kleiner Mini-Balken:
  - Wie viele Schüler haben *Erledigt* (grün), *In Bearbeitung* (blau), *Braucht Hilfe* (rot)?
- **Nutzen:** Die Lehrkraft erkennt auf einen Blick: *„Bei Station 3 hängen gerade 6 Schüler fest – da brauche ich eine Zwischenerklärung im Plenum.“*

### 2.3 Aufgabenspezifische Niveaustufen (Differenzierung)
- **Idee:** Eine Aufgabe kann als *„Nur für Gipfel“* oder *„Zusatzaufgabe“* markiert werden.
- **Nutzen:** Kinder im Niveau *Basis* werden bei solchen Aufgaben visuell ausgegraut oder von der 100%-Berechnung ausgenommen, sodass kein Frust entsteht.

### 2.4 Fälligkeitsdaten / Phasen-Deadlines
- **Idee:** Eintragen eines Zieldatums pro Material (z. B. *„Bis 18.09.“*).
- **Nutzen:** Optische Kennzeichnung bei überfälligen Aufgaben zur Vorbereitung von Wochenplangesprächen.

### 2.5 Zeitstempel / Änderungshistorie pro Zelle
- **Idee:** Beim Setzen eines Status wird das Datum/Uhrzeit gespeichert.
- **Nutzen:** Beim Überfahren der Zelle erscheint im Tooltip: *„Status 'Erledigt' gesetzt am 04.09.2026 von Lehrkraft“*.

---

## 🔴 Kategorie 3: Berichte, Elterngespräche & Zeugnisse (Aufwand: Gehoben)

### 3.1 Einzelseitiger Schüler-Lernentwicklungsbogen (PDF)
- **Idee:** Ein Klick auf einen Schüler generiert ein druckfertiges, ästhetisches 1-Seiten-PDF:
  - Schülername, Klasse, Datum, aktuelles Niveau
  - Übersicht aller Materialien mit Häkchen / Noten / Punkten
  - Fehltage & die persönliche Lehrkraft-Notiz
  - Signaturfeld für Lehrkraft & Erziehungsberechtigte
- **Nutzen:** Perfekte Vorbereitung für Elterngespräche, Förderpläne oder Beratungsgespräche in Sekunden.

### 3.2 Klassen-Sammelbericht (ZIP mit allen Schüler-PDFs)
- **Idee:** Ein-Klick-Download eines ZIP-Archivs mit den fertigen Entwicklungsbögen aller Schüler der Klasse.
- **Nutzen:** Massiver Zeitgewinn vor Zeugniskonferenzen oder Elternsprechtagen.

### 3.3 Noten- & Punkteschlüssel-Rechner
- **Idee:** Optionaler Modus für Leistungskontrollen:
  - Eingabe von Maximalpunkten pro Spalte.
  - Automatische Berechnung von Prozentwerten und Notenvorschlägen anhand gängiger Notenskalen (z. B. IHK, KMK oder linear).
- **Nutzen:** Spart den Wechsel zu Excel oder externen Notenrechnern.

### 3.4 Excel- & CSV-Importassistent mit visueller Spaltenzuordnung
- **Idee:** Beim Ziehen einer fremden Excel-Datei öffnet sich ein Dialog: *„Welche Spalte ist der Nachname? Welche der Vorname?“*.
- **Nutzen:** Fehlerfreier Import aus Schulverwaltungsprogrammen (z. B. Schild, WebUntis, FuxMedia, ASV).

---

## 🚀 Kategorie 4: Interaktion & Smartboard-Tools (Aufwand: Gehoben)

### 4.0 Beratungs-Warteschlange & Smartboard-Direktbearbeitung ✅ *(Implementiert)*
- **Funktion:**
  - Nummernvergabe (#1, #2, #3, ...) für Kinder mit Beratungs-, Hilfe- oder Kontrollbedarf.
  - Prominente Anzeige der Nummer direkt neben dem Schülernamen in der Tabelle.
  - Smartboard-taugliches Warteschlangen-Banner oben (Aktuell aufgerufen, Warteliste, Nächste(r) aufrufen, Gong-Chime, lückenlose Neunummerierung).
  - Volle Bearbeitbarkeit von Schülernamen und Fehltagen im Smartboard-Modus mit automatischem Schutz privater Notizen.

### 4.1 Arbeitsphasen-Timer / Countdown oben in der Kopfleiste
- **Idee:** Ein einblendbarer Timer (z. B. *„Noch 20:00 Min. Arbeitszeit“*) mit sanftem Gong-Signal.
- **Nutzen:** Im Smartboard-Modus sehen die Kinder direkt, wie viel Zeit noch für die Werkstatt-/Stationenarbeit verbleibt.

### 4.2 Zufalls-Auswahl / Melde-Glücksrad
- **Idee:** Ein kleiner Button *„Zufallskind“*, der einen Schüler hervorhebt (z. B. für Präsentationen, Dienste oder Vorlesen).
- **Nutzen:** Spielerisches, faires Element im Unterrichtsalltag.

### 4.3 Klassen-Meilenstein / Belohnungs-Animation
- **Idee:** Wenn alle Kinder der Klasse eine Aufgabe abgeschlossen haben, erscheint eine dezente, motivierende Stern- oder Konfetti-Animation auf dem Smartboard.
- **Nutzen:** Fördert Kooperation und Motivation der Lerngruppe.

---

## 🌐 Kategorie 5: Kollaboration & Geräte-Kopplung (Aufwand: Groß / Visionär)

### 5.1 QR-Code / Offline-Sync zwischen iPad und Smartboard-PC
- **Idee:** Die Lehrkraft bereitet auf dem iPad vor. Durch Scannen eines QR-Codes am Smartboard-PC wird der Kursstand direkt übertragen – ganz ohne fremde Cloud-Server oder Login (via WebRTC oder verschlüsseltem lokalen Datenaustausch).
- **Nutzen:** 100% DSGVO-konform, blitzschnell und internetunabhängig im Schul-WLAN.

### 5.2 Kiosk- / Schüler-Selbstabgabe-Station
- **Idee:** Ein Tablet steht im Klassenraum. Kinder können ihren Namen antippen und selbst markieren: *„Ich habe Station 4 fertiggestellt“*.
- **Schutz:** PIN-geschützter Wechsel zurück in den Lehrkraft-Modus; Bestätigungshäkchen durch Lehrkraft.
- **Nutzen:** Fördert selbstorganisiertes Lernen (SOL).

### 5.3 Multi-Lehrkraft / Team-Teaching (Nextcloud / WebDAV Sync)
- **Idee:** Automatische Sicherung und Synchronisation über die schulinterne Nextcloud oder WebDAV.
- **Nutzen:** Fachlehrkraft und Förderlehrkraft können zeitgleich denselben Kurs pflegen.

---

## Empfohlene nächste Schritte (Priorisierung)

1. **Paket 1 (Schneller Alltags-Mehrwert):**
   - Spalten-Themenkategorien (1.1)
   - Schnellfilter nach Niveau & Status (1.2)
   - Fortschrittsbalken pro Schüler (2.1)

2. **Paket 2 (Elterngespräche & Konferenzen):**
   - Schüler-Entwicklungsbericht als druckfertiges PDF (3.1)

3. **Paket 3 (Smartboard-Tools):**
   - Unterrichts-Timer & Countdown (4.1)
   - Aufgaben-Statistikbalken (2.2)
