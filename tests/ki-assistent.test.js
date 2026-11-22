// Tests für das Modul „KI-Assistent“. Alle Namen sind erfunden.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../ki-assistent.js');

const STATUS = [
  { id: 'stat_nb', label: 'Nicht begonnen', short: 'NB', color: '#94a3b8' },
  { id: 'stat_arbeit', label: 'In Bearbeitung', short: 'IB', color: '#3b82f6' },
  { id: 'stat_fertig', label: 'Abgeschlossen', short: 'OK', color: '#10b981' },
  { id: 'stat_note_2m', label: 'Note 2-', short: '2-', color: '#38bdf8' },
  { id: 'stat_note_3', label: 'Note 3', short: '3', color: '#f59e0b' }
];
const kind = (id, vorname, nachname, extra = {}) => ({ id, firstName: vorname, lastName: nachname, name: `${vorname} ${nachname}`, level: 'aufsteiger', absenceCount: 0, note: '', customOrder: 0, ...extra });

function daten() {
  return {
    activeCourseId: 'c_mathe',
    sortOrder: 'last',
    statuses: STATUS.map(s => ({ ...s })),
    courses: [
      {
        id: 'c_mathe',
        name: '6c Mathe',
        gradeExport: { taskId: 't_ka', lastSheetName: '6c' },
        students: [
          kind('s_tom', 'Tom', 'Adler', { customOrder: 2, nameAliases: ['Adlerr|Tom'] }),
          kind('s_lina', 'Lina', 'Bauer', { level: 'basis', absenceCount: 2, note: 'Brille' }),
          kind('s_oemer', 'Ömer', 'Yıldız', { customOrder: 1 })
        ],
        tasks: [{ id: 't_m1', title: 'M 1' }, { id: 't_ka', title: 'Klassenarbeit 1' }],
        progress: { s_tom_t_m1: 'stat_fertig', s_lina_t_m1: 'stat_arbeit', s_tom_t_ka: 'stat_note_2m', s_lina_t_ka: '12 Punkte' }
      },
      {
        id: 'c_deu',
        name: '5a Deutsch',
        students: [kind('s_ben', 'Ben', 'Dorn')],
        tasks: [{ id: 't_d1', title: 'Lesetagebuch' }],
        progress: {}
      }
    ]
  };
}
const block = (...zeilen) => ['### LERNTRACKER-ÄNDERUNGEN ###', ...zeilen, '### ENDE ###'].join('\n');
const alleTexte = plan => plan.aenderungen.flatMap(g => g.eintraege.map(e => `${g.kurs}: ${e.text}`));
const frage = (plan, art) => plan.rueckfragen.filter(f => f.art === art);

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
test('Prompt erklärt App und Format und enthält alle Daten', () => {
  const p = A.promptErstellen(daten(), { datum: '22.11.2026' });
  for (const t of ['6c Mathe', '5a Deutsch', 'Adler', 'Yıldız', 'Klassenarbeit 1', 'Lesetagebuch', 'In Bearbeitung', 'IB', 'Note 2-',
    'Aufsteiger', 'Gipfel', 'Basis', '### LERNTRACKER-ÄNDERUNGEN ###', '### ENDE ###', 'NIVEAU', 'EINTRAG', 'KURS_NEU', '22.11.2026', 'Brille', '12 Punkte']) {
    assert.ok(p.includes(t), `fehlt: ${t}`);
  }
});

test('Prompt nur für den aktiven Kurs lässt andere Kurse weg', () => {
  const p = A.promptErstellen(daten(), { datum: '22.11.2026', umfang: 'aktiv' });
  assert.ok(p.includes('6c Mathe') && p.includes('Adler'));
  assert.ok(!p.includes('Lesetagebuch') && !p.includes('Dorn'));
});

test('Sicherungs-CSV hat das Format der Komplett-Sicherung', () => {
  const csv = A.sicherungsCsv(daten());
  const zeilen = csv.split('\r\n');
  assert.equal(zeilen[0], '=== KURS: 6c Mathe ===');
  assert.equal(zeilen[1], 'Nachname;Vorname;Niveau;Fehltage;"M 1";"Klassenarbeit 1";Bemerkung / Förderbedarf');
  assert.ok(zeilen.includes('"Bauer";"Lina";"Basis";2;"In Bearbeitung";"12 Punkte";"Brille"'));
  assert.ok(zeilen.includes('"Yıldız";"Ömer";"Aufsteiger";0;"Nicht begonnen";"Nicht begonnen";""'));
  assert.ok(csv.includes('=== KURS: 5a Deutsch ==='));
});

