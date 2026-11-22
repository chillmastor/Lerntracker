# Spec: KI-Assistent über eine beliebige Chat-KI

Status: ready-for-agent

## Problem Statement

Viele Arbeiten im Lerntracker bestehen aus vielen kleinen Klicks: einen Kurs mit 25 Kindern anlegen, acht Kinder auf „Aufsteiger“ stellen, eine neue Aufgabe in drei Kursen anlegen, Fehltage nachtragen. Gleichzeitig hat die Lehrkraft Fragen an ihre eigenen Daten, die die App nicht beantwortet: „Wie ist der Notenschnitt in der 6c?“, „Wer hat bei M 3 noch nichts abgegeben?“, „Welche Kinder stehen in mehreren Kursen auf Basis?“.

Chat-KIs können so etwas gut, egal ob ChatGPT, Claude, Gemini, Le Chat, schulische Angebote oder lokale Modelle. Sie kennen aber weder die App noch die Daten und können die App nicht verändern. Eine eingebaute KI würde mit den Grundsätzen der App brechen: kein Backend, keine Übertragung von Schülerdaten, keine Abhängigkeit von einem Anbieter.

Der vorhandene CSV-Import taugt nicht als Rückweg für KI-Ergebnisse. Eine Datei mit mehreren Kursen ersetzt **alle** Kurse. Eine Datei mit einem Kurs legt immer einen **neuen** Kurs an, etwa „6c Mathe (2)“, statt den bestehenden zu ändern. Kinder-IDs, eigene Reihenfolge, gemerkte Notenlisten-Einstellungen und Namensaliase gehen dabei verloren. Außerdem müsste die Lehrkraft am iPad die Chat-Antwort erst als Datei speichern.

## Solution

Im Modal „Export & Import“ gibt es einen Bereich **„KI-Assistent“** mit zwei Schritten.

**1. Prompt kopieren.** Ein Knopf erzeugt einen langen, ausführlichen Prompt und kopiert ihn in die Zwischenablage. Bei Bedarf erscheint er zusätzlich in einem Textfeld zum manuellen Markieren. Der Prompt enthält:
- eine Erklärung der App: Kurse, Kinder, Aufgaben (Spalten), Lernstände, Status und Noten, Niveaus, Fehltage, Bemerkungen,
- **alle Daten** der App im Format der Komplett-Sicherung (CSV), damit die KI Fragen beantworten und Kinder, Kurse und Aufgaben exakt benennen kann,
- die verfügbaren Status mit Bezeichnung und Kürzel,
- die Regeln für Antworten: Fragen in normalem Text beantworten. Für Änderungen an der App eine **Änderungsliste** in einem klar markierten Block ausgeben, in einem festen, einfachen Zeilenformat, mit Beispiel.

Die Lehrkraft fügt den Prompt in einen beliebigen Chat ein und arbeitet dort ganz normal weiter: „Lege den Kurs 7a Englisch mit diesen Kindern an …“, „Stelle Tom, Lina und Ben in 6c Mathe auf Aufsteiger“, „Was ist der Notenschnitt bei der Klassenarbeit?“.

**2. KI-Antwort einfügen.** Ein zweites Feld „KI-Antwort einfügen“ nimmt die komplette Chat-Antwort auf, gern mit Erklärtext drumherum. Die App sucht den Block mit der Änderungsliste selbst heraus und zeigt eine **Vorschau** in Alltagssprache: „Neuer Kurs 7a Englisch mit 24 Kindern“, „6c Mathe: 3 Kinder auf Aufsteiger“, „1 Zeile nicht verstanden“. Bei unklaren Namen fragt sie nach, so wie beim Notenlisten-Export. Erst „Übernehmen“ ändert die Daten. Danach lässt sich alles mit „Rückgängig“ zurücknehmen.

**Warum eine Änderungsliste statt einer kompletten CSV als Rückweg:** Die KI bekommt alle Daten, gibt aber nur zurück, was sich ändern soll. Sie muss also nicht sechs Kurse mit 150 Kindern fehlerfrei abschreiben. Bei langen Antworten brechen Chat-KIs oft ab, verändern Umlaute oder lassen still Zeilen weg. Die Vorschau zeigt genau, was passiert. Bestehende Daten wie IDs, Reihenfolge, Notenlisten-Einstellungen und Aliase bleiben unangetastet, und ein Fehler der KI kann nie den ganzen Datenbestand überschreiben.

