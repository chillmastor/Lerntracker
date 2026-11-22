/*
 * KI-Assistent
 * Erzeugt einen Prompt, mit dem eine beliebige Chat-KI die App und alle Daten versteht, und liest
 * die Änderungsliste aus der Antwort der KI wieder ein (Vorschau, Rückfragen, Anwenden).
 * Reine Logik ohne DOM (siehe docs/adr/0001). Der Namensabgleich kommt aus der Notenliste.
 *
 * Einstiegspunkte:
 *   promptErstellen(appData, { datum, umfang: 'alle' | 'aktiv' }) → Text
 *   planen(appData, antwortText, antworten?)                      → plan
 *   anwenden(appData, plan)                                       → neue appData (Eingabe bleibt unverändert)
 * Hilfe für den Adapter:
 *   sicherungsCsv(appData, { kursIds?, sortiere? })               → CSV im Format der Komplett-Sicherung
 */
(function (root, factory) {
  const notenliste = (root && root.Notenliste) || (typeof require === 'function' ? require('./notenliste.js') : null);
  const api = factory(notenliste);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KiAssistent = api;
})(typeof self !== 'undefined' ? self : this, function (Notenliste) {
  'use strict';

  const START = '### LERNTRACKER-ÄNDERUNGEN ###';
  const ENDE = '### ENDE ###';
  const NIVEAUS = { basis: 'Basis', aufsteiger: 'Aufsteiger', gipfel: 'Gipfel' };
  const FARBEN = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b', '#6366f1'];

  // Befehle: Felder in fester Reihenfolge; `rest` = letztes Feld darf „;“ enthalten
  const BEFEHLE = {
    KURS_NEU: { felder: ['kurs'] },
    KURS_UMBENENNEN: { felder: ['kurs', 'neu'] },
    KURS_LOESCHEN: { felder: ['kurs'] },
    AUFGABE_NEU: { felder: ['kurs', 'titel'] },
    AUFGABE_UMBENENNEN: { felder: ['kurs', 'titel', 'neu'] },
    AUFGABE_LOESCHEN: { felder: ['kurs', 'titel'] },
    KIND_NEU: { felder: ['kurs', 'nach', 'vor'], optional: ['niveau'] },
    KIND_LOESCHEN: { felder: ['kurs', 'nach', 'vor'] },
    KIND_UMBENENNEN: { felder: ['kurs', 'nach', 'vor', 'neuNach', 'neuVor'] },
    NIVEAU: { felder: ['kurs', 'nach', 'vor', 'niveau'] },
    FEHLTAGE: { felder: ['kurs', 'nach', 'vor', 'zahl'] },
    FEHLTAGE_PLUS: { felder: ['kurs', 'nach', 'vor', 'zahl'] },
    BEMERKUNG: { felder: ['kurs', 'nach', 'vor', 'text'], rest: true },
    BEMERKUNG_PLUS: { felder: ['kurs', 'nach', 'vor', 'text'], rest: true },
    EINTRAG: { felder: ['kurs', 'nach', 'vor', 'titel', 'wert'], rest: true }
  };

  // ---------------------------------------------------------------------------
  // Hilfen
  // ---------------------------------------------------------------------------
  const kopie = o => JSON.parse(JSON.stringify(o));
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const kindName = s => `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.name || 'Kind';
  const csvFeld = s => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
  function niveauAus(t) {
    const v = norm(t);
    if (!v) return null;
    if (v.includes('basis') || v.includes('camp') || v.includes('grund')) return 'basis';
    if (v.includes('gipfel') || v.includes('hoch')) return 'gipfel';
    if (v.includes('aufsteig')) return 'aufsteiger';
    return null;
  }
  /** Wie resolveStatusInfo der App: ID, dann Kürzel, dann Bezeichnung; sonst freier Text. Liefert die Status-ID oder den Text. */
  function statusId(appData, wert) {
    if (!wert || wert === 'stat_nb') return 'stat_nb';
    const stats = appData.statuses || [];
    const t = String(wert).trim();
    const s = stats.find(x => x.id === wert) || stats.find(x => norm(x.short) === norm(t)) || stats.find(x => norm(x.label) === norm(t));
    return s ? s.id : t;
  }
  function statusLabel(appData, wert) {
    const stats = appData.statuses || [];
    const id = statusId(appData, wert);
    if (id === 'stat_nb') return (stats.find(s => s.id === 'stat_nb') || stats[0] || { label: 'Nicht begonnen' }).label;
    const s = stats.find(x => x.id === id);
    return s ? s.label : String(id);
  }
  function woerter(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  }
  /** „6c Mathe“ ~ „6c Mathematik“: alle Wörter des kürzeren Namens stecken (ggf. als Anfang) im längeren. */
  function aehnlich(a, b) {
    const wa = woerter(a), wb = woerter(b);
    if (!wa.length || !wb.length) return false;
    if (wa.join(' ') === wb.join(' ')) return true;
    const [kurz, lang] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    return kurz.every(k => lang.some(l => l === k || (Math.min(k.length, l.length) >= 3 && (l.startsWith(k) || k.startsWith(l)))));
  }

  // ---------------------------------------------------------------------------
  // CSV der Komplett-Sicherung
  // ---------------------------------------------------------------------------
  function sicherungsCsv(appData, optionen) {
    const o = optionen || {};
    const kurse = (appData.courses || []).filter(c => !o.kursIds || o.kursIds.includes(c.id));
    let csv = '';
    for (const course of kurse) {
      csv += `=== KURS: ${course.name} ===\r\n`;
      const kopf = ['Nachname', 'Vorname', 'Niveau', 'Fehltage', ...course.tasks.map(t => csvFeld(t.title)), 'Bemerkung / Förderbedarf'];
      csv += kopf.join(';') + '\r\n';
      const kinder = o.sortiere ? o.sortiere(course.students) : course.students;
      for (const s of kinder) {
        const zeile = [csvFeld(s.lastName || ''), csvFeld(s.firstName || ''), csvFeld(NIVEAUS[s.level || 'aufsteiger'] || 'Aufsteiger'), s.absenceCount || 0];
        for (const t of course.tasks) zeile.push(csvFeld(statusLabel(appData, (course.progress || {})[`${s.id}_${t.id}`] || '')));
        zeile.push(csvFeld(s.note || ''));
        csv += zeile.join(';') + '\r\n';
      }
      csv += '\r\n';
    }
    return csv;
  }

  // ---------------------------------------------------------------------------
  // Prompt
  // ---------------------------------------------------------------------------
  function promptErstellen(appData, optionen) {
    const o = optionen || {};
    const aktiv = o.umfang === 'aktiv';
    const kursIds = aktiv ? [appData.activeCourseId] : null;
    const kurse = (appData.courses || []).filter(c => !kursIds || kursIds.includes(c.id));
    const status = (appData.statuses || []).map(s => `- ${s.label} (Kürzel: ${s.short})`).join('\n');
    const csv = sicherungsCsv(appData, { kursIds, sortiere: o.sortiere });
    return `Du bist mein Assistent für den „Lernfortschritts-Tracker“, eine App für Lehrkräfte. Ich bin Lehrkraft. Du kannst die App nicht direkt bedienen. Ich gebe dir hier alle nötigen Informationen und meine Daten. Du beantwortest meine Fragen dazu und schreibst mir bei Bedarf eine Änderungsliste, die ich in die App einfüge. Die App prüft sie, zeigt mir eine Vorschau und übernimmt sie erst nach meiner Bestätigung.

Heutiges Datum: ${o.datum || new Date().toLocaleDateString('de-DE')}

## So ist die App aufgebaut

- **Kurse:** z. B. „6c Mathe“ oder „5a Deutsch“. Jeder Kurs hat eigene Kinder und eigene Aufgaben.
- **Kinder:** gehören zu einem Kurs, jeweils mit Nachname und Vorname. Dasselbe Kind kann in mehreren Kursen stehen, dort ist es jeweils ein eigener Eintrag.
- **Niveau** jedes Kindes, genau einer dieser drei Werte: Basis, Aufsteiger, Gipfel. Standard ist Aufsteiger.
- **Fehltage:** eine ganze Zahl pro Kind und Kurs.
- **Bemerkung / Förderbedarf:** freier Text pro Kind und Kurs.
- **Aufgaben:** die Spalten eines Kurses, z. B. Materialien, Tests, Klassenarbeiten („M 1“, „Klassenarbeit 1“).
- **Einträge:** In jeder Zelle Kind × Aufgabe steht entweder ein Status bzw. eine Note aus der Liste unten oder ein freier Text bzw. Punkte (z. B. „12 Punkte“, „14/15“, „krank“). „${statusLabel(appData, '')}“ heißt: noch nichts eingetragen.

### Verfügbare Status und Noten
${status}

Noten mit „+“ und „-“ sind Feinabstufungen. Für einen Notenschnitt zählt z. B. „Note 2-“ als 2,3 und „Note 2+“ als 1,7.

## Meine Daten${aktiv ? ' (nur der aktive Kurs)' : ''}

Die Daten folgen als CSV, getrennt durch Semikolon. Jeder Kurs beginnt mit einer Zeile „=== KURS: Name ===“, danach kommen Kopfzeile und je eine Zeile pro Kind. Die Spalten zwischen „Fehltage“ und „Bemerkung / Förderbedarf“ sind die Aufgaben des Kurses.${kurse.length ? '' : ' (Noch keine Kurse vorhanden.)'}

\`\`\`csv
${csv.trim()}
\`\`\`

## So antwortest du

1. **Fragen** (z. B. „Wie ist der Notenschnitt bei Klassenarbeit 1?“, „Wer hat M 3 noch nicht abgeschlossen?“) beantwortest du in normalem Text, ohne Änderungsliste. Nenne bei Berechnungen kurz die verwendeten Werte, damit ich nachprüfen kann. Ignoriere dabei Zellen mit „${statusLabel(appData, '')}“, sofern ich nichts anderes sage.
2. **Aufträge**, die etwas in der App ändern sollen, setzt du in eine Änderungsliste um. Sie steht immer genau zwischen diesen beiden Zeilen:
${START}
${ENDE}
   Gib die ganze Änderungsliste samt dieser beiden Zeilen **immer in einem Code-Block** aus (mit \`\`\`text am Anfang und \`\`\` am Ende). Viele Chat-Programme zeigen dann einen Kopieren-Knopf an, und ich kann die Liste mit einem Klick kopieren.
3. Innerhalb der Liste steht ein Befehl pro Zeile. Felder werden durch Semikolon getrennt. Enthält ein Text selbst ein Semikolon, steht er in doppelten Anführungszeichen. Schreib Kurs-, Aufgaben- und Kindernamen **genau so wie in den Daten**.
4. Ist ein Auftrag unklar, etwa weil es zwei Kinder mit ähnlichem Namen gibt oder der Kurs nicht feststeht, frag mich zuerst und rate nicht.
5. Wenn ich nach deiner Antwort noch etwas korrigiere, gib die **komplette** Änderungsliste noch einmal aus, nicht nur den geänderten Teil. Ich füge immer nur deine letzte Liste ein.
6. Ändere nur, was ich verlange. Was nicht in der Liste steht, bleibt in der App unverändert. Du musst also nie die ganzen Daten wiederholen.
7. Schreib vor der Liste ein, zwei Sätze, was sie bewirkt.
8. **Nach jeder Änderungsliste** erklärst du mir kurz, wie ich sie übernehme, etwa so: „So übernimmst du die Änderungen: Kopiere den Block oben (am einfachsten über den Kopieren-Knopf am Code-Block). Öffne im Lerntracker „Export & Import“, klappe ganz unten „KI-Assistent“ auf und füge den Text bei „Antwort der KI einfügen“ ein. Tippe auf „Änderungen prüfen“, kontrolliere die Vorschau und tippe auf „Übernehmen“. Mit „Rückgängig“ lässt sich alles zurücknehmen.“ Fasse dich bei späteren Listen im selben Chat kürzer, z. B. „Wie vorhin: Block kopieren und in der App einfügen.“

### Befehle der Änderungsliste

KURS_NEU; Kursname
KURS_UMBENENNEN; Kursname; neuer Kursname
KURS_LOESCHEN; Kursname
AUFGABE_NEU; Kursname; Aufgabentitel
AUFGABE_UMBENENNEN; Kursname; Aufgabentitel; neuer Titel
AUFGABE_LOESCHEN; Kursname; Aufgabentitel
KIND_NEU; Kursname; Nachname; Vorname; Niveau        (Niveau ist optional)
KIND_UMBENENNEN; Kursname; Nachname; Vorname; neuer Nachname; neuer Vorname
KIND_LOESCHEN; Kursname; Nachname; Vorname
NIVEAU; Kursname; Nachname; Vorname; Basis|Aufsteiger|Gipfel
FEHLTAGE; Kursname; Nachname; Vorname; Zahl          (setzt die Fehltage auf diese Zahl)
FEHLTAGE_PLUS; Kursname; Nachname; Vorname; Zahl     (zählt Fehltage dazu)
BEMERKUNG; Kursname; Nachname; Vorname; Text         (ersetzt die Bemerkung)
BEMERKUNG_PLUS; Kursname; Nachname; Vorname; Text    (hängt Text an die Bemerkung an)
EINTRAG; Kursname; Nachname; Vorname; Aufgabentitel; Wert

Hinweise:
- Bei EINTRAG ist der Wert ein Status oder eine Note aus der Liste oben (Bezeichnung oder Kürzel, z. B. „In Bearbeitung“, „IB“, „Note 2-“, „2-“) oder ein freier Text bzw. Punkte. Ein leerer Wert leert die Zelle.
- „*; *“ statt Nachname und Vorname heißt „alle Kinder dieses Kurses“, z. B. EINTRAG; 6c Mathe; *; *; M 2; In Bearbeitung
- Ein neuer Kurs braucht zuerst KURS_NEU, dann folgen seine Aufgaben (AUFGABE_NEU) und Kinder (KIND_NEU). Die Reihenfolge der Zeilen zählt.
- Löschen nur, wenn ich es ausdrücklich verlange.

### Beispiele

Ich: „Wie viele Kinder hat die 6c Mathe auf Basis?“
Du: „In 6c Mathe stehen 2 Kinder auf Basis: Max Muster und Erika Beispiel.“ (keine Änderungsliste)

Ich: „Leg den Kurs 7a Englisch mit Mia Beispiel und Emre Muster an, Mia auf Gipfel. Dazu eine Aufgabe Vokabeltest 1. Und stell Max Muster in der 6c Mathe auf Aufsteiger.“
Du:
„Damit lege ich den Kurs 7a Englisch mit zwei Kindern und einer Aufgabe an und stelle Max Muster auf Aufsteiger.
\`\`\`text
${START}
KURS_NEU; 7a Englisch
AUFGABE_NEU; 7a Englisch; Vokabeltest 1
KIND_NEU; 7a Englisch; Beispiel; Mia; Gipfel
KIND_NEU; 7a Englisch; Muster; Emre
NIVEAU; 6c Mathe; Muster; Max; Aufsteiger
${ENDE}
\`\`\`
So übernimmst du die Änderungen: Kopiere den Block oben über den Kopieren-Knopf. Öffne im Lerntracker „Export & Import“ → „KI-Assistent“, füge ihn bei „Antwort der KI einfügen“ ein und tippe auf „Änderungen prüfen“. In der Vorschau siehst du alles noch einmal, bevor du übernimmst.“

(Die Namen in den Beispielen sind ausgedacht. Benutze immer die Namen aus meinen Daten.)

## Deine erste Antwort

Wenn du alles verstanden hast, begrüße mich kurz und erkläre in wenigen Zeilen, was ich jetzt mit dir machen kann. Nimm dabei **Beispiele aus meinen echten Daten** (meine Kurs-, Aufgaben- und Niveau-Namen), zum Beispiel:
- Fragen stellen, etwa „Wer steht in der [Kurs] auf Aufsteiger?“, „Wie ist der Notenschnitt bei [Aufgabe]?“ oder „Wer hat [Aufgabe] noch nicht abgeschlossen?“
- Änderungen beauftragen, etwa „Stelle [Kind] und [Kind] auf Gipfel“, „Lege einen neuen Kurs mit diesen Kindern an: …“ oder „Trage bei [Aufgabe] für alle In Bearbeitung ein“
Sag dazu in einem Satz, dass Änderungen als Liste kommen, die ich in der App einfüge und dort vor dem Übernehmen prüfe. Halte die Begrüßung kurz, ohne die Daten aufzulisten. Dann warte auf meine Fragen und Aufträge.`;
  }

  // ---------------------------------------------------------------------------
  // Antwort lesen
  // ---------------------------------------------------------------------------
  function befehlsName(t) {
    return String(t || '').trim().toUpperCase()
      .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS')
      .replace(/[\s-]+/g, '_');
  }
  function zerlege(zeile, trenner) {
    const felder = [];
    let akt = '';
    let inAnf = false;
    for (let i = 0; i < zeile.length; i++) {
      const c = zeile[i];
      if (c === '"' || c === '„' || c === '“' || c === '”') {
        if (c === '"' && inAnf && zeile[i + 1] === '"') { akt += '"'; i++; continue; }
        inAnf = !inAnf;
        continue;
      }
      if (c === trenner && !inAnf) { felder.push(akt.trim()); akt = ''; continue; }
      akt += c;
    }
    felder.push(akt.trim());
    return felder;
  }
  function saeubereZeile(roh) {
    return String(roh).replace(/`/g, '').trim().replace(/^(?:[-*•–]|\d+[.)])\s+/, '').trim();
  }
  function leseZeile(text) {
    const kopf = /^[A-Za-zÄÖÜäöüß_ -]+?(?=\s*[;,\t]|$)/.exec(text);
    const name = befehlsName(kopf ? kopf[0] : '');
    const def = BEFEHLE[name];
    if (!def) return { fehler: 'Unbekannter Befehl' };
    const anzahl = def.felder.length;
    let trenner = text.includes(';') ? ';' : text.includes('\t') ? '\t' : null;
    if (!trenner && text.includes(',')) {
      const probe = zerlege(text, ',');
      if (probe.length - 1 === anzahl || (def.optional && probe.length - 1 === anzahl + def.optional.length)) trenner = ',';
    }
    let felder = trenner ? zerlege(text, trenner).slice(1) : [];
    if (felder.length < anzahl) {
      if (name === 'EINTRAG' && felder.length === anzahl - 1 && /;\s*$/.test(text)) felder.push('');
      else return { fehler: 'Zu wenige Angaben' };
    }
    if (def.rest && felder.length > anzahl) {
      felder = [...felder.slice(0, anzahl - 1), felder.slice(anzahl - 1).join('; ')];
    }
    const werte = {};
    def.felder.forEach((f, i) => { werte[f] = felder[i] || ''; });
    (def.optional || []).forEach((f, i) => { werte[f] = felder[anzahl + i] || ''; });
    return { befehl: name, werte };
  }
  /** Sucht den (letzten) markierten Block; ohne Markierung werden alle Befehlszeilen genommen. */
  function findeZeilen(text) {
    const zeilen = String(text || '').replace(/\r/g, '').split('\n');
    const istStart = z => /LERNTRACKER[-_ ]?(?:Ä|AE)NDERUNGEN/i.test(z);
    const istEnde = z => /^[#\s`]*ENDE[#\s`]*$/i.test(z.trim());
    let start = -1;
    zeilen.forEach((z, i) => { if (istStart(z)) start = i; });
    if (start >= 0) {
      const rest = zeilen.slice(start + 1);
      const ende = rest.findIndex(istEnde);
      // Leerzeilen und Reste von Code-Fences (z. B. „csv“ nach dem Entfernen der Backticks) überspringen
      const inhalt = (ende >= 0 ? rest.slice(0, ende) : rest).map(saeubereZeile).filter(z => z && !/^[a-z]*$/.test(z));
      return { gefunden: true, zeilen: inhalt };
    }
    const befehle = zeilen.map(saeubereZeile).filter(z => !leseZeile(z).fehler);
    return { gefunden: befehle.length > 0, zeilen: befehle };
  }

  // ---------------------------------------------------------------------------
  // Planen und Anwenden (eine gemeinsame Verarbeitung, damit beide garantiert dasselbe tun)
  // ---------------------------------------------------------------------------
  function verarbeite(appData, zeilen, antworten, idBasis) {
    const daten = kopie(appData);
    if (!Array.isArray(daten.courses)) daten.courses = [];
    if (!Array.isArray(daten.statuses)) daten.statuses = [];
    const rueckfragen = [];
    const fragen = new Map();
    const nichtVerstanden = [];
    const gruppen = new Map();
    const neueKurse = new Set();
    let unveraendert = 0;
    let zaehler = 0;
    const neueId = art => `${art}_ki${idBasis}_${++zaehler}`;

    /** Rückfrage stellen (einmal pro id) und die gültige Antwort liefern. */
    function frage(id, art, text, optionen, vorschlag, details) {
      if (!fragen.has(id)) {
        const f = { id, art, frage: text, optionen, vorschlag, ...(details || {}) };
        if (antworten && Object.prototype.hasOwnProperty.call(antworten, id)) f.antwort = antworten[id];
        fragen.set(id, f);
        rueckfragen.push(f);
      }
      const f = fragen.get(id);
      const gewaehlt = f.antwort !== undefined ? f.antwort : f.vorschlag;
      return f.optionen.some(o => o.wert === gewaehlt) ? gewaehlt : 'skip';
    }
    function gruppe(kurs) {
      const name = kurs.name;
      if (!gruppen.has(kurs.id)) gruppen.set(kurs.id, { kurs: name, kursId: kurs.id, neu: neueKurse.has(kurs.id), eintraege: [] });
      const g = gruppen.get(kurs.id);
      g.kurs = kurs.name;
      return g;
    }
    function melde(kurs, eintrag) { gruppe(kurs).eintraege.push(eintrag); }
    const ueberspringen = [{ wert: 'skip', label: 'Überspringen' }];

    function findeKurs(name, nr) {
      const n = norm(name);
      const exakt = daten.courses.filter(c => norm(c.name) === n);
      if (exakt.length === 1) return exakt[0];
      const kandidaten = daten.courses.filter(c => aehnlich(c.name, name));
      const vorschlag = exakt.length ? exakt[0].id : kandidaten.length === 1 ? kandidaten[0].id : 'skip';
      const wahl = frage(`kurs:${n}`, 'kurs',
        exakt.length > 1 ? `Es gibt mehrere Kurse „${name}“. Welcher ist gemeint?` : `Den Kurs „${name}“ gibt es nicht. Welcher Kurs ist gemeint?`,
        [...daten.courses.map(c => ({ wert: c.id, label: c.name })), { wert: 'neu', label: `Neu anlegen: „${name}“` }, ...ueberspringen],
        vorschlag, { zeile: nr });
      if (wahl === 'skip') return null;
      if (wahl === 'neu') {
        const vorhanden = daten.courses.find(c => c.kiNeuName === n);
        return vorhanden || legeKursAn(name, n);
      }
      return daten.courses.find(c => c.id === wahl) || null;
    }
    function legeKursAn(name, schluessel) {
      const kurs = { id: neueId('course'), name: String(name).trim(), students: [], tasks: [], progress: {}, kiNeuName: schluessel };
      daten.courses.push(kurs);
      neueKurse.add(kurs.id);
      melde(kurs, { art: 'kurs', text: 'Kurs wird neu angelegt' });
      return kurs;
    }
    function findeAufgabe(kurs, titel, nr) {
      const n = norm(titel);
      const exakt = kurs.tasks.filter(t => norm(t.title) === n);
      if (exakt.length === 1) return exakt[0];
      const kandidaten = kurs.tasks.filter(t => aehnlich(t.title, titel));
      const vorschlag = exakt.length ? exakt[0].id : kandidaten.length === 1 ? kandidaten[0].id : 'skip';
      const wahl = frage(`aufgabe:${kurs.id}|${n}`, 'aufgabe', `In „${kurs.name}“ gibt es keine Aufgabe „${titel}“. Welche ist gemeint?`,
        [...kurs.tasks.map(t => ({ wert: t.id, label: t.title })), { wert: 'neu', label: `Neu anlegen: „${titel}“` }, ...ueberspringen],
        vorschlag, { zeile: nr, kurs: kurs.name });
      if (wahl === 'skip') return null;
      if (wahl === 'neu') return legeAufgabeAn(kurs, titel);
      return kurs.tasks.find(t => t.id === wahl) || null;
    }
    function legeAufgabeAn(kurs, titel) {
      const vorhanden = kurs.tasks.find(t => t.kiNeu && norm(t.title) === norm(titel));
      if (vorhanden) return vorhanden;
      const t = { id: neueId('t'), title: String(titel).trim(), kiNeu: true };
      kurs.tasks.push(t);
      melde(kurs, { art: 'aufgabe', text: `Neue Aufgabe „${t.title}“` });
      return t;
    }
    /** Kinder zu Nachname/Vorname finden; „*; *“ = alle Kinder des Kurses. */
    function findeKinder(kurs, nach, vor, nr) {
      if (nach.trim() === '*' && (vor.trim() === '*' || !vor.trim())) return kurs.students.slice();
      const gesucht = { nachname: nach, vorname: vor };
      const treffer = kurs.students
        .map(s => ({ s, v: Notenliste.vergleicheNamen({ nachname: s.lastName || '', vorname: s.firstName || '', aliase: s.nameAliases || [] }, gesucht) }))
        .filter(x => x.v)
        .sort((a, b) => b.v.score - a.v.score);
      const exakt = treffer.filter(x => x.v.sicherheit === 'exakt');
      if (exakt.length === 1) return [exakt[0].s];
      const vorschlag = treffer.length && (treffer.length === 1 || treffer[0].v.score > treffer[1].v.score) ? treffer[0].s.id : 'skip';
      const anzeige = `${vor} ${nach}`.trim();
      const wahl = frage(`kind:${kurs.id}|${norm(nach)}|${norm(vor)}`, 'kind',
        exakt.length > 1 ? `In „${kurs.name}“ gibt es mehrere Kinder „${anzeige}“. Welches ist gemeint?` : `In „${kurs.name}“ gibt es kein Kind „${anzeige}“ in genau dieser Schreibweise. Welches ist gemeint?`,
        [...kurs.students.map(s => ({ wert: s.id, label: `${s.lastName || ''}, ${s.firstName || ''}`.replace(/^, |, $/g, '') })), ...ueberspringen],
        exakt.length > 1 ? 'skip' : vorschlag, { zeile: nr, kurs: kurs.name, grund: treffer.length ? treffer[0].v.grund : '' });
      const s = kurs.students.find(x => x.id === wahl);
      return s ? [s] : [];
    }
    function loeschenBestaetigt(nr, text) {
      return frage(`loeschen:${nr}`, 'loeschen', text, [{ wert: 'ja', label: 'Ja, löschen' }, { wert: 'nein', label: 'Nein, behalten' }], 'nein', { zeile: nr }) === 'ja';
    }
    function statusWert(roh, nr) {
      const t = String(roh || '').trim();
      if (!t) return 'stat_nb';
      const s = daten.statuses.find(x => norm(x.short) === norm(t)) || daten.statuses.find(x => norm(x.label) === norm(t));
      if (s) return s.id;
      if (/^[\d.,/%+ -]+$/.test(t) || /^\d+([.,]\d+)?\s*(punkte?|p\.?|pkt\.?|%)$/i.test(t)) return t;
      const wahl = frage(`status:${norm(t)}`, 'status', `„${t}“ ist kein vorhandener Status. Wie soll es eingetragen werden?`,
        [{ wert: 'neu', label: `Als neuen Status „${t}“ anlegen` }, { wert: 'text', label: 'Als freien Text eintragen' }, ...ueberspringen],
        'text', { zeile: nr });
      if (wahl === 'skip') return null;
      if (wahl === 'text') return t;
      let neu = daten.statuses.find(x => x.kiNeu && norm(x.label) === norm(t));
      if (!neu) {
        neu = { id: 'stat_' + encodeURIComponent(t).replace(/%/g, '_'), label: t, short: t.length > 4 ? t.slice(0, 3).toUpperCase() : t, color: FARBEN[daten.statuses.length % FARBEN.length], kiNeu: true };
        if (daten.statuses.some(x => x.id === neu.id)) neu.id += '_' + (++zaehler);
        daten.statuses.push(neu);
      }
      return neu.id;
    }

    zeilen.forEach((roh, i) => {
      const nr = i + 1;
      const z = leseZeile(roh);
      if (z.fehler) { nichtVerstanden.push({ nr, zeile: roh, grund: z.fehler }); return; }
      const w = z.werte;
      const kaputt = grund => nichtVerstanden.push({ nr, zeile: roh, grund });

      if (z.befehl === 'KURS_NEU') {
        if (!w.kurs) return kaputt('Kursname fehlt');
        const n = norm(w.kurs);
        const vorhanden = daten.courses.find(c => norm(c.name) === n);
        if (vorhanden && !neueKurse.has(vorhanden.id)) {
          const wahl = frage(`kursDoppelt:${n}`, 'kursDoppelt', `Den Kurs „${w.kurs}“ gibt es schon.`,
            [{ wert: 'vorhanden', label: 'Vorhandenen Kurs verwenden' }, { wert: 'neu', label: 'Trotzdem neuen Kurs anlegen' }], 'vorhanden', { zeile: nr });
          if (wahl === 'neu') legeKursAn(`${w.kurs} (neu)`, n + ' (neu)');
          return;
        }
        if (!vorhanden) legeKursAn(w.kurs, n);
        return;
      }
      const kurs = findeKurs(w.kurs, nr);
      if (!kurs) return;

      switch (z.befehl) {
        case 'KURS_UMBENENNEN': {
          if (!w.neu) return kaputt('Neuer Name fehlt');
          if (kurs.name === w.neu) { unveraendert++; return; }
          melde(kurs, { art: 'umbenennen', text: `Kurs umbenennen: „${kurs.name}“ → „${w.neu}“` });
          kurs.name = w.neu;
          gruppe(kurs);
          return;
        }
        case 'KURS_LOESCHEN': {
          if (!loeschenBestaetigt(nr, `Kurs „${kurs.name}“ mit ${kurs.students.length} Kindern komplett löschen?`)) return;
          melde(kurs, { art: 'loeschen', loeschen: true, text: `Kurs „${kurs.name}“ wird gelöscht` });
          daten.courses = daten.courses.filter(c => c !== kurs);
          return;
        }
        case 'AUFGABE_NEU': {
          if (!w.titel) return kaputt('Aufgabentitel fehlt');
          if (kurs.tasks.some(t => norm(t.title) === norm(w.titel))) { unveraendert++; return; }
          legeAufgabeAn(kurs, w.titel);
          return;
        }
        case 'AUFGABE_UMBENENNEN':
        case 'AUFGABE_LOESCHEN': {
          const t = findeAufgabe(kurs, w.titel, nr);
          if (!t) return;
          if (z.befehl === 'AUFGABE_UMBENENNEN') {
            if (!w.neu) return kaputt('Neuer Titel fehlt');
            if (t.title === w.neu) { unveraendert++; return; }
            melde(kurs, { art: 'umbenennen', text: `Aufgabe umbenennen: „${t.title}“ → „${w.neu}“` });
            t.title = w.neu;
            return;
          }
          if (!loeschenBestaetigt(nr, `Aufgabe „${t.title}“ in „${kurs.name}“ samt allen Einträgen löschen?`)) return;
          melde(kurs, { art: 'loeschen', loeschen: true, text: `Aufgabe „${t.title}“ wird gelöscht` });
          kurs.tasks = kurs.tasks.filter(x => x !== t);
          for (const k of Object.keys(kurs.progress)) if (k.endsWith(`_${t.id}`)) delete kurs.progress[k];
          return;
        }
        case 'KIND_NEU': {
          if (!w.nach && !w.vor) return kaputt('Name fehlt');
          let level = 'aufsteiger';
          if (w.niveau) {
            level = niveauAus(w.niveau);
            if (!level) return kaputt(`Unbekanntes Niveau „${w.niveau}“`);
          }
          const doppelt = kurs.students.find(s => {
            const v = Notenliste.vergleicheNamen({ nachname: s.lastName || '', vorname: s.firstName || '', aliase: [] }, { nachname: w.nach, vorname: w.vor });
            return v && v.sicherheit === 'exakt';
          });
          if (doppelt) {
            const wahl = frage(`kindDoppelt:${kurs.id}|${norm(w.nach)}|${norm(w.vor)}`, 'kindDoppelt', `„${kindName(doppelt)}“ ist in „${kurs.name}“ schon vorhanden.`,
              [{ wert: 'skip', label: 'Nicht doppelt anlegen' }, { wert: 'trotzdem', label: 'Trotzdem zusätzlich anlegen' }], 'skip', { zeile: nr, kurs: kurs.name });
            if (wahl !== 'trotzdem') return;
          }
          const ordnung = kurs.students.reduce((m, s) => Math.max(m, typeof s.customOrder === 'number' ? s.customOrder : -1), -1) + 1;
          const s = { id: neueId('s'), firstName: w.vor, lastName: w.nach, name: `${w.vor} ${w.nach}`.trim(), level, absenceCount: 0, note: '', customOrder: ordnung };
          kurs.students.push(s);
          melde(kurs, { art: 'kind', text: `Neues Kind: ${kindName(s)}${w.niveau ? ` (${NIVEAUS[level]})` : ''}` });
          return;
        }
        default: break;
      }

      // Befehle, die sich auf vorhandene Kinder beziehen
      let pruefung = null;
      if (z.befehl === 'NIVEAU') {
        pruefung = niveauAus(w.niveau);
        if (!pruefung) return kaputt(`Unbekanntes Niveau „${w.niveau}“`);
      }
      if (z.befehl === 'FEHLTAGE' || z.befehl === 'FEHLTAGE_PLUS') {
        if (!/^-?\d+$/.test(String(w.zahl).trim())) return kaputt('Fehltage müssen eine ganze Zahl sein');
        pruefung = parseInt(w.zahl, 10);
      }
      if (z.befehl === 'KIND_UMBENENNEN' && !w.neuNach && !w.neuVor) return kaputt('Neuer Name fehlt');
      if (z.befehl === 'EINTRAG' && !w.titel) return kaputt('Aufgabentitel fehlt');

      const kinder = findeKinder(kurs, w.nach, w.vor, nr);
      if (!kinder.length) return;
      let aufgabe = null;
      let wert;
      if (z.befehl === 'EINTRAG') {
        aufgabe = findeAufgabe(kurs, w.titel, nr);
        if (!aufgabe) return;
        wert = statusWert(w.wert, nr);
        if (wert === null) return;
      }

      for (const s of kinder) {
        const name = kindName(s);
        switch (z.befehl) {
          case 'KIND_LOESCHEN': {
            if (!loeschenBestaetigt(nr, `${name} aus „${kurs.name}“ löschen (samt allen Einträgen)?`)) break;
            melde(kurs, { art: 'loeschen', loeschen: true, text: `${name} wird gelöscht` });
            kurs.students = kurs.students.filter(x => x !== s);
            for (const k of Object.keys(kurs.progress)) if (k.startsWith(`${s.id}_`)) delete kurs.progress[k];
            break;
          }
          case 'KIND_UMBENENNEN': {
            const neuNach = w.neuNach || s.lastName || '';
            const neuVor = w.neuVor || s.firstName || '';
            if (neuNach === s.lastName && neuVor === s.firstName) { unveraendert++; break; }
            melde(kurs, { art: 'umbenennen', text: `Umbenennen: ${name} → ${`${neuVor} ${neuNach}`.trim()}` });
            s.lastName = neuNach;
            s.firstName = neuVor;
            s.name = `${neuVor} ${neuNach}`.trim();
            break;
          }
          case 'NIVEAU': {
            const alt = s.level || 'aufsteiger';
            if (alt === pruefung) { unveraendert++; break; }
            melde(kurs, { art: 'niveau', text: `${name}: Niveau ${NIVEAUS[alt]} → ${NIVEAUS[pruefung]}` });
            s.level = pruefung;
            break;
          }
          case 'FEHLTAGE':
          case 'FEHLTAGE_PLUS': {
            const alt = s.absenceCount || 0;
            const neu = Math.max(0, z.befehl === 'FEHLTAGE' ? pruefung : alt + pruefung);
            if (alt === neu) { unveraendert++; break; }
            melde(kurs, { art: 'fehltage', text: `${name}: Fehltage ${alt} → ${neu}` });
            s.absenceCount = neu;
            break;
          }
          case 'BEMERKUNG':
          case 'BEMERKUNG_PLUS': {
            const alt = s.note || '';
            const neu = z.befehl === 'BEMERKUNG' ? w.text : (alt ? `${alt}, ${w.text}` : w.text);
            if (alt === neu) { unveraendert++; break; }
            melde(kurs, { art: 'bemerkung', text: `${name}: Bemerkung ${alt ? `„${alt}“` : '(leer)'} → ${neu ? `„${neu}“` : '(leer)'}`, ueberschreibt: z.befehl === 'BEMERKUNG' && !!alt });
            s.note = neu;
            break;
          }
          case 'EINTRAG': {
            const key = `${s.id}_${aufgabe.id}`;
            const alt = statusId(daten, kurs.progress[key]);
            if (alt === wert) { unveraendert++; break; }
            melde(kurs, { art: 'eintrag', text: `${name} · ${aufgabe.title}: ${statusLabel(daten, alt)} → ${statusLabel(daten, wert)}`, ueberschreibt: alt !== 'stat_nb' });
            if (wert === 'stat_nb') delete kurs.progress[key];
            else kurs.progress[key] = wert;
            break;
          }
          default: break;
        }
      }
    });

    // Aufräumen: Hilfsmarkierungen entfernen, neue Kurse ohne Aufgabe bekommen „M 1“
    for (const c of daten.courses) {
      if (neueKurse.has(c.id) && !c.tasks.length) c.tasks.push({ id: neueId('t'), title: 'M 1' });
      delete c.kiNeuName;
      for (const t of c.tasks) delete t.kiNeu;
    }
    for (const s of daten.statuses) delete s.kiNeu;

    const aenderungen = [...gruppen.values()].filter(g => g.eintraege.length);
    return { daten, rueckfragen, nichtVerstanden, aenderungen, unveraendert };
  }

  function zusammenfassen(gefunden, erg) {
    if (!gefunden) return 'Keine Änderungsliste gefunden. Die KI hat vermutlich nur eine Frage beantwortet. Keine Änderungen.';
    const anzahl = erg.aenderungen.reduce((n, g) => n + g.eintraege.length, 0);
    const teile = [anzahl ? `${anzahl} Änderung${anzahl === 1 ? '' : 'en'} in ${erg.aenderungen.length} Kurs${erg.aenderungen.length === 1 ? '' : 'en'}` : 'Keine Änderungen'];
    if (erg.unveraendert) teile.push(`${erg.unveraendert} schon so eingetragen`);
    if (erg.nichtVerstanden.length) teile.push(`${erg.nichtVerstanden.length} Zeile${erg.nichtVerstanden.length === 1 ? '' : 'n'} nicht verstanden`);
    if (erg.rueckfragen.length) teile.push(`${erg.rueckfragen.length} Rückfrage${erg.rueckfragen.length === 1 ? '' : 'n'}`);
    return teile.join(' · ');
  }

  /**
   * Liest die Antwort der KI und berechnet, was sich ändern würde.
   * antworten: { [rueckfrage.id]: wert } – fehlende Antworten gelten mit dem Vorschlag der Rückfrage.
   */
  function planen(appData, antwortText, antworten, optionen) {
    const idBasis = (optionen && optionen.idBasis) || Date.now().toString(36);
    const { gefunden, zeilen } = findeZeilen(antwortText);
    const erg = verarbeite(appData, zeilen, antworten || {}, idBasis);
    return {
      text: antwortText,
      gefunden,
      zeilen,
      antworten: { ...(antworten || {}) },
      idBasis,
      aenderungen: erg.aenderungen,
      rueckfragen: erg.rueckfragen,
      nichtVerstanden: erg.nichtVerstanden,
      unveraendert: erg.unveraendert,
      zusammenfassung: zusammenfassen(gefunden, erg)
    };
  }

  /** Wendet einen Plan an. Liefert neue appData; die Eingabe bleibt unverändert. */
  function anwenden(appData, plan) {
    return verarbeite(appData, plan.zeilen || [], plan.antworten || {}, plan.idBasis).daten;
  }

  return { promptErstellen, planen, anwenden, sicherungsCsv, START, ENDE };
});