// ---------------------------------------------------------------------------
// Antwort lesen
// ---------------------------------------------------------------------------
test('Block wird aus einer Chat-Antwort mit Code-Fence, Erklärtext und Aufzählung herausgelesen', () => {
  const antwort = 'Gern! Hier die Änderungen:\r\n\r\n```\r\n### LERNTRACKER-ÄNDERUNGEN ###\r\n- NIVEAU; 6c Mathe; Bauer; Lina; Aufsteiger\r\n* niveau;6c Mathe;Adler;Tom;Gipfel\r\n### ENDE ###\r\n```\r\nSag Bescheid, wenn ich noch etwas ändern soll.';
  const plan = A.planen(daten(), antwort);
  assert.equal(plan.gefunden, true);
  assert.deepEqual(alleTexte(plan), ['6c Mathe: Lina Bauer: Niveau Basis → Aufsteiger', '6c Mathe: Tom Adler: Niveau Aufsteiger → Gipfel']);
  assert.equal(plan.rueckfragen.length, 0);
  assert.equal(plan.nichtVerstanden.length, 0);
});

test('Bei mehreren Blöcken zählt der letzte', () => {
  const antwort = block('NIVEAU; 6c Mathe; Bauer; Lina; Gipfel') + '\nKorrektur:\n' + block('NIVEAU; 6c Mathe; Bauer; Lina; Aufsteiger');
  assert.deepEqual(alleTexte(A.planen(daten(), antwort)), ['6c Mathe: Lina Bauer: Niveau Basis → Aufsteiger']);
});

test('Reiner Text ohne Änderungsliste meldet „keine Änderungen“', () => {
  const plan = A.planen(daten(), 'Der Notenschnitt bei Klassenarbeit 1 liegt bei 2,3.');
  assert.equal(plan.gefunden, false);
  assert.equal(plan.aenderungen.length, 0);
  assert.match(plan.zusammenfassung, /[Kk]eine Änderungen/);
});

test('Nicht verstandene Zeilen werden mit Grund aufgelistet', () => {
  const plan = A.planen(daten(), block('NIVEAU; 6c Mathe; Bauer; Lina; Mittel', 'TANZEN; 6c Mathe', 'NIVEAU; 6c Mathe; Bauer', 'FEHLTAGE; 6c Mathe; Bauer; Lina; viele'));
  assert.equal(plan.nichtVerstanden.length, 4);
  assert.deepEqual(plan.nichtVerstanden.map(n => n.nr), [1, 2, 3, 4]);
  assert.ok(plan.nichtVerstanden.every(n => n.grund));
});

// ---------------------------------------------------------------------------
// Zuordnung von Namen, Kursen, Aufgaben, Status
// ---------------------------------------------------------------------------
test('Exakte Namen ohne Rückfrage, auch mit Umlaut-Umschreibung und gemerktem Alias', () => {
  const plan = A.planen(daten(), block('FEHLTAGE; 6c Mathe; Yildiz; Oemer; 3', 'FEHLTAGE_PLUS; 6c mathe; Adlerr; Tom; 1'));
  assert.equal(plan.rueckfragen.length, 0);
  assert.deepEqual(alleTexte(plan), ['6c Mathe: Ömer Yıldız: Fehltage 0 → 3', '6c Mathe: Tom Adler: Fehltage 0 → 1']);
});

test('Tippfehler und vertauschte Namen führen zu einer Rückfrage mit Vorschlag', () => {
  const plan = A.planen(daten(), block('NIVEAU; 6c Mathe; Bauerr; Lina; Gipfel', 'NIVEAU; 6c Mathe; Tom; Adler; Gipfel', 'NIVEAU; 6c Mathe; Zander; Paul; Gipfel'));
  const f = frage(plan, 'kind');
  assert.equal(f.length, 3);
  assert.equal(f[0].vorschlag, 's_lina');
  assert.equal(f[1].vorschlag, 's_tom');
  assert.equal(f[2].vorschlag, 'skip');
  assert.ok(f[2].optionen.some(o => o.wert === 's_lina'));
  // Mit Vorschlägen: zwei Änderungen, Paul wird übersprungen
  assert.deepEqual(alleTexte(plan), ['6c Mathe: Lina Bauer: Niveau Basis → Gipfel', '6c Mathe: Tom Adler: Niveau Aufsteiger → Gipfel']);
});

test('Dasselbe unklare Kind in mehreren Zeilen erzeugt nur eine Rückfrage', () => {
  const plan = A.planen(daten(), block('NIVEAU; 6c Mathe; Bauerr; Lina; Gipfel', 'FEHLTAGE; 6c Mathe; Bauerr; Lina; 4'));
  assert.equal(frage(plan, 'kind').length, 1);
});