**Datenschutz-Hinweis:** Direkt beim Knopf steht ein kurzer Hinweis, der nichts blockiert. Der Prompt enthält personenbezogene Daten von Kindern, also Namen, Noten und Bemerkungen. Er gehört nur in datenschutzkonforme Sprachmodelle: ein lokal laufendes Modell (z. B. über Ollama oder LM Studio) oder ein von Schule bzw. Land freigegebenes KI-Angebot mit Auftragsverarbeitungsvertrag. Ein Link „Mehr erfahren“ klappt zwei, drei Sätze Erklärung auf.

## User Stories

1. Als Lehrkraft möchte ich im Modal „Export & Import“ einen Knopf „KI-Prompt kopieren“, damit ich mit einem Schritt in einer Chat-KI loslegen kann.
2. Als Lehrkraft möchte ich, dass der Prompt automatisch in der Zwischenablage landet, damit ich ihn im Chat nur einfügen muss.
3. Als Lehrkraft am iPad möchte ich den Prompt zusätzlich in einem Textfeld sehen, falls das Kopieren blockiert wird, damit ich ihn von Hand markieren kann.
4. Als Lehrkraft möchte ich, dass der Prompt die App ausführlich erklärt, damit jede Chat-KI ohne Vorwissen Kurse, Kinder, Aufgaben, Status, Niveaus, Fehltage und Bemerkungen versteht.
5. Als Lehrkraft möchte ich, dass der Prompt alle meine Kurse und Daten enthält, damit die KI Fragen dazu beantworten kann.
6. Als Lehrkraft möchte ich Fragen wie „Wie ist der Notenschnitt bei M 3 in der 6c?“ stellen, damit ich Auswertungen bekomme, die die App nicht bietet.
7. Als Lehrkraft möchte ich fragen können „Wer hat bei Aufgabe X noch nichts?“, damit ich schnell nachhaken kann.
8. Als Lehrkraft möchte ich, dass die KI reine Fragen in normalem Text ohne Änderungsliste beantwortet, damit Fragen nie meine Daten verändern.
9. Als Lehrkraft möchte ich sagen „Lege einen neuen Kurs 7a Englisch mit folgenden Kindern an …“, damit ich einen Kurs per Diktat oder eingefügter Liste anlegen kann.
10. Als Lehrkraft möchte ich sagen „Stelle Tom, Lina und Ben in 6c Mathe auf Aufsteiger“, damit ich Niveaus für viele Kinder auf einmal ändern kann.
11. Als Lehrkraft möchte ich über die KI Aufgaben (Spalten) in einem oder mehreren Kursen anlegen, damit ich eine neue Einheit schnell vorbereite.
12. Als Lehrkraft möchte ich über die KI Status und Noten für viele Zellen setzen, etwa „alle in der 6c bei M 2 auf In Bearbeitung“, damit ich mir viele Klicks spare.
13. Als Lehrkraft möchte ich über die KI Fehltage und Bemerkungen ergänzen oder ändern, damit ich Informationen aus einer Liste oder einem Diktat übernehmen kann.
14. Als Lehrkraft möchte ich über die KI Kurse und Aufgaben umbenennen, damit ich aufräumen kann.
15. Als Lehrkraft möchte ich über die KI Kinder zu einem bestehenden Kurs hinzufügen, damit Neuzugänge schnell eingetragen sind.
16. Als Lehrkraft möchte ich die komplette Antwort der KI einfügen können, samt Erklärungen und Code-Blöcken, damit ich den richtigen Teil nicht selbst herausschneiden muss.
17. Als Lehrkraft möchte ich vorher in Alltagssprache sehen, was sich ändert, damit ich es prüfen kann, bevor etwas passiert.
18. Als Lehrkraft möchte ich, dass die Vorschau die Änderungen nach Kurs gruppiert, damit ich auch bei vielen Änderungen den Überblick behalte.
19. Als Lehrkraft möchte ich, dass Zeilen, die die App nicht versteht, in der Vorschau aufgelistet werden, damit nichts still verloren geht.
20. Als Lehrkraft möchte ich gefragt werden, wenn ein Kindername nicht genau passt (Tippfehler, Umlaut, Vor- und Nachname vertauscht), damit das richtige Kind geändert wird.
21. Als Lehrkraft möchte ich gefragt werden, wenn ein Kurs- oder Aufgabenname nicht genau passt, damit Änderungen nicht in einem neuen, doppelten Kurs landen.
22. Als Lehrkraft möchte ich einzelne fragliche Zeilen überspringen können, damit der Rest trotzdem übernommen wird.
23. Als Lehrkraft möchte ich, dass Löschungen von Kindern, Aufgaben oder Kursen in der Vorschau rot hervorgehoben sind und extra bestätigt werden müssen, damit nichts Wichtiges aus Versehen verschwindet.
24. Als Lehrkraft möchte ich, dass das Überschreiben einer vorhandenen Note oder eines Status als „alt → neu“ angezeigt wird, damit ich ungewollte Überschreibungen bemerke.
25. Als Lehrkraft möchte ich alle Änderungen mit einem Klick übernehmen, damit die Arbeit der KI schnell wirksam wird.
26. Als Lehrkraft möchte ich den ganzen KI-Import mit einem „Rückgängig“ zurücknehmen können, damit ich bei einem falschen Ergebnis zum vorherigen Stand komme.
27. Als Lehrkraft möchte ich, dass alles, was die Änderungsliste nicht erwähnt, genau so bleibt, wie es war, damit ich dem Import vertrauen kann.
28. Als Lehrkraft möchte ich, dass neue Status aus der KI-Antwort (z. B. „Fehlt entschuldigt“) erst nach meiner Bestätigung angelegt werden, damit sich meine Statusliste nicht mit Tippfehlern füllt.
29. Als Lehrkraft möchte ich einen kurzen Hinweis, dass der Prompt personenbezogene Daten enthält und nur in datenschutzkonforme Modelle wie lokale Modelle gehört, damit ich bewusst entscheiden kann.
30. Als Lehrkraft möchte ich eine kurze Erklärung aufklappen können, was „datenschutzkonform“ hier heißt, damit ich weiß, worauf ich achten muss.
31. Als Lehrkraft möchte ich, dass der Prompt das aktuelle Datum nennt, damit die KI mit Angaben wie „heute“ sinnvoll umgeht.
32. Als Lehrkraft möchte ich, dass der Prompt die KI anweist, bei mehrdeutigen Aufträgen nachzufragen statt zu raten, damit die Änderungsliste weniger Fehler enthält.
33. Als Lehrkraft möchte ich, dass der Prompt die KI anweist, nach Korrekturen im Chat immer die komplette Änderungsliste neu auszugeben, damit ich nur die letzte Antwort einfügen muss.
34. Als Lehrkraft möchte ich über die KI aus einer eingefügten Tabelle einen neuen Kurs samt Aufgaben und Noten anlegen, damit ich alte Listen übernehmen kann.
35. Als Lehrkraft möchte ich, dass der KI-Assistent im Smartboard-Modus ausgeblendet ist, damit die Klasse den Prompt mit allen Daten nie sieht.
36. Als Lehrkraft möchte ich, dass Prompt-Erstellung und Auswertung der Antwort offline funktionieren, damit nur der Chat selbst Internet oder ein lokales Modell braucht.
37. Als Lehrkraft möchte ich eine klare Meldung, wenn der eingefügte Text keine Änderungsliste enthält, damit ich weiß, dass die KI nur eine Frage beantwortet hat.
38. Als Lehrkraft möchte ich, dass der Prompt auch mit kleineren und lokalen Modellen funktioniert, damit ich nicht auf eine Cloud-KI angewiesen bin. Er ist deshalb ausdrücklich, klar gegliedert und enthält ein Beispiel.
39. Als Lehrkraft möchte ich bei sehr vielen Daten trotzdem einen brauchbaren Prompt und einen Hinweis zur Länge bekommen, damit ich weiß, wann ein Modell vielleicht nicht alles verarbeiten kann.
40. Als Lehrkraft möchte ich den Prompt wahlweise auf den aktiven Kurs beschränken können, damit kleinere Modelle und kürzere Chats besser funktionieren und weniger Daten die App verlassen.

