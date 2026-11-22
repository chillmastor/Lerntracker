# Spec: Noten in die Notenliste des Klassenlehrers übertragen

Status: ready-for-agent

## Problem Statement

Vor Zeugnissen, Elternsprechtagen und der Erprobungsstufenkonferenz verteilt der Klassenlehrer eine Excel-Notenliste. Darin stehen die Kinder der Klasse und eine Spalte pro Fach, darunter meist das Lehrerkürzel. Jede Fachlehrkraft trägt dort die Noten ihres Kurses ein.

Die Noten stehen bereits im Lerntracker, werden aber heute von Hand abgetippt. Das dauert und ist fehleranfällig.

Die Listen sind außerdem nicht einheitlich:
- Fächer sind unterschiedlich beschriftet (`BIO`, `Bio`, `NW`; `If`, `IF`, `If `).
- Ein Fach kommt mehrfach vor (`E-G` zweimal, für zwei Lehrkräfte).
- Namen sind falsch geschrieben oder anders geschrieben als im Lerntracker (Sonderzeichen wie `Karabektaşoğlu`, zweiter Vorname fehlt).
- Dateiname, Blattname und Klassenangabe im Kopf passen nicht zusammen.
- Manche Dateien haben mehrere Blätter (z. B. „Elternsprechtag“ und „Zeugnisnoten“, oder ein leeres Blatt „Kursliste“ neben der „Zeugnisliste“).
- Die Tabelle ist über mehrere Druckseiten verteilt, der Tabellenkopf wiederholt sich auf jeder Seite.

## Solution

Im Export-Menü des Lerntrackers gibt es eine neue Funktion: **„Noten in Notenliste übertragen“**. Die Lehrkraft wählt den Kurs, die Excel-Datei des Klassenlehrers und die Aufgaben-Spalte mit der Zeugnisnote. Der Lerntracker:

1. lässt die Lehrkraft **immer selbst den Tab (das Arbeitsblatt) und die Zielspalte wählen**. Dafür zeigt er alle Tabs und alle Fachspalten des gewählten Tabs an und hat den wahrscheinlichsten Treffer bereits vorausgewählt (über Fachname, Synonyme und das eigene Lehrerkürzel). Eine Bestätigung genügt im Normalfall.
2. ordnet jedem Kind aus dem Kurs die passende Zeile zu, auch bei Tippfehlern,
3. zeigt eine Vorschau. Unsichere Punkte kommen als Rückfragen: Name nur ähnlich, Kind nicht gefunden, Zelle schon anders befüllt,
4. schreibt danach nur die betroffenen Zellen und lädt die Datei als Kopie herunter. Formatierung, Formeln, verbundene Zellen und alle anderen Fächer bleiben unverändert.

Die Noten werden genau so übertragen, wie sie im Lerntracker stehen (`2+` bleibt `2+`).

## User Stories