test('Unbekannter Kurs ohne KURS_NEU: Rückfrage, nie still ein neuer Kurs', () => {
  const plan = A.planen(daten(), block('NIVEAU; 6c Mathematik; Bauer; Lina; Gipfel', 'NIVEAU; 9z Chemie; Bauer; Lina; Gipfel'));
  const f = frage(plan, 'kurs');
  assert.equal(f.length, 2);
  assert.equal(f[0].vorschlag, 'c_mathe');
  assert.equal(f[1].vorschlag, 'skip');
  const neu = A.anwenden(daten(), plan);
  assert.equal(neu.courses.length, 2);
  assert.equal(neu.courses[0].students.find(s => s.id === 's_lina').level, 'gipfel');
});

test('Unbekannte Aufgabe: Rückfrage mit „neu anlegen“', () => {
  const plan = A.planen(daten(), block('EINTRAG; 6c Mathe; Adler; Tom; Klassenarbeit 2; 3'));
  const f = frage(plan, 'aufgabe');
  assert.equal(f.length, 1);
  assert.ok(f[0].optionen.some(o => o.wert === 'neu'));
  const mitNeu = A.planen(daten(), block('EINTRAG; 6c Mathe; Adler; Tom; Klassenarbeit 2; 3'), { [f[0].id]: 'neu' });
  const neu = A.anwenden(daten(), mitNeu);
  const t = neu.courses[0].tasks.find(x => x.title === 'Klassenarbeit 2');
  assert.ok(t);
  assert.equal(neu.courses[0].progress[`s_tom_${t.id}`], 'stat_note_3');
});

test('Status: Kürzel und Bezeichnung werden zu Status-IDs, Punkte bleiben Text, Unbekanntes wird erfragt', () => {
  const plan = A.planen(daten(), block(
    'EINTRAG; 6c Mathe; Adler; Tom; M 1; IB',
    'EINTRAG; 6c Mathe; Bauer; Lina; M 1; abgeschlossen',
    'EINTRAG; 6c Mathe; Yıldız; Ömer; M 1; 14/15',
    'EINTRAG; 6c Mathe; Yıldız; Ömer; Klassenarbeit 1; Fehlt entschuldigt'
  ));
  const f = frage(plan, 'status');
  assert.equal(f.length, 1);
  assert.deepEqual(f[0].optionen.map(o => o.wert), ['neu', 'text', 'skip']);
  const neu = A.anwenden(daten(), A.planen(daten(), plan.text, { [f[0].id]: 'neu' }));
  const p = neu.courses[0].progress;
  assert.equal(p.s_tom_t_m1, 'stat_arbeit');
  assert.equal(p.s_lina_t_m1, 'stat_fertig');
  assert.equal(p.s_oemer_t_m1, '14/15');
  const st = neu.statuses.find(s => s.label === 'Fehlt entschuldigt');
  assert.ok(st);
  assert.equal(p.s_oemer_t_ka, st.id);
});

test('Überschreiben zeigt alt → neu und ist markiert', () => {
  const plan = A.planen(daten(), block('EINTRAG; 6c Mathe; Adler; Tom; Klassenarbeit 1; 3'));
  const e = plan.aenderungen[0].eintraege[0];
  assert.equal(e.text, 'Tom Adler · Klassenarbeit 1: Note 2- → Note 3');
  assert.equal(e.ueberschreibt, true);
});

test('Stern steht für alle Kinder des Kurses', () => {
  const plan = A.planen(daten(), block('EINTRAG; 6c Mathe; *; *; Klassenarbeit 1; IB'));
  const neu = A.anwenden(daten(), plan);
  for (const s of ['s_tom', 's_lina', 's_oemer']) assert.equal(neu.courses[0].progress[`${s}_t_ka`], 'stat_arbeit');
  assert.equal(plan.aenderungen[0].eintraege.length, 3);
});