## Implementation Decisions

- **Neues Logikmodul „KI-Assistent“** neben der Einzeldatei, als UMD-Modul ohne DOM-Zugriff, wie Notenliste und Klassenliste (ADR 0001). Die Schnittstelle besteht aus drei Funktionen:
  - `promptErstellen(appData, optionen)` liefert den kompletten Prompt-Text. Optionen sind das aktuelle Datum und der Umfang (alle Kurse oder nur der aktive Kurs). Der Prompt enthält die Erklärung der App, die Formatbeschreibung der Änderungsliste mit Beispiel, die Statusliste, die Niveaus und die Daten im Format der Komplett-Sicherung. Dieses CSV entsteht aus gemeinsamer Logik, nicht aus einer zweiten Kopie des Export-Codes.
  - `planen(appData, antwortText, antworten?)` liefert einen Plan. Die Funktion holt die Änderungsliste aus beliebigem Chat-Text, liest die Zeilen und ordnet Kurse, Kinder, Aufgaben und Status den aktuellen Daten zu. Der Plan enthält: die Änderungen nach Kurs gruppiert (mit „alt → neu“), Rückfragen (unklare Namen, unbekannte Kurse oder Aufgaben, neue Status, Löschungen), nicht verstandene Zeilen und eine Zusammenfassung. Bei Antworten auf Rückfragen wird sie erneut aufgerufen, wie `entscheiden` in der Notenliste.
  - `anwenden(appData, plan)` liefert neue appData. Die Funktion ist rein: Sie verändert die Eingabe nicht, vergibt IDs für neue Objekte und fasst nicht erwähnte Daten nie an.