1. Als Fachlehrkraft möchte ich die Notenliste des Klassenlehrers in den Lerntracker laden, damit ich die Noten meines Kurses nicht abtippen muss.
2. Als Fachlehrkraft möchte ich wählen, welche Aufgaben-Spalte meines Kurses die Zeugnisnote enthält, damit die richtige Note übertragen wird.
3. Als Fachlehrkraft möchte ich, dass sich der Lerntracker diese Spaltenwahl pro Kurs merkt, damit ich sie nicht jedes Halbjahr neu treffen muss.
4. Als Fachlehrkraft möchte ich mein Lehrerkürzel (z. B. `Sha`) einmal in den Einstellungen hinterlegen, damit meine Spalte auch dann gefunden wird, wenn ein Fach mehrfach vorkommt.
5. Als Fachlehrkraft möchte ich, dass die Fach-Spalte auch bei abweichender Beschriftung erkannt wird (`Bio`/`BIO`/`Biologie`, `If`/`IF`/`Informatik`, Leerzeichen am Ende), damit kleine Fehler des Klassenlehrers den Import nicht stoppen.
6. Als Fachlehrkraft möchte ich, dass verwandte Fachbezeichnungen als Kandidaten angeboten werden (z. B. `NW` für einen Kurs „Biologie“), damit ich bei Fächerverbünden nicht manuell suchen muss.
7. Als Fachlehrkraft möchte ich die Zielspalte immer selbst bestätigen oder ändern, auch wenn der Lerntracker einen eindeutigen Treffer gefunden hat, damit nichts in die falsche Spalte geschrieben wird.
8. Als Fachlehrkraft möchte ich bei der Spaltenauswahl alle Fachspalten des Tabs mit Fachkopf, Lehrerkürzel und der Zahl bereits befüllter Zellen sehen, und der Vorschlag soll hervorgehoben sein, damit ich schnell und sicher entscheiden kann.
9. Als Fachlehrkraft möchte ich, dass Spalten zur Fehlzeit (`FZ`, `ges`, `ue`), `S.b.jahre` und `Bemerkungen` nicht als Fach-Spalte angeboten werden, damit ich sie nicht versehentlich überschreibe.
10. Als Fachlehrkraft möchte ich bei Dateien mit mehreren Tabs immer selbst wählen, welcher Tab gefüllt wird (z. B. „Elternsprechtag“ oder „Zeugnisnoten“), damit ich in das richtige Blatt eintrage.
11. Als Fachlehrkraft möchte ich in der Tab-Auswahl pro Tab sehen, wie viele Kinder erkannt wurden und ob meine Fachspalte vorkommt. Der wahrscheinlichste Tab soll vorausgewählt sein, Tabs ohne Namensliste ausgegraut, damit ich leere Vorlageblätter sofort erkenne.
11a. Als Fachlehrkraft möchte ich, dass bei einer Datei mit nur einem Tab die Tab-Auswahl übersprungen wird, damit der einfache Fall schnell bleibt.
11b. Als Fachlehrkraft möchte ich nach einem Tab-Wechsel sofort die Spalten des neuen Tabs angeboten bekommen, damit ich ohne Neustart korrigieren kann.
11c. Als Fachlehrkraft möchte ich, dass sich der Lerntracker Tab-Name und Spaltenkopf pro Kurs merkt und beim nächsten Mal wieder vorschlägt, damit wiederkehrende Listen schneller gehen.
12. Als Fachlehrkraft möchte ich, dass Tabellen über mehrere Druckseiten mit wiederholtem Kopf als eine Liste behandelt werden, damit alle Kinder ab Nr. 21 ebenfalls gefunden werden.
13. Als Fachlehrkraft möchte ich gewarnt werden, wenn Klasse oder Halbjahr im Kopf der Datei nicht zum Kurs passen (z. B. Datei „7c“, Kopf „5a“, Schuljahr 24/25), damit ich keine veraltete oder fremde Liste befülle.
14. Als Fachlehrkraft möchte ich, dass Kinder mit exakt gleichem Namen automatisch zugeordnet werden, damit ich nur über echte Zweifelsfälle nachdenken muss.
15. Als Fachlehrkraft möchte ich, dass Groß-/Kleinschreibung, Leerzeichen, Bindestriche und Sonderzeichen (`ş`, `ğ`, `ö`/`oe`, `ü`/`ue`) beim Namensvergleich ignoriert werden, damit Schreibvarianten trotzdem gefunden werden.
16. Als Fachlehrkraft möchte ich, dass ähnliche Namen (Tippfehler wie `Marim`/`Maryam`, fehlender zweiter Vorname, vertauschte Vor- und Nachnamen) als Vorschlag mit Bestätigung erscheinen, damit Fehler in der Liste den Import nicht verhindern.
17. Als Fachlehrkraft möchte ich bei ähnlichen Namen sehen, wie sie in meinem Kurs und wie sie in der Liste geschrieben sind, damit ich den Vorschlag sicher bestätigen oder ablehnen kann.
18. Als Fachlehrkraft möchte ich, dass zwei Kinder mit gleichem Nachnamen (z. B. drei Geschwister `Karabektaşoğlu`) nur über den Vornamen unterschieden werden und nie verwechselt werden, damit keine Note beim Geschwisterkind landet.
19. Als Fachlehrkraft möchte ich ein nicht gefundenes Kind von Hand einer Zeile zuordnen oder überspringen können, damit ich den Import trotzdem abschließen kann.
20. Als Fachlehrkraft möchte ich sehen, welche Kinder der Liste in meinem Kurs fehlen, damit ich merke, ob ich jemanden vergessen habe oder das Kind mein Fach nicht hat.
21. Als Fachlehrkraft möchte ich, dass jede Listenzeile höchstens einem Kind zugeordnet wird, damit nie zwei Noten in dieselbe Zeile geschrieben werden.
22. Als Fachlehrkraft möchte ich, dass sich der Lerntracker bestätigte Namenskorrekturen pro Kind merkt, damit derselbe Tippfehler beim nächsten Mal automatisch zugeordnet wird.
23. Als Fachlehrkraft möchte ich, dass leere Zellen ohne Rückfrage befüllt werden, damit der Normalfall schnell geht.
24. Als Fachlehrkraft möchte ich gefragt werden, wenn eine Zelle schon eine andere Note enthält, und pro Zelle oder für alle entscheiden können (überschreiben/behalten), damit ich keine Einträge anderer versehentlich zerstöre.
25. Als Fachlehrkraft möchte ich, dass Zellen mit genau meiner Note unverändert bleiben und als „bereits eingetragen“ markiert werden, damit ein zweiter Durchlauf nichts kaputt macht.
26. Als Fachlehrkraft möchte ich, dass Noten genau so übertragen werden, wie sie im Lerntracker stehen (`2+`, `3-`, `nb`, `1-2`), damit die Liste meine Bewertung exakt wiedergibt.
27. Als Fachlehrkraft möchte ich, dass ganze Noten als Zahl und nicht als Text in die Zelle geschrieben werden, damit Formeln und Auswertungen des Klassenlehrers weiter funktionieren.
28. Als Fachlehrkraft möchte ich, dass Kinder ohne Eintrag in der Notenspalte übersprungen und in der Vorschau aufgelistet werden, damit ich fehlende Noten nachtragen kann.
29. Als Fachlehrkraft möchte ich, dass Lernstatus wie `OK`, `IB`, `NB` aus Nicht-Noten-Spalten nicht als Note übertragen werden, sondern als Hinweis erscheinen, damit keine Statuskürzel in der Zeugnisliste landen.
30. Als Fachlehrkraft möchte ich vor dem Schreiben eine Vorschau aller Änderungen sehen (Kind → Zelle → alter Wert → neuer Wert), damit ich alles prüfen kann.
31. Als Fachlehrkraft möchte ich die fertige Datei als Kopie herunterladen, mit einem Dateinamen, der Fach oder Kürzel enthält, damit ich sie zurückschicken kann und die Originaldatei erhalten bleibt.
32. Als Klassenlehrkraft möchte ich, dass die zurückgeschickte Datei bis auf die neuen Noten genau wie meine Vorlage aussieht (Rahmen, Farben, Spaltenbreiten, verbundene Zellen, Formeln wie `=NOW()` und `=D2`), damit ich die Listen der Kollegen ohne Nacharbeit zusammenführen kann.
33. Als Fachlehrkraft möchte ich mehrere Kurse nacheinander in dieselbe Datei übertragen können (z. B. E, NW, M, KU in der 6b), damit am Ende eine Datei mit allen meinen Fächern entsteht.
34. Als Fachlehrkraft möchte ich die Funktion auch offline auf dem iPad nutzen, damit ich die Noten im Lehrerzimmer ohne WLAN übertragen kann.
35. Als Fachlehrkraft möchte ich, dass alle Daten im Browser bleiben, damit der Datenschutz gewahrt ist.
36. Als Fachlehrkraft möchte ich, dass die Funktion im Smartboard-Modus ausgeblendet ist, damit keine Notenlisten vor der Klasse erscheinen.
37. Als Fachlehrkraft möchte ich eine verständliche Fehlermeldung bekommen, wenn die Datei keine erkennbare Namensliste enthält oder keine `.xlsx` ist, damit ich weiß, was ich tun kann.
38. Als Fachlehrkraft möchte ich nach dem Export eine Zusammenfassung sehen (x übertragen, y übersprungen, z offen), damit ich weiß, ob noch etwas zu tun ist.

