# Spec: Kinder per Foto einer Klassenliste anlegen

Status: ready-for-agent

## Problem Statement

Für jeden neuen Kurs tippt die Lehrkraft heute alle Kinder einzeln in den Dialog „Kinder hinzufügen“, mit Vorname und Nachname pro Zeile. Bei 25 Kindern und mehreren Kursen pro Schuljahr kostet das viel Zeit. Besonders mühsam sind Namen mit Sonderzeichen (`Karabektaşoğlu`) oder mehreren Bestandteilen (`Al Mosaa`, `Alessia Sophia`).

Die Klassenliste liegt meist ohnehin als Ausdruck vor (SchILD-Ausdruck, Liste des Klassenlehrers, Aushang). Die Kopie aus einem bestehenden Kurs hilft nur, wenn die Klasse schon im Lerntracker ist.

## Solution

Im Dialog „Kinder hinzufügen“ und direkt beim Anlegen eines Kurses gibt es den Button **„Klassenliste fotografieren“**. Die Lehrkraft fotografiert die Liste oder wählt ein vorhandenes Bild.

Der Lerntracker erkennt den Text **lokal im Browser**, offline und ohne dass Daten das Gerät verlassen. Er zieht Vor- und Nachnamen heraus und füllt damit die bekannten Eingabezeilen des Dialogs vor. Unsichere Zeilen sind farbig markiert.

Die Lehrkraft korrigiert dort bei Bedarf, löscht falsche Zeilen und speichert wie gewohnt. Auch später kann sie jederzeit über „Schülerdaten bearbeiten“ nachbessern.

Als zweiter Weg gibt es **„Text einfügen“**. Hier kann die Lehrkraft einen Text einfügen, der durch dieselbe Namenserkennung läuft, z. B. aus der iPad-Funktion „Live Text“ oder kopiert aus einer E-Mail.

## User Stories