- **Format der Änderungsliste.** Es bleibt bewusst einfach, damit auch kleine Modelle es schaffen. Der Block steht zwischen den Markierungszeilen `### LERNTRACKER-ÄNDERUNGEN ###` und `### ENDE ###`. Darin steht ein Befehl pro Zeile, Felder sind durch `;` getrennt, Felder mit `;` stehen in doppelten Anführungszeichen. Die Reihenfolge der Felder ist je Befehl fest. Befehle (deutsch, Großbuchstaben):
  - `KURS_NEU; Kursname`
  - `KURS_UMBENENNEN; Kursname; neuer Name`
  - `KURS_LOESCHEN; Kursname`
  - `AUFGABE_NEU; Kursname; Aufgabentitel`
  - `AUFGABE_UMBENENNEN; Kursname; Aufgabentitel; neuer Titel`
  - `AUFGABE_LOESCHEN; Kursname; Aufgabentitel`
  - `KIND_NEU; Kursname; Nachname; Vorname[; Niveau]`
  - `KIND_LOESCHEN; Kursname; Nachname; Vorname`
  - `KIND_UMBENENNEN; Kursname; Nachname; Vorname; neuer Nachname; neuer Vorname`
  - `NIVEAU; Kursname; Nachname; Vorname; Basis|Aufsteiger|Gipfel`
  - `FEHLTAGE; Kursname; Nachname; Vorname; Zahl` setzt den Wert, `FEHLTAGE_PLUS; …; Zahl` zählt dazu.
  - `BEMERKUNG; Kursname; Nachname; Vorname; Text` ersetzt, `BEMERKUNG_PLUS; …; Text` hängt an.
  - `EINTRAG; Kursname; Nachname; Vorname; Aufgabentitel; Wert`. Der Wert ist eine Status-Bezeichnung oder ein Kürzel (z. B. „In Bearbeitung“, „IB“, „Note 2-“, „2-“) oder Freitext bzw. Punkte. Ein leerer Wert leert die Zelle.
  - `*` als Platzhalter für Nachname und Vorname heißt „alle Kinder des Kurses“, z. B. `EINTRAG; 6c Mathe; *; *; M 2; IB`.