## Implementation Decisions

**Neues Modul „Notenlisten-Übertragung“ in einer eigenen Skriptdatei.** Es ist eine bewusste Ausnahme vom Single-File-Prinzip, damit die Logik ohne Browser testbar ist. Die Entscheidung wird als ADR festgehalten. Die Datei wird per `<script>` in die App eingebunden, braucht keinen Build-Step und kommt in den Service-Worker-Cache. Das Modul kennt weder DOM noch `appData` noch Excel-Bibliotheken und hat drei Einstiegspunkte:

- **`planen(arbeitsmappe, kontext) → plan`**
  - `arbeitsmappe`: Blätter als Zellraster (`[{ name, zellen: Zeile → Spalte → Wert }]`).
  - `kontext`: Kursname, Klasse, Fach, Lehrerkürzel, Schülerliste (id, Vor-/Nachname, gemerkte Namensaliase, Wert aus der Notenspalte).
  - Ergebnis: alle Blätter mit Kurzinfo (erkannte Kinderzahl, Fachspalten-Treffer, Vorschlag ja/nein), alle Fachspalten des vorgeschlagenen Blatts mit Fachkopf, Kürzel, Befüllungsgrad und Rangfolge, vorgeschlagenes Blatt und vorgeschlagene Spalte, Kopfzeile(n), Zuordnungen (Kind ↔ Zeile mit Sicherheit `exakt` | `ähnlich` | `keine`), Zellschreibungen (Adresse, alter Wert, neuer Wert, Art `leer` | `gleich` | `konflikt`) und eine Liste von **Rückfragen**. **Blattwahl** (nur bei mehr als einem Blatt) und **Spaltenwahl** sind immer enthalten und haben den Vorschlag als Vorbelegung. Dazu kommen Namensbestätigung, Kind nicht gefunden, Zellkonflikt und Klassen-/Halbjahrswarnung.