// ---------------------------------------------------------------------------
// Anlegen, Umbenennen, Löschen
// ---------------------------------------------------------------------------
test('Neuer Kurs mit Kindern, Aufgabe und Einträgen in einem Rutsch', () => {
  const text = block(
    'KURS_NEU; 7a Englisch',
    'AUFGABE_NEU; 7a Englisch; Vokabeltest 1',
    'KIND_NEU; 7a Englisch; Engel; Mia-Sophie; Gipfel',
    'KIND_NEU; 7a Englisch; Fuchs; Emre',
    'EINTRAG; 7a Englisch; Engel; Mia-Sophie; Vokabeltest 1; 2-'
  );
  const plan = A.planen(daten(), text);
  assert.equal(plan.rueckfragen.length, 0);
  const g = plan.aenderungen.find(x => x.kurs === '7a Englisch');
  assert.equal(g.neu, true);
  const neu = A.anwenden(daten(), plan);
  const k = neu.courses.find(c => c.name === '7a Englisch');
  assert.deepEqual(k.tasks.map(t => t.title), ['Vokabeltest 1']);
  assert.deepEqual(k.students.map(s => [s.lastName, s.firstName, s.level, s.name]), [['Engel', 'Mia-Sophie', 'gipfel', 'Mia-Sophie Engel'], ['Fuchs', 'Emre', 'aufsteiger', 'Emre Fuchs']]);
  const mia = k.students[0];
  assert.equal(k.progress[`${mia.id}_${k.tasks[0].id}`], 'stat_note_2m');
  const ids = neu.courses.flatMap(c => [c.id, ...c.students.map(s => s.id), ...c.tasks.map(t => t.id)]);
  assert.equal(new Set(ids).size, ids.length, 'IDs sind eindeutig');
});

test('Neuer Kurs ohne Aufgabe bekommt die Standardspalte „M 1“', () => {
  const neu = A.anwenden(daten(), A.planen(daten(), block('KURS_NEU; 8b Bio', 'KIND_NEU; 8b Bio; Graf; Ida')));
  assert.deepEqual(neu.courses.find(c => c.name === '8b Bio').tasks.map(t => t.title), ['M 1']);
});

test('KURS_NEU für einen vorhandenen Kurs und KIND_NEU für ein vorhandenes Kind fragen nach', () => {
  const plan = A.planen(daten(), block('KURS_NEU; 6c Mathe', 'KIND_NEU; 6c Mathe; Adler; Tom'));
  assert.equal(frage(plan, 'kursDoppelt')[0].vorschlag, 'vorhanden');
  assert.equal(frage(plan, 'kindDoppelt')[0].vorschlag, 'skip');
  const neu = A.anwenden(daten(), plan);
  assert.equal(neu.courses.length, 2);
  assert.equal(neu.courses[0].students.length, 3);
});

test('Umbenennen von Kurs, Aufgabe und Kind', () => {
  const plan = A.planen(daten(), block('KURS_UMBENENNEN; 5a Deutsch; 5a Deutsch (Förder)', 'AUFGABE_UMBENENNEN; 6c Mathe; M 1; Bruchrechnung', 'KIND_UMBENENNEN; 6c Mathe; Bauer; Lina; Bauer; Lina-Marie'));
  const neu = A.anwenden(daten(), plan);
  assert.equal(neu.courses[1].name, '5a Deutsch (Förder)');
  assert.equal(neu.courses[0].tasks[0].title, 'Bruchrechnung');
  const lina = neu.courses[0].students.find(s => s.id === 's_lina');
  assert.deepEqual([lina.firstName, lina.name], ['Lina-Marie', 'Lina-Marie Bauer']);
});

test('Löschen wird immer erfragt und passiert erst nach ausdrücklichem Ja', () => {
  const text = block('KIND_LOESCHEN; 6c Mathe; Bauer; Lina', 'AUFGABE_LÖSCHEN; 6c Mathe; M 1', 'KURS_LOESCHEN; 5a Deutsch');
  const plan = A.planen(daten(), text);
  const f = frage(plan, 'loeschen');
  assert.equal(f.length, 3);
  assert.ok(f.every(x => x.vorschlag === 'nein'));
  const ohneJa = A.anwenden(daten(), plan);
  assert.equal(ohneJa.courses.length, 2);
  assert.equal(ohneJa.courses[0].students.length, 3);
  const antworten = Object.fromEntries(f.map(x => [x.id, 'ja']));
  const mitJa = A.planen(daten(), text, antworten);
  assert.ok(mitJa.aenderungen.flatMap(g => g.eintraege).every(e => e.loeschen));
  const neu = A.anwenden(daten(), mitJa);
  assert.equal(neu.courses.length, 1);
  assert.deepEqual(neu.courses[0].students.map(s => s.id), ['s_tom', 's_oemer']);
  assert.deepEqual(neu.courses[0].tasks.map(t => t.id), ['t_ka']);
  assert.ok(!Object.keys(neu.courses[0].progress).some(k => k.startsWith('s_lina_') || k.endsWith('_t_m1')));
});