- **Robustes Herauslesen.** Der Parser verträgt Code-Fences, Erklärtext davor und danach, Aufzählungszeichen, Groß- und Kleinschreibung der Befehle und fehlende Leerzeichen. `,` oder Tab statt `;` gelten nur, wenn die Zeile sonst eindeutig ist. Bei mehreren Blöcken zählt der letzte, denn der Prompt verlangt von der KI, die Liste immer komplett zu wiederholen.
- **Zuordnung der Namen.** Sie nutzt die Abgleichregeln der Notenliste: Umlautformen, Diakritika, vertauschte Vor- und Nachnamen, kleine Tippfehler mit Schwellen, Aliase. Am besten werden diese Regeln in eine gemeinsame Funktion herausgelöst statt kopiert. Exakter Treffer: keine Rückfrage. Naher Treffer: Rückfrage mit Vorschlag. Kein Treffer: Rückfrage „Kind auswählen / überspringen“. Gibt es bei `KIND_NEU` schon ein Kind mit demselben Namen, kommt eine Rückfrage statt eines Duplikats.
- **Zuordnung von Kursen und Aufgaben.** Zuerst exakt (ohne Groß-/Kleinschreibung, ohne Randleerzeichen), dann nach Ähnlichkeit. Ein Befehl für einen Kurs, der weder existiert noch weiter oben per `KURS_NEU` angelegt wird, führt zu einer Rückfrage, nie still zu einem neuen Kurs.
- **Status.** Werte werden aufgelöst wie bei der heutigen Zelleingabe (Bezeichnung, Kürzel, Sonderfall „nb“ wie bisher). Unbekannte Werte ohne Zahlenmuster werden zur Rückfrage „Neuen Status anlegen?“. Punkte und Freitext bleiben möglich wie heute.
- **Löschungen** erscheinen immer als Rückfrage mit ausdrücklicher Bestätigung, auch wenn der Name exakt passt.
- **Oberfläche** im Modal „Export & Import“, Bereich „KI-Assistent“ mit der Klasse `teacher-only`. Er enthält den Knopf „KI-Prompt kopieren“ mit dem Schalter „nur aktiver Kurs“, den Datenschutz-Hinweis mit aufklappbarer Erklärung, das Feld „KI-Antwort einfügen“ und den Knopf „Prüfen“. Vorschau und Rückfragen laufen in einem eigenen Modal, im selben Schrittmuster wie die Notenübertragung (Fragen → Vorschau → Fertig). Vor dem Übernehmen `pushUndoState('KI-Änderungen übernommen')`, danach `saveToDB()` und `renderAll()`. Ist die Gesamtansicht aktiv, wird neu eingepasst.
- **Länge des Prompts.** Die Oberfläche zeigt die ungefähre Länge (Zeichen und grobe Token-Schätzung) und empfiehlt ab einer Schwelle die Option „nur aktiver Kurs“.
- **Zwischenablage** über `navigator.clipboard.writeText`, sonst wird der Text im Textfeld markiert. Ein Download ist nicht nötig.
- **Kein Netzwerk.** Die App sendet nichts. Die Funktion erzeugt nur Text und liest eingefügten Text, sie funktioniert also offline.
- **Versionierung und Changelog** nach den Repo-Regeln.

## Testing Decisions