1. Als Lehrkraft möchte ich ein Foto einer Klassenliste machen, damit ich nicht jedes Kind einzeln eintippen muss.
2. Als Lehrkraft möchte ich auf dem iPad direkt die Kamera öffnen oder ein vorhandenes Bild aus der Fotomediathek wählen, damit ich auch eine früher fotografierte oder per Mail erhaltene Liste nutzen kann.
3. Als Lehrkraft möchte ich die Funktion direkt beim Anlegen eines neuen Kurses angeboten bekommen, damit Kurs und Kinder in einem Schritt entstehen.
4. Als Lehrkraft möchte ich die Funktion auch in einem bestehenden Kurs im Dialog „Kinder hinzufügen“ nutzen, damit ich nachträglich weitere Kinder ergänzen kann.
5. Als Lehrkraft möchte ich, dass die erkannten Kinder als vorausgefüllte Zeilen im Dialog erscheinen, damit ich sie in der gewohnten Ansicht prüfen und korrigieren kann.
6. Als Lehrkraft möchte ich, dass unsichere Zeilen farbig markiert sind, damit ich gezielt nur diese prüfe.
7. Als Lehrkraft möchte ich, dass bei der Markierung kurz steht, warum die Zeile unsicher ist (z. B. „Vor-/Nachname unklar getrennt“ oder „schlecht lesbar“), damit ich weiß, worauf ich achten muss.
8. Als Lehrkraft möchte ich falsch erkannte Zeilen mit einem Tipp löschen, damit Überschriften oder Störtext nicht als Kinder angelegt werden.
9. Als Lehrkraft möchte ich Vor- und Nachname einer Zeile mit einem Tipp tauschen können, damit ich eine falsch herum erkannte Zeile schnell korrigiere.
10. Als Lehrkraft möchte ich, dass Überschriften, Spaltenköpfe (`Name`, `Vorname`, `Nr.`), Klassenangaben, Lehrernamen, Datum, Schulname und Seitenzahlen ignoriert werden, damit nur Kinder in der Liste landen.
11. Als Lehrkraft möchte ich, dass Nummerierungen (`1.`, `12)`, `3 `) am Zeilenanfang entfernt werden, damit sie nicht im Namen stehen.
12. Als Lehrkraft möchte ich, dass Zusatzspalten wie Geburtsdatum, Geschlecht (`m`/`w`/`d`), Religion, Noten oder Fehlzeiten weggelassen werden, damit nur der Name übernommen wird.
13. Als Lehrkraft möchte ich, dass das Format „Nachname, Vorname“ richtig erkannt wird, damit Listen mit Komma korrekt aufgeteilt werden.
14. Als Lehrkraft möchte ich, dass Tabellen mit getrennten Spalten „Name“ und „Vorname“ richtig erkannt werden, auch wenn Namen aus mehreren Wörtern bestehen (`Arkan Kamel` / `Rittaj`), damit mehrteilige Namen nicht falsch getrennt werden.
15. Als Lehrkraft möchte ich, dass die Reihenfolge (Vorname zuerst oder Nachname zuerst) automatisch erkannt wird, über Spaltenköpfe oder die alphabetische Sortierung der Liste, damit ich nicht jede Zeile tauschen muss.
16. Als Lehrkraft möchte ich, dass Zeilen, deren Aufteilung unklar ist, als unsicher markiert werden statt falsch geraten, damit ich weiß, wo ich nachschauen muss.
17. Als Lehrkraft möchte ich, dass Sonderzeichen und Umlaute (`ä`, `ö`, `ü`, `ß`, `ş`, `ğ`, `é`) erhalten bleiben, damit Namen korrekt geschrieben sind.
18. Als Lehrkraft möchte ich, dass typische Erkennungsfehler bereinigt werden (überzählige Leerzeichen, `|` statt `l`, Satzzeichen am Rand), damit ich weniger nachbessern muss.
19. Als Lehrkraft möchte ich, dass Namen mit Bindestrich (`Mia-Sophia`) und mehreren Vornamen erhalten bleiben, damit vollständige Namen übernommen werden.
20. Als Lehrkraft möchte ich, dass Kinder, die schon im Kurs sind, erkannt und nicht doppelt angelegt werden, damit keine Duplikate entstehen.
21. Als Lehrkraft möchte ich sehen, wie viele Kinder bereits vorhanden waren und übersprungen wurden, damit ich nachvollziehen kann, was passiert ist.
22. Als Lehrkraft möchte ich mehrere Fotos nacheinander hinzufügen (z. B. Seite 1 und 2 der Liste), damit auch lange Listen vollständig erfasst werden.
23. Als Lehrkraft möchte ich, dass Kinder, die auf zwei Fotos doppelt vorkommen, nur einmal übernommen werden, damit Überlappungen beim Fotografieren nicht stören.
24. Als Lehrkraft möchte ich, dass ein Kursname vorgeschlagen wird, wenn das Foto eine Klassenangabe enthält (z. B. „Klasse 5b“), damit ich ihn nur noch um das Fach ergänzen muss.
25. Als Lehrkraft möchte ich während der Erkennung einen Fortschritt sehen, damit ich weiß, dass die App arbeitet.
26. Als Lehrkraft möchte ich die Erkennung abbrechen können, damit ich bei einem falschen Foto nicht warten muss.
27. Als Lehrkraft möchte ich einen hilfreichen Hinweis bekommen, wenn keine Namen erkannt wurden (z. B. „Foto gerade, hell und nah aufnehmen“), damit ich es erneut versuchen kann.
28. Als Lehrkraft möchte ich, dass schräg oder etwas dunkel aufgenommene Fotos vor der Erkennung aufbereitet werden (Graustufen, Kontrast, Drehung nach EXIF), damit die Erkennung trotzdem gelingt.
29. Als Lehrkraft möchte ich, dass die Erkennung ohne Internet funktioniert, nachdem ich sie einmal benutzt habe, damit ich sie auch im Klassenraum ohne WLAN nutzen kann.
30. Als Lehrkraft möchte ich, dass das Foto und die erkannten Namen das Gerät nie verlassen und das Foto nicht gespeichert wird, damit der Datenschutz gewahrt bleibt.
31. Als Lehrkraft möchte ich einen Text einfügen können (z. B. aus iPad-„Live Text“ oder aus einer E-Mail), der genauso in Namen zerlegt wird, damit ich auch ohne Foto schnell viele Kinder anlege.
32. Als Lehrkraft möchte ich, dass das Anlegen per Foto mit „Rückgängig“ zurückgenommen werden kann, damit ein misslungener Import keinen Schaden anrichtet.
33. Als Lehrkraft möchte ich, dass per Foto angelegte Kinder dieselben Standardwerte bekommen wie manuell angelegte (Niveau, Fehltage 0), damit sie sich nicht unterscheiden.
34. Als Lehrkraft möchte ich, dass die Funktion im Smartboard-Modus nicht sichtbar ist, damit die Klasse keine Listen sieht.
35. Als Lehrkraft möchte ich, dass die Funktion die App beim normalen Start nicht langsamer macht, damit der Unterrichtsalltag nicht leidet.

## Implementation Decisions

**Neues Modul „Klassenlisten-Erkennung“ in einer eigenen Skriptdatei.** Das folgt derselben Architekturentscheidung wie der Notenlisten-Export: Logik außerhalb von index.html, damit sie ohne Browser testbar ist. Kein Build-Step, Einbindung per `<script>`, Eintrag im Service-Worker-Cache. Liegt das ADR aus dem Notenexport noch nicht vor, wird es mit diesem Feature angelegt.