test('Bemerkung ersetzen und ergänzen', () => {
  const neu = A.anwenden(daten(), A.planen(daten(), block('BEMERKUNG_PLUS; 6c Mathe; Bauer; Lina; sitzt vorne', 'BEMERKUNG; 6c Mathe; Adler; Tom; "LRS; Nachteilsausgleich"')));
  const [tom, lina] = ['s_tom', 's_lina'].map(id => neu.courses[0].students.find(s => s.id === id));
  assert.equal(lina.note, 'Brille, sitzt vorne');
  assert.equal(tom.note, 'LRS; Nachteilsausgleich');
});

// ---------------------------------------------------------------------------
// Anwenden lässt alles andere unangetastet
// ---------------------------------------------------------------------------
test('anwenden verändert die Eingabe nicht und lässt Unerwähntes identisch', () => {
  const vorher = daten();
  const kopie = JSON.parse(JSON.stringify(vorher));
  const neu = A.anwenden(vorher, A.planen(vorher, block('NIVEAU; 6c Mathe; Bauer; Lina; Gipfel')));
  assert.deepEqual(vorher, kopie, 'Eingabe unverändert');
  assert.deepEqual(neu.courses[1], kopie.courses[1]);
  const tom = neu.courses[0].students.find(s => s.id === 's_tom');
  assert.deepEqual(tom, kopie.courses[0].students[0]);
  assert.deepEqual(neu.courses[0].gradeExport, kopie.courses[0].gradeExport);
  assert.deepEqual(neu.courses[0].progress, kopie.courses[0].progress);
  assert.equal(neu.activeCourseId, 'c_mathe');
});

test('Übersprungene Zeilen werden nicht angewendet', () => {
  const text = block('NIVEAU; 6c Mathe; Bauerr; Lina; Gipfel', 'NIVEAU; 6c Mathe; Adler; Tom; Basis');
  const id = A.planen(daten(), text).rueckfragen[0].id;
  const neu = A.anwenden(daten(), A.planen(daten(), text, { [id]: 'skip' }));
  assert.equal(neu.courses[0].students.find(s => s.id === 's_lina').level, 'basis');
  assert.equal(neu.courses[0].students.find(s => s.id === 's_tom').level, 'basis');
});

test('Alte Zellen mit Kürzel statt Status-ID („2“, „nb“) werden wie in der App aufgelöst', () => {
  const d = daten();
  d.courses[0].progress.s_oemer_t_m1 = 'ok';
  d.courses[0].progress.s_oemer_t_ka = 'nb';
  const csv = A.sicherungsCsv(d);
  assert.ok(csv.includes('"Yıldız";"Ömer";"Aufsteiger";0;"Abgeschlossen";"Nicht begonnen";""'));
  const plan = A.planen(d, block('EINTRAG; 6c Mathe; Yıldız; Ömer; M 1; Abgeschlossen', 'EINTRAG; 6c Mathe; Yıldız; Ömer; Klassenarbeit 1; IB'));
  assert.equal(plan.unveraendert, 1);
  assert.deepEqual(alleTexte(plan), ['6c Mathe: Ömer Yıldız · Klassenarbeit 1: Nicht begonnen → In Bearbeitung']);
  assert.equal(plan.aenderungen[0].eintraege[0].ueberschreibt, false);
});

test('Prompt leitet an: Code-Block zum Kopieren, Anleitung zum Einfügen, Begrüßung mit Beispielen aus den Daten', () => {
  const p = A.promptErstellen(daten(), { datum: '22.11.2026' });
  for (const t of ['Code-Block', 'Kopieren-Knopf', 'Antwort der KI einfügen', 'Änderungen prüfen', 'Rückgängig', 'Wer steht in der [Kurs] auf Aufsteiger?', 'Beispiele aus meinen echten Daten', '```text']) {
    assert.ok(p.includes(t), `fehlt: ${t}`);
  }
  assert.ok(!p.includes('„Bereit.“'));
});

test('Antwort im Stil des Prompts (Code-Block „text“ und Anleitung danach) wird sauber gelesen', () => {
  const antwort = [
    'Damit stelle ich Lina auf Aufsteiger.',
    '```text',
    '### LERNTRACKER-ÄNDERUNGEN ###',
    'NIVEAU; 6c Mathe; Bauer; Lina; Aufsteiger',
    '### ENDE ###',
    '```',
    'So übernimmst du die Änderungen: Kopiere den Block oben und füge ihn in der App ein.'
  ].join('\n');
  const plan = A.planen(daten(), antwort);
  assert.deepEqual(alleTexte(plan), ['6c Mathe: Lina Bauer: Niveau Basis → Aufsteiger']);
  assert.equal(plan.nichtVerstanden.length, 0);
});