- Gute Tests prüfen nur das Verhalten von außen über die Schnittstelle des Moduls: Daten rein, Prompt, Plan oder neue Daten raus. Keine Tests interner Hilfsfunktionen.
- **Eine Testnaht: das Modul KI-Assistent**, getestet mit `node --test` wie die bestehenden Module, nur mit erfundenen Namen.
  - `promptErstellen`: Der Prompt enthält jeden Kurs, jedes Kind, jede Aufgabe und die Statusliste. Mit Umfang „aktiver Kurs“ enthält er nur diesen Kurs. Er enthält die Markierungszeilen und das Beispiel. Der CSV-Teil lässt sich mit der vorhandenen Import-Logik lesen.
  - `planen`: findet den Block in realistischen Chat-Antworten (Code-Fence, Erklärtext davor und danach, zwei Blöcke → der letzte zählt, Windows-Zeilenumbrüche, Aufzählungszeichen). Jeder Befehl wird erkannt. `*` wird zu allen Kindern. Exakte Namen erzeugen keine Rückfrage. Umlaut, Tippfehler und vertauschte Namen erzeugen Rückfragen mit dem richtigen Vorschlag. Ein unbekannter Kurs ohne `KURS_NEU` führt zu einer Rückfrage. Löschungen führen immer zu einer Rückfrage. Überschreibungen zeigen „alt → neu“. Ein unbekannter Status führt zu einer Rückfrage. Nicht verstandene Zeilen werden aufgelistet. Reiner Text ohne Block meldet „Keine Änderungen gefunden“.
  - `anwenden`: Das Eingabeobjekt bleibt unverändert. Nicht erwähnte Kurse, Kinder, IDs, `customOrder`, `gradeExport` und `nameAliases` bleiben identisch. Neue Kurse, Kinder und Aufgaben bekommen eindeutige IDs. Übersprungene Zeilen werden nicht angewendet. Das Ergebnis lässt sich exportieren und mit gleichem Inhalt wieder einlesen.
- **Vorbilder:** die Tests der Notenliste (`planen` und `entscheiden` mit Rückfragen und Antworten) und der Klassenliste (realistischer, unordentlicher Eingabetext).
- Die Oberfläche (Modal, Zwischenablage, Vorschau) wird wie bei den anderen Funktionen von Hand im Browser geprüft.

## Out of Scope

- Eine eingebaute KI, API-Schlüssel oder irgendeine Verbindung der App zu einem KI-Anbieter.
- Automatisches Senden des Prompts. Die Lehrkraft kopiert und fügt immer selbst ein.
- Eine komplette CSV als Rückweg und Änderungen am Verhalten des bestehenden CSV-Imports. Er bleibt eine Sicherungs- und Wiederherstellungsfunktion.
- Änderungen an der globalen Statusliste über das Anlegen neuer Status nach Bestätigung hinaus. Status löschen oder umfärben per KI ist nicht vorgesehen.
- Ändern von App-Einstellungen (Sortierung, Smartboard-Modus, Zoom) per KI.
- Pseudonymisieren der Daten im Prompt. Die Lehrkraft hat entschieden: Die KI bekommt alles, der Schutz läuft über den Hinweis und die Wahl des Modells.
- Prüfen, ob das gewählte Modell tatsächlich datenschutzkonform ist.

## Further Notes

- Mit der Lehrkraft entschieden: Der Prompt enthält **alle** Daten, damit Fragen wie „Notenschnitt“ und exakte Namen funktionieren. Ein kurzer Hinweis verweist auf datenschutzkonforme Sprachmodelle wie lokale Modelle. Der Rückweg als Änderungsliste per Kopieren und Einfügen ist die Empfehlung dieser Spec, weil er kürzer und überprüfbar ist und keine Daten zerstören kann. Die Lehrkraft hatte sich zwischen dieser Lösung und einer kompletten CSV noch nicht entschieden.
- „Kann das jede Chat-KI?“ Große Modelle (ChatGPT, Claude, Gemini, Mistral) schaffen das Format, Fragen zu den Daten und Änderungslisten in dieser Größe zuverlässig. Kleine lokale Modelle (grob unter 8 Milliarden Parametern) verstehen das Format, machen aber bei langen Datenmengen und beim Rechnen mehr Fehler. Vorschau, Rückfragen und die Option „nur aktiver Kurs“ fangen das ab. Bei Durchschnitten soll der Prompt die KI bitten, die verwendeten Werte zu nennen, damit die Lehrkraft nachprüfen kann.
- Große Datenmengen: Eine Komplett-Sicherung mit mehreren Kursen erreicht schnell Zehntausende Zeichen. Kostenlose Zugänge und lokale Modelle mit kleinem Kontextfenster schneiden dann womöglich ab. Deshalb gibt es die Längenanzeige und die Umfangsoption.
- Der Prompt soll ein kurzes Beispiel enthalten (Frage → Antwort in Text, Auftrag → Änderungsliste). Das verbessert die Formattreue kleinerer Modelle spürbar.