- **`entscheiden(plan, antworten) → plan`**: wendet die Antworten der Lehrkraft auf die Rückfragen an. Mehrfachaufruf ist erlaubt. Eine neue Blattwahl liefert die Spalten dieses Blatts samt neuem Vorschlag, eine neue Spaltenwahl berechnet Zuordnungen und Zellschreibungen neu. Der Plan ist fertig, wenn Blatt und Spalte bestätigt sind und keine offenen Rückfragen mehr übrig sind. Ein Plan ohne bestätigte Spalte erzeugt nie Zellschreibungen.
- **`patcheBlattXml(blattXml, zellschreibungen) → blattXml`**: setzt Werte in das Worksheet-XML einer `.xlsx`. Ganze Zahlen werden als Zahl geschrieben, alles andere als Inline-String. Stil-Attribute bleiben erhalten, fehlende `<c>`/`<row>`-Elemente werden in der richtigen Reihenfolge angelegt. Nichts anderes im XML wird verändert.

**Dünner Adapter in der App** (nicht unit-getestet):
- Datei lesen und Zellraster mit dem vorhandenen SheetJS bauen.
- Kontext aus dem aktiven Kurs zusammenstellen.
- Rückfragen als Dialog anzeigen.
- Die Original-`.xlsx` per JSZip öffnen, nur die betroffenen Worksheet-XMLs durch `patcheBlattXml` laufen lassen, neu zippen und herunterladen.

SheetJS wird bewusst **nicht** zum Schreiben benutzt: Die Community-Version 0.18.5 verliert beim Schreiben Formatierungen. JSZip wird per CDN mit fester Version geladen und für den Offline-Betrieb gecacht.

**Kopferkennung:**
- Eine Kopfzeile ist eine Zeile mit Zellen „Name“ und „Vorname“ (Groß-/Kleinschreibung und Leerzeichen egal).
- Die Zeile direkt darunter gilt als Kürzelzeile, wenn sie unter den Fachspalten kurze Kürzel enthält.
- Schülerzeilen folgen bis zur nächsten Leerzeile oder dem nächsten Kopf. Wiederholte Köpfe auf demselben Blatt (Druckseiten) werden zu einer Liste zusammengeführt.
- Fehlzeitspalten (`FZ`, `ges`, `ue`) sowie `S.b.jahre`, `Bemerkungen` und „Schulpflicht…“ sind als Nicht-Fach-Spalten ausgeschlossen.
- Klasse und Halbjahr werden, wenn möglich, aus den Kopfzellen gelesen („Zeugnisliste für Klasse“ + Zahl + Buchstabe, „Halbjahr“, „Schuljahr“, oder Freitext wie „Kursliste 5c“). Bei Abweichung vom Kurs gibt es nur eine Warnung, keinen Abbruch.