Das Modul kennt weder DOM, `appData` noch die OCR-Bibliothek. Es hat einen Einstiegspunkt:

- **`namenErkennen(erkannterText, kontext) → ergebnis`**
  - `erkannterText`: Zeilen, jede mit ihren Wörtern. Pro Wort Text, optional Erkennungssicherheit (0–100) und horizontale Position (links/rechts). Eingefügter Text wird in dieselbe Form gebracht, ohne Positionen und ohne Sicherheit.
  - `kontext`: bereits vorhandene Kinder des Kurses (Vor- und Nachname) zur Duplikaterkennung.
  - `ergebnis`: `kinder` (je Vorname, Nachname, `unsicher: boolean`, `grund?`), `übersprungen` (bereits vorhanden), `kursVorschlag?` (erkannte Klassenangabe, z. B. „5b“), `hinweis?` (wenn nichts erkannt wurde).

**Erkennungsregeln im Modul:**
- **Störzeilen verwerfen:** Spaltenköpfe, Überschriften mit Schlüsselwörtern (Klasse, Schuljahr, Lehrer, Datum, Seite, Schule, Kursliste, Zeugnisliste), Zeilen ohne Buchstaben, Zeilen mit nur einem Zeichen.
- **Zeilen säubern:** Nummerierung am Anfang entfernen. Zusatzspalten am Ende entfernen: Datum, Zahlen, einzelne Geschlechtskürzel, bekannte Kürzel wie Konfession.
- **Aufteilen in Vor- und Nachname**, in dieser Priorität:
  1. Komma („Nachname, Vorname“).
  2. Spaltengrenze aus den Wortpositionen: der größte horizontale Abstand, der in den meisten Zeilen an ähnlicher Stelle liegt.
  3. Bei nur zwei Wörtern: einfache Trennung nach der erkannten Reihenfolge.
  4. Sonst wird als unsicher markiert. Gefüllt wird mit dem besten Vorschlag: letztes Wort ist Nachname bei Vorname-zuerst, erstes Wort bei Nachname-zuerst.
- **Reihenfolge erkennen:** Zuerst über Spaltenköpfe („Name/Nachname“ vor „Vorname“). Sonst ist das Feld der Nachname, nach dem die Liste alphabetisch sortiert ist. Fällt beides aus, gilt „Nachname zuerst“, so wie in SchILD-Ausdrucken üblich.
- **Unsicher** ist eine Zeile auch dann, wenn ein Wort unter einer Sicherheitsschwelle liegt.
- **Duplikate** werden normalisiert verglichen (Groß-/Kleinschreibung, Diakritika, Leerzeichen), sowohl gegen vorhandene Kinder als auch innerhalb des Ergebnisses. Mehrere Fotos werden gesammelt und gemeinsam durch das Modul geschickt.

**OCR-Adapter (in der App, nicht unit-getestet):**
- Tesseract.js mit deutschem Sprachmodell, feste Version per CDN.
- Wird erst beim ersten Klick geladen (Lazy Load), damit der App-Start nicht leidet.
- Worker, WASM-Kern und Sprachdaten kommen nach dem ersten Laden in den Service-Worker-Cache, damit die Erkennung danach offline funktioniert.
- Vorverarbeitung im Canvas: EXIF-Drehung, Verkleinern auf eine sinnvolle Maximalbreite, Graustufen, Kontrast.
- Der Adapter liefert Zeilen mit Wörtern, Sicherheit und Positionen an das Modul.
- Fortschritt und Abbruch laufen über den Worker.
- Das Bild wird nur im Speicher verarbeitet und nie persistiert.

**Anbindung an den vorhandenen Dialog „Kinder hinzufügen“:**
- Neue Buttons „Klassenliste fotografieren“ (Dateiauswahl mit `accept="image/*"`, mehrere Bilder erlaubt) und „Text einfügen“.
- Das Ergebnis füllt die vorhandenen Eingabezeilen. Eine leere Startzeile wird ersetzt, bestehende manuelle Zeilen bleiben stehen.
- Unsichere Zeilen bekommen eine Warnfarbe, ein Hinweis-Icon mit dem Grund und einen Tausch-Button (Vor-/Nachname).
- Gespeichert wird über den vorhandenen Batch-Speicherweg, inklusive Undo-Snapshot, Standardwerten und Toast. Die Zusammenfassung „x hinzugefügt, y bereits vorhanden“ wird ergänzt.