**Fach-Spalte finden:**
- Eine Synonymtabelle bildet Fachnamen auf Kürzel ab: D, E (inkl. E-G/E-E), M (inkl. M-G/M-E), GL, GP, EK, NW, BIO, CH, PH, KU, MU, TX, SP, KR, ER, IF, SW, AW, AH, AT, WPU.
- Das Fach wird aus dem Kursnamen abgeleitet (z. B. „6b Englisch“ → Klasse 6b, Fach E) und kann in der Rückfrage überschrieben werden.
- Bewertung, aus der die Rangfolge und der Vorschlag entstehen:
  1. gemerkter Spaltenkopf des Kurses
  2. exakter Fachtreffer + eigenes Kürzel
  3. Fachtreffer ohne Kürzel
  4. verwandtes Fach (z. B. NW für Biologie)
  5. nur Kürzeltreffer

  Die Lehrkraft bestätigt immer. Gibt es keinen Kandidaten, ist nichts vorausgewählt.
- Blattvorschlag: gemerkter Tab-Name, sonst das Blatt mit Namensliste und dem besten Spaltentreffer. Blätter ohne erkennbare Namensliste werden angezeigt, sind aber nicht wählbar.

**Namensabgleich:**
- Normalisierung: Kleinschreibung, Diakritika entfernen, `ä/ö/ü/ß` ≙ `ae/oe/ue/ss`, Bindestriche und Leerzeichen vereinheitlichen.
- Stufen:
  1. exakt (normalisiert, inkl. gemerkter Aliase) → automatisch
  2. Teilmenge der Vornamen oder vertauschte Vor-/Nachnamen → `ähnlich`
  3. Editierdistanz unter einer längenabhängigen Schwelle → `ähnlich`
  4. sonst `keine`
- Nachname und Vorname werden getrennt bewertet. Ein ähnlicher Nachname erlaubt kein Ausweichen auf einen anderen Vornamen (Geschwisterschutz).
- Die Zuordnung ist eineindeutig: Konkurrieren zwei Kinder um eine Zeile, wird daraus eine Rückfrage.

**Werte:**
- Übertragen wird der Anzeigewert der gewählten Spalte über die vorhandene Statusauflösung (Kurzform der Noten-Status, z. B. `2+`; Freitext unverändert).
- Status ohne Note (Standard-Lernstatus und eigene Nicht-Noten-Status) werden nicht geschrieben und als Hinweis gemeldet.
- Vergleich mit vorhandenem Zellinhalt: `2` (Zahl) gleich `"2"` (Text).

**Neue persistente Daten in `appData`:**
- globales `teacherShort` (Lehrerkürzel)
- pro Kurs `gradeExport: { taskId, subjectOverride, lastSheetName, lastColumnHeader }`
- pro Schüler `nameAliases: string[]` (bestätigte abweichende Schreibweisen)

Alle Felder sind optional, damit alte Backups ohne Migration funktionieren. Änderungen laufen über `saveToDB(true, …)` mit Undo.

**UI:**
- Neuer Eintrag im Export/Import-Modal (`teacher-only`).
- Ein mehrstufiger Dialog: Datei → Notenspalte im Lerntracker → **Tab wählen** (nur bei mehr als einem Tab) → **Zielspalte wählen** → Rückfragen zu Namen und Konflikten → Vorschau → Download.
- Tab- und Spaltenauswahl sind Listen mit vorausgewähltem Vorschlag.
- Alle Namen und Zellwerte gehen mit `escapeHTML` in `innerHTML`.
- Dateiname: Originalname + ` – <Fach> <Kürzel>.xlsx`.
- Für mehrere Fächer in einer Datei lädt die Lehrkraft die heruntergeladene Kopie erneut. Ein separater „Mehrere Kurse“-Modus ist nicht nötig.

**Versionierung** gemäß `.agents/rules/versioning.md` (Minor-Version, Changelog mit Tagesdatum).

## Testing Decisions