**Anbindung an „Kurs anlegen“:**
- Zusätzliche Option „Kinder per Foto hinzufügen“ neben „Schüler aus aktuellem Kurs übernehmen“.
- Nach dem Anlegen öffnet sich direkt der Dialog „Kinder hinzufügen“ mit gestarteter Fotoauswahl.
- Ein `kursVorschlag` füllt das Namensfeld nur dann vor, wenn die Lehrkraft dort noch nichts eingegeben hat.

**Keine Schema-Änderung an `appData`.**

Alle Namen gehen mit `escapeHTML` in `innerHTML`. Alle neuen Bedienelemente sind `teacher-only`. Versionierung gemäß `.agents/rules/versioning.md`.

## Testing Decisions

- **Seam:** Getestet wird nur `namenErkennen` über `node --test` (`node:test`, `node:assert`), ohne `package.json` und ohne npm-Abhängigkeiten. Das ist dasselbe Muster wie beim Modul „Notenlisten-Übertragung“. Normalisierung, Spaltengrenzen-Suche und Reihenfolge-Heuristik werden nicht einzeln getestet, sondern über das Ergebnis.
- **Gute Tests** beschreiben eine Eingabe, wie sie aus einer echten Liste kommt, und prüfen die resultierende Namensliste samt Unsicher-Markierungen. Beispiel: „Zeilen `12. Arkan Kamel  Rittaj  w  03.04.2014` mit Spaltenlücke nach `Kamel` → Nachname `Arkan Kamel`, Vorname `Rittaj`, sicher.“
- **Abzudeckende Fälle:**
  - Tabelle mit Kopf „Name | Vorname“ und Spaltenpositionen
  - Komma-Format
  - Vorname-zuerst-Liste ohne Kopf
  - mehrteilige Vor- und Nachnamen ohne Positionen (→ unsicher)
  - Nummerierung und Zusatzspalten
  - Kopf- und Fußzeilen (Schulname, Datum, Seitenzahl)
  - Sonderzeichen
  - niedrige Erkennungssicherheit
  - Duplikate gegen vorhandene Kinder und zwischen zwei Fotos
  - Klassenangabe für den Kursvorschlag
  - leeres oder unbrauchbares Ergebnis (→ Hinweis)
  - eingefügter Text ohne Positionen
- **Fixtures** sind von Hand gebaute Zeilen- und Wortstrukturen mit **erfundenen Namen**. Echte Klassenlisten und Fotos kommen nicht ins Repo.
- **Prior art:** das Testmuster des Moduls „Notenlisten-Übertragung“, falls bereits umgesetzt. Sonst legt dieses Modul das Muster fest.
- **Manuelle Abnahme:** Auf dem iPad je einmal fotografieren: einen SchILD-Ausdruck, eine Zeugnisliste des Klassenlehrers (ausgedruckt) und eine schräg und dunkel aufgenommene Liste. Danach offline wiederholen.

## Out of Scope

- Handschriftliche Listen. Die lokale Erkennung ist dafür nicht verlässlich genug, die Lehrkraft bessert manuell nach.
- Cloud- oder KI-Dienste zur Texterkennung. Das wurde bewusst aus Datenschutzgründen ausgeschlossen.
- Übernahme weiterer Daten vom Foto (Geburtsdatum, Notizen, Förderbedarf, Fehlzeiten, Noten).
- Automatisches Zuschneiden oder Perspektivkorrektur des Fotos.
- Import aus PDF- oder Excel-Dateien. Für Excel existieren CSV-Import und Notenlisten-Logik.
- Abgleich der Namen mit anderen Kursen derselben Klasse.

## Further Notes

- Die vorhandene Kopie „Schüler aus aktuellem Kurs übernehmen“ bleibt unverändert und ist weiterhin der schnellste Weg, wenn die Klasse schon im Lerntracker ist.
- Die Sprachdaten von Tesseract sind mehrere MB groß. Das Lazy Load und der Cache erst nach der ersten Nutzung sind deshalb wichtig für die Startzeit und für iPads mit wenig Speicher.
- Die Funktion „Text einfügen“ ist ein billiger, robuster Nebenweg. iPadOS erkennt mit „Live Text“ selbst Text in Fotos, lokal auf dem Gerät und oft besser als Tesseract. Der eingefügte Text läuft durch dieselbe Seam.
- Für die Aufteilung in Tickets bietet sich an:
  1. `namenErkennen` mit Säuberung und Komma- und Zwei-Wort-Fällen
  2. Spaltengrenzen und Reihenfolge
  3. Duplikate, Kursvorschlag und Hinweis
  4. „Text einfügen“ im Dialog
  5. OCR-Adapter mit Lazy Load, Vorverarbeitung, Fortschritt und Abbruch
  6. Offline-Cache, Einstieg über „Kurs anlegen“ und Changelog