- **Seam:** Getestet wird nur das Modul „Notenlisten-Übertragung“ über seine drei Einstiegspunkte `planen`, `entscheiden` und `patcheBlattXml`. Interne Hilfsfunktionen wie Normalisierung und Distanzmaß werden nicht direkt getestet, sondern über das Verhalten von `planen`.
- **Werkzeug:** `node --test` mit den eingebauten Modulen `node:test` und `node:assert`, ohne `package.json` und ohne npm-Abhängigkeiten. Das Modul exportiert seine Einstiegspunkte so, dass Browser (globales Objekt) und Node (CommonJS/ESM) es laden können.
- **Gute Tests** prüfen äußeres Verhalten. Beispiel: „Bei einer Liste mit `Marim` im Kurs und `Maryam` in der Datei entsteht eine Namens-Rückfrage, und nach Bestätigung ist die Zelle K13 mit `2` geplant.“ Wie gerechnet wird, prüfen sie nicht.
- **Fixtures:** Zellraster werden im Test von Hand gebaut und bilden die Strukturen der echten Listen nach:
  - Zeugnisliste mit Kürzelzeile und wiederholtem Kopf in Zeile 38,
  - zwei Blätter, davon eins ohne Namen,
  - doppelte Fachspalte `E-G` mit unterschiedlichen Kürzeln,
  - Kopf ohne Kürzelzeile über zwei verbundene Zeilen,
  - Geschwister mit gleichem Nachnamen,
  - Tippfehler, fehlender Zweitname, Sonderzeichen,
  - belegte Zellen mit gleicher und anderer Note,
  - Blatt- und Spaltenwahl sind immer als Rückfrage enthalten, auch bei eindeutigem Treffer, und ohne Bestätigung entstehen keine Zellschreibungen,
  - nach einem Wechsel des Tabs werden Spalten und Vorschlag neu berechnet,
  - gemerkter Tab und gemerkte Spalte haben Vorrang,
  - eine Datei mit nur einem Tab hat keine Blattwahl,
  - Werte `nb`, `-`, `1-2`, `2+`.

  **Es werden keine echten Schülerlisten ins Repo eingecheckt.** Alle Namen in Fixtures sind erfunden.
- **XML-Tests:** `patcheBlattXml` bekommt kleine Worksheet-XML-Strings mit Stil-Attributen, Formeln, verbundenen Zellen und fehlenden Zeilen. Geprüft wird, dass nur die Zielzellen sich ändern und Reihenfolge und Attribute erhalten bleiben.
- **Prior art:** Im Repo gibt es noch keine Tests. Dieses Modul legt das Muster fest.
- **Manuelle Abnahme:** Die echten Listen der Lehrkraft (außerhalb des Repos) werden einmal im Browser durchgespielt. Die erzeugte Datei wird in Excel geöffnet und optisch mit dem Original verglichen.

## Out of Scope

- Import von Noten **aus** der Excel in den Lerntracker.
- Berechnung einer Zeugnisnote aus mehreren Spalten (Durchschnitt, Gewichtung).
- Umrechnen von Tendenzen (`2+` → `2`). Werte werden unverändert übertragen.
- Übertragen von Fehlzeiten und Bemerkungen.
- `.xls` (altes Format), `.ods`, CSV und Google Sheets.
- Direkter Export nach SchILD-NRW.
- Zusammenführen mehrerer Lehrkraft-Dateien beim Klassenlehrer.

## Further Notes

- Die Beispieldateien liegen außerhalb des Repos (`D:\Programming\Noten Import Schild\` und im Google-Drive-Spiegel). Sie enthalten echte Schülerdaten und dürfen nicht ins Repo gelangen. Am besten `*.xlsx` in `.gitignore` aufnehmen.
- Beobachtete Varianten in den Beispielen:
  - Kopf in Zeile 8 mit Kürzelzeile 9, wiederholt ab Zeile 38/70/76.
  - Kopf in Zeile 6/7 (verbunden) mit Kürzelzeile 7.
  - Blattname passt nicht zur Klasse (Datei „7c“, Blatt „5a“).
  - Mehrere Blätter mit unterschiedlichem Zweck.
  - Werte wie `nb`, `-`, `3-4`.
- Das Lehrerkürzel steht in manchen Listen zusätzlich im Kopf („Lehrer*in“). Dort ist es das Kürzel des **Klassenlehrers** und darf nicht mit dem eigenen verwechselt werden.
- Für die Aufteilung in Tickets bietet sich an: (1) Modul mit Kopf- und Spaltenerkennung, (2) Namensabgleich, (3) Zellkonflikte und `entscheiden`, (4) `patcheBlattXml`, (5) App-Adapter und Dialog, (6) Persistenz (Kürzel, Spaltenwahl, Aliase), Offline-Cache, Changelog.
