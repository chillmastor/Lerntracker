// Tests für das Modul „Notenlisten-Übertragung“. Alle Namen sind erfunden.
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../notenliste.js');

// --- Fixture-Helfer ---------------------------------------------------------
function raster(eintraege) {
  // eintraege: { 'B8': 'Name', ... } → 2D-Array
  const zellen = [];
  for (const [adr, wert] of Object.entries(eintraege)) {
    const { zeile, spalte } = N._intern.parseAdresse(adr);
    zellen[zeile] = zellen[zeile] || [];
    zellen[zeile][spalte] = wert;
  }
  return zellen;
}
function zeugnisliste({ klasse = ['6', 'b'], kinder, faecher, kuerzel, zweiteSeite = [], zweiteSeiteKuerzel, extra = {} }) {
  const e = { C2: 'Zeugnisliste für Klasse', D2: Number(klasse[0]), E2: klasse[1], C4: 'Schuljahr ', D4: '26/', E4: 27, C5: 'Halbjahr', D5: 1, B8: 'Name', C8: 'Vorname', D8: 'FZ', D9: 'ges', E9: 'ue' };
  const spalten = 'FGHIJKLMNOPQ';
  faecher.forEach((f, i) => { e[spalten[i] + '8'] = f; if (kuerzel) e[spalten[i] + '9'] = kuerzel[i]; });
  e[spalten[faecher.length] + '8'] = 'S.b.jahre';
  e[spalten[faecher.length + 1] + '8'] = 'Bemerkungen';
  kinder.forEach(([n, v], i) => { e['A' + (10 + i)] = (i + 1) + '.'; e['B' + (10 + i)] = n; e['C' + (10 + i)] = v; });
  if (zweiteSeite.length) {
    e.B38 = 'Name'; e.C38 = 'Vorname'; e.D38 = 'FZ';
    faecher.forEach((f, i) => { e[spalten[i] + '38'] = f; e[spalten[i] + '39'] = (zweiteSeiteKuerzel || kuerzel)[i]; });
    zweiteSeite.forEach(([n, v], i) => { e['B' + (40 + i)] = n; e['C' + (40 + i)] = v; });
  }
  Object.assign(e, extra);
  return raster(e);
}
function kind(id, vorname, nachname, wert, mehr = {}) {
  return { id, vorname, nachname, wert, aliase: [], ...mehr };
}
function mappe(...blaetter) {
  return { blaetter: blaetter.map(([name, zellen]) => ({ name, zellen })) };
}
function rueckfrage(plan, id) {
  return plan.rueckfragen.find(r => r.id === id);
}

const KINDER_6B = [['Albrecht', 'Jonas'], ['Brandt', 'Mila'], ['Celik', 'Emre'], ['Demir', 'Lea']];

// --- Blatt & Spalte ---------------------------------------------------------
test('Spalte wird über Fach und Kürzel vorgeschlagen, aber erst nach Bestätigung geschrieben', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'GL', 'E', 'NW', 'M'], kuerzel: ['Vin', 'Sho', 'Sha', 'Sha', 'Sha'] });
  const ctx = { kursName: '6b Englisch', lehrerKuerzel: 'Sha', schueler: [kind('s1', 'Jonas', 'Albrecht', '2')] };
  let plan = N.planen(mappe(['6b', zellen]), ctx);
  assert.equal(plan.spaltenVorschlag, 7); // Spalte H = E
  assert.equal(plan.spalte, null);
  assert.equal(plan.fertig, false);
  assert.deepEqual(plan.ausfuehren, []);
  assert.ok(rueckfrage(plan, 'spalte'));
  assert.equal(rueckfrage(plan, 'blatt'), undefined, 'Bei nur einem Tab gibt es keine Blattwahl');

  plan = N.entscheiden(plan, { spalte: 7 });
  assert.equal(plan.fertig, true);
  assert.deepEqual(plan.ausfuehren, [{ adresse: 'H10', wert: 2 }]);
});

test('Fehlzeiten, S.b.jahre und Bemerkungen werden nie als Fachspalte angeboten', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'E'], kuerzel: ['Vin', 'Sha'] });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '6b Englisch', schueler: [] });
  const koepfe = plan.spalten.map(s => s.kopf);
  assert.deepEqual(koepfe.sort(), ['D', 'E']);
});

test('Doppelte Fachspalte (E-G) wird über das Lehrerkürzel unterschieden', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'E-G', 'E-G', 'E-E'], kuerzel: ['Kar', 'Kar', 'Tör', 'Nie'] });
  const plan = N.planen(mappe(['8a', zellen]), { kursName: '8a Englisch G', lehrerKuerzel: 'Tör', schueler: [] });
  assert.equal(plan.spalten[0].buchstabe, 'H');
  assert.equal(plan.spaltenVorschlag, 7);
});

test('Verwandtes Fach (NW für Biologie) wird als Kandidat vorgeschlagen', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'NW', 'M'], kuerzel: ['Vin', 'Sha', 'Sha'] });
  const plan = N.planen(mappe(['6b', zellen]), { kursName: '6b Biologie', lehrerKuerzel: 'Sha', schueler: [] });
  assert.equal(plan.spalten[0].kopf, 'NW');
  assert.equal(plan.spaltenVorschlag, plan.spalten[0].spalte);
});

test('Abweichende Beschriftung (Bio, If mit Leerzeichen) wird erkannt', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'Bio', 'If '], kuerzel: null });
  const ctxBio = { kursName: '5c Biologie', schueler: [] };
  assert.equal(N.planen(mappe(['x', zellen]), ctxBio).spalten[0].kopf, 'Bio');
  const ctxIf = { kursName: '5c Informatik', schueler: [] };
  assert.equal(N.planen(mappe(['x', zellen]), ctxIf).spalten[0].kopf, 'If');
});

test('Ohne passenden Kandidaten ist keine Spalte vorausgewählt', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'GL'], kuerzel: ['Vin', 'Sho'] });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '6b Musik', lehrerKuerzel: 'Sha', schueler: [] });
  assert.equal(plan.spaltenVorschlag, null);
  assert.equal(plan.spalten.length, 2);
});

test('Spaltenliste zeigt Kürzel und Zahl befüllter Zellen', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'E'], kuerzel: ['Vin', 'Sha'], extra: { F10: 2, F11: 3 } });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [] });
  const d = plan.spalten.find(s => s.kopf === 'D');
  assert.equal(d.kuerzel, 'Vin');
  assert.equal(d.befuellt, 2);
});

test('Bei mehreren Tabs muss der Tab gewählt werden; leere Tabs sind nicht wählbar', () => {
  const leer = raster({ B6: 'Name', C6: 'Vorname', D6: 'D', E6: 'E', D7: 'Rös', E7: 'Sha', A8: '1.', A9: '2.' });
  const voll = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'E'], kuerzel: ['Rös', 'Sha'] });
  let plan = N.planen(mappe(['Kursliste', leer], ['Zeugnisliste', voll]), { kursName: '5c Englisch', lehrerKuerzel: 'Sha', schueler: [kind('s1', 'Jonas', 'Albrecht', '1')] });
  const frage = rueckfrage(plan, 'blatt');
  assert.ok(frage);
  assert.equal(frage.antwort, null);
  assert.equal(plan.blattVorschlag, 'Zeugnisliste');
  assert.equal(frage.optionen.find(o => o.name === 'Kursliste').waehlbar, false);
  assert.equal(frage.optionen.find(o => o.name === 'Zeugnisliste').kinderAnzahl, 4);

  plan = N.entscheiden(plan, { spalte: 6 });
  assert.equal(plan.fertig, false, 'Ohne bestätigten Tab ist der Plan nicht fertig');
  plan = N.entscheiden(plan, { blatt: 'Zeugnisliste', spalte: 6 });
  assert.equal(plan.fertig, true);
  assert.deepEqual(plan.ausfuehren, [{ adresse: 'G10', wert: 1 }]);
});

test('Tab-Wechsel berechnet Spalten und Vorschlag neu und verwirft die alte Spaltenwahl', () => {
  const a = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'E'], kuerzel: ['Vin', 'Sha'] });
  const b = zeugnisliste({ kinder: KINDER_6B, faecher: ['M', 'KU', 'E'], kuerzel: ['Sha', 'Sha', 'Sha'] });
  let plan = N.planen(mappe(['Elternsprechtag', a], ['Zeugnisnoten', b]), { kursName: '6b Englisch', lehrerKuerzel: 'Sha', schueler: [] });
  plan = N.entscheiden(plan, { blatt: 'Elternsprechtag', spalte: 6 });
  assert.equal(plan.spalte, 6);
  plan = N.entscheiden(plan, { blatt: 'Zeugnisnoten' });
  assert.equal(plan.spalte, null);
  assert.equal(plan.spaltenVorschlag, 7);
  assert.deepEqual(plan.spalten.map(s => s.kopf).sort(), ['E', 'KU', 'M']);
});

test('Gemerkter Tab und gemerkte Spalte haben Vorrang', () => {
  const a = zeugnisliste({ kinder: KINDER_6B, faecher: ['E', 'E'], kuerzel: ['Sha', 'Sha'] });
  const b = zeugnisliste({ kinder: KINDER_6B, faecher: ['E'], kuerzel: ['Sha'] });
  let plan = N.planen(mappe(['A', a], ['B', b]), { kursName: '6b Englisch', lehrerKuerzel: 'Sha', schueler: [] });
  plan = N.entscheiden(plan, { blatt: 'A', spalte: 6 });
  const gemerkt = plan.gemerkt;
  assert.equal(gemerkt.blatt, 'A');

  const neu = N.planen(mappe(['B', b], ['A', a]), { kursName: '6b Englisch', lehrerKuerzel: 'Sha', schueler: [], gemerkt });
  assert.equal(neu.blattVorschlag, 'A');
  assert.equal(neu.spalten[0].grund, 'Wie beim letzten Mal');
});

test('Bei vielen Klassen-Tabs wird der Tab der Kursklasse vorgeschlagen', () => {
  const a = zeugnisliste({ klasse: ['6', 'b'], kinder: KINDER_6B, faecher: ['E'], kuerzel: ['Sha'] });
  const b = zeugnisliste({ klasse: ['7', 'c'], kinder: KINDER_6B.slice(0, 2), faecher: ['E'], kuerzel: ['Sha'] });
  const plan = N.planen(mappe(['6b', a], ['7c', b]), { kursName: '7c Englisch', lehrerKuerzel: 'Sha', schueler: [] });
  assert.equal(plan.blattVorschlag, '7c');
  assert.equal(plan.blaetter.find(x => x.name === '7c').klassePasst, true);
});

test('Datei ohne Namensliste liefert einen Fehler', () => {
  const plan = N.planen(mappe(['x', raster({ A1: 'Hallo' })]), { kursName: '5a Deutsch', schueler: [] });
  assert.match(plan.fehler, /Namensliste/);
});

test('Abweichende Klasse im Kopf erzeugt eine Warnung', () => {
  const zellen = zeugnisliste({ klasse: ['5', 'a'], kinder: KINDER_6B, faecher: ['D'], kuerzel: ['Sha'] });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '7c Deutsch', schueler: [] });
  assert.ok(plan.hinweise.some(h => h.typ === 'klasse' && /5a/.test(h.text)));
});

// --- Mehrseitige Listen -----------------------------------------------------
test('Kinder auf Seite 2 (wiederholter Kopf) werden mit erfasst', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, zweiteSeite: [['Zander', 'Ole']], faecher: ['D', 'E'], kuerzel: ['Vin', 'Sha'] });
  let plan = N.planen(mappe(['x', zellen]), { kursName: '6b Englisch', lehrerKuerzel: 'Sha', schueler: [kind('s9', 'Ole', 'Zander', '3')] });
  plan = N.entscheiden(plan, { spalte: 6 });
  assert.deepEqual(plan.ausfuehren, [{ adresse: 'G40', wert: 3 }]);
});

test('Abweichendes Kürzel auf Seite 2 erzeugt einen Hinweis', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, zweiteSeite: [['Zander', 'Ole']], faecher: ['D', 'E'], kuerzel: ['Vin', 'Sha'], zweiteSeiteKuerzel: ['Vin', 'Nie'] });
  let plan = N.planen(mappe(['x', zellen]), { kursName: '6b Englisch', lehrerKuerzel: 'Sha', schueler: [] });
  plan = N.entscheiden(plan, { spalte: 6 });
  assert.ok(plan.hinweise.some(h => h.typ === 'seite' && /Nie/.test(h.text)));
});

test('Zeilen mit Formel-Verweisen (=B10) werden nicht als Kinder gezählt', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D'], kuerzel: ['Vin'], extra: { B70: 'Name', C70: 'Vorname', F70: 'D', B72: { wert: 'Albrecht', formel: true }, C72: { wert: 'Jonas', formel: true } } });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [] });
  assert.equal(plan.blaetter[0].kinderAnzahl, 4);
});

// --- Namensabgleich ---------------------------------------------------------
test('Exakte Namen und Sonderzeichen-Varianten werden automatisch zugeordnet', () => {
  const zellen = zeugnisliste({ kinder: [['Karabektaşoğlu', 'Ömer'], ['Güzel', 'Ali']], faecher: ['D'], kuerzel: ['Sha'] });
  let plan = N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [kind('a', 'Omer', 'Karabektasoglu', '2'), kind('b', 'Ali', 'Guezel', '3')] });
  plan = N.entscheiden(plan, { spalte: 5 });
  assert.equal(plan.fertig, true);
  assert.deepEqual(plan.ausfuehren, [{ adresse: 'F10', wert: 2 }, { adresse: 'F11', wert: 3 }]);
});

test('Tippfehler im Namen führt zu einer Rückfrage; nach Bestätigung wird geschrieben und ein Alias gemerkt', () => {
  const zellen = zeugnisliste({ kinder: [['Alomar', 'Marim'], ['Alomar', 'Hussein']], faecher: ['D', 'M'], kuerzel: ['Vin', 'Sha'] });
  let plan = N.planen(mappe(['x', zellen]), { kursName: '6b Mathe', lehrerKuerzel: 'Sha', schueler: [kind('m', 'Maryam', 'Alomar', '2')] });
  plan = N.entscheiden(plan, { spalte: 6 });
  const frage = rueckfrage(plan, 'name:m');
  assert.ok(frage);
  assert.equal(frage.liste.vorname, 'Marim');
  assert.equal(plan.fertig, false);
  assert.deepEqual(plan.ausfuehren, []);

  plan = N.entscheiden(plan, { 'name:m': true });
  assert.equal(plan.fertig, true);
  assert.deepEqual(plan.ausfuehren, [{ adresse: 'G10', wert: 2 }]);
  assert.deepEqual(plan.neueAliase, [{ schuelerId: 'm', alias: 'Alomar|Marim' }]);
});

test('Gemerkter Alias ordnet beim nächsten Mal automatisch zu', () => {
  const zellen = zeugnisliste({ kinder: [['Alomar', 'Marim']], faecher: ['M'], kuerzel: ['Sha'] });
  let plan = N.planen(mappe(['x', zellen]), { kursName: '6b Mathe', schueler: [kind('m', 'Maryam', 'Alomar', '2', { aliase: ['Alomar|Marim'] })] });
  plan = N.entscheiden(plan, { spalte: 5 });
  assert.equal(plan.fertig, true);
  assert.equal(plan.zuordnungen[0].sicherheit, 'exakt');
});

test('Fehlender Zweitname und vertauschte Namen werden als ähnlich vorgeschlagen', () => {
  const zellen = zeugnisliste({ kinder: [['Ivanova', 'Alessia Sophia'], ['Lukas', 'Peters']], faecher: ['D'], kuerzel: ['Sha'] });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [kind('a', 'Alessia', 'Ivanova', '1'), kind('b', 'Lukas', 'Peters', '2')] });
  assert.equal(rueckfrage(plan, 'name:a').grund, 'Name unvollständig');
  assert.equal(rueckfrage(plan, 'name:b').grund, 'Vor- und Nachname vertauscht');
});

test('Geschwister mit gleichem Nachnamen werden nie verwechselt', () => {
  const zellen = zeugnisliste({ kinder: [['Yilmaz', 'Feyza'], ['Yilmaz', 'Salih']], faecher: ['D'], kuerzel: ['Sha'] });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [kind('o', 'Ömer', 'Yilmaz', '2')] });
  assert.equal(plan.zuordnungen[0].zeile, null);
  const frage = rueckfrage(plan, 'kind:o');
  assert.ok(frage, 'Nicht gefundenes Kind erzeugt eine Rückfrage');
  assert.equal(frage.optionen.length, 2);
});

test('Nicht gefundenes Kind kann manuell zugeordnet oder übersprungen werden', () => {
  const zellen = zeugnisliste({ kinder: [['Schmitz', 'Tom'], ['Weber', 'Ida']], faecher: ['D'], kuerzel: ['Sha'] });
  const ctx = { kursName: '6b Deutsch', schueler: [kind('x', 'Thomas', 'Schmidt-Ketteler', '2'), kind('y', 'Unbekannt', 'Niemand', '4')] };
  let plan = N.entscheiden(N.planen(mappe(['x', zellen]), ctx), { spalte: 5 });
  plan = N.entscheiden(plan, { 'kind:x': 9, 'kind:y': 'ueberspringen' });
  assert.equal(plan.fertig, true);
  assert.deepEqual(plan.ausfuehren, [{ adresse: 'F10', wert: 2 }]);
  assert.equal(plan.zusammenfassung.uebersprungen.length, 1);
  assert.deepEqual(plan.zusammenfassung.fehlendImKurs.map(k => k.vorname), ['Ida']);
});

test('Jede Listenzeile wird höchstens einem Kind zugeordnet', () => {
  const zellen = zeugnisliste({ kinder: [['Meier', 'Lena']], faecher: ['D'], kuerzel: ['Sha'] });
  const plan = N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [kind('a', 'Lena', 'Meyer', '2'), kind('b', 'Lena', 'Maier', '3')] });
  const zeilen = plan.zuordnungen.map(z => z.zeile).filter(z => z !== null);
  assert.equal(zeilen.length, 1);
});

// --- Werte & Konflikte ------------------------------------------------------
test('Werte werden unverändert übertragen; ganze Noten als Zahl', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D'], kuerzel: ['Sha'] });
  const ctx = { kursName: '6b Deutsch', schueler: [kind('1', 'Jonas', 'Albrecht', '2+'), kind('2', 'Mila', 'Brandt', 'nb'), kind('3', 'Emre', 'Celik', '1-2'), kind('4', 'Lea', 'Demir', '4')] };
  const plan = N.entscheiden(N.planen(mappe(['x', zellen]), ctx), { spalte: 5 });
  assert.deepEqual(plan.ausfuehren.map(a => a.wert), ['2+', 'nb', '1-2', 4]);
});

test('Kinder ohne Note und mit Lernstatus statt Note werden nicht geschrieben', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D'], kuerzel: ['Sha'] });
  const ctx = { kursName: '6b Deutsch', schueler: [kind('1', 'Jonas', 'Albrecht', null), kind('2', 'Mila', 'Brandt', 'OK', { wertHinweis: 'kein-notenwert' })] };
  const plan = N.entscheiden(N.planen(mappe(['x', zellen]), ctx), { spalte: 5 });
  assert.deepEqual(plan.ausfuehren, []);
  assert.equal(plan.zusammenfassung.ohneNote.length, 1);
  assert.equal(plan.zusammenfassung.keinNotenwert.length, 1);
});

test('Gleiche Note bleibt, andere Note führt zu Konflikt-Rückfrage', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D'], kuerzel: ['Sha'], extra: { F10: 2, F11: '3' } });
  const ctx = { kursName: '6b Deutsch', schueler: [kind('1', 'Jonas', 'Albrecht', '2'), kind('2', 'Mila', 'Brandt', '4')] };
  let plan = N.entscheiden(N.planen(mappe(['x', zellen]), ctx), { spalte: 5 });
  assert.equal(plan.schreibungen.find(s => s.schuelerId === '1').art, 'gleich');
  assert.ok(rueckfrage(plan, 'konflikt:2'));
  assert.equal(plan.fertig, false);

  const behalten = N.entscheiden(plan, { 'konflikt:2': 'behalten' });
  assert.deepEqual(behalten.ausfuehren, []);
  assert.equal(behalten.zusammenfassung.behalten, 1);

  const alle = N.entscheiden(plan, { alleKonflikte: 'ueberschreiben' });
  assert.equal(alle.fertig, true);
  assert.deepEqual(alle.ausfuehren, [{ adresse: 'F11', wert: 4 }]);
});

test('Zellen mit Formel werden nie überschrieben', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D'], kuerzel: ['Sha'], extra: { F10: { wert: 3, formel: true } } });
  const plan = N.entscheiden(N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [kind('1', 'Jonas', 'Albrecht', '2')] }), { spalte: 5 });
  assert.deepEqual(plan.ausfuehren, []);
  assert.ok(plan.hinweise.some(h => h.typ === 'formel'));
});

test('Spaltenwechsel verwirft Konfliktentscheidungen', () => {
  const zellen = zeugnisliste({ kinder: KINDER_6B, faecher: ['D', 'E'], kuerzel: ['Sha', 'Sha'], extra: { F10: 1, G10: 1 } });
  let plan = N.entscheiden(N.planen(mappe(['x', zellen]), { kursName: '6b Deutsch', schueler: [kind('1', 'Jonas', 'Albrecht', '2')] }), { spalte: 5, alleKonflikte: 'ueberschreiben' });
  assert.equal(plan.fertig, true);
  plan = N.entscheiden(plan, { spalte: 6 });
  assert.equal(plan.fertig, false);
});

// --- XML --------------------------------------------------------------------
const BLATT = '<worksheet><cols><col min="1" max="3" width="9" style="4" customWidth="1"/></cols><sheetData>'
  + '<row r="8" spans="1:3"><c r="B8" s="2" t="s"><v>0</v></c></row>'
  + '<row r="10" spans="1:3"><c r="A10" s="3" t="s"><v>1</v></c><c r="C10" s="7"/><c r="E10" s="8"><f>NOW()</f><v>1</v></c></row>'
  + '<row r="12" s="9" customFormat="1"/>'
  + '</sheetData><mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells></worksheet>';

test('patcheBlattXml setzt Zahl in vorhandene leere Zelle und behält den Stil', () => {
  const xml = N.patcheBlattXml(BLATT, [{ adresse: 'C10', wert: 2 }]);
  assert.ok(xml.includes('<c r="C10" s="7"><v>2</v></c>'));
  assert.ok(xml.includes('<c r="E10" s="8"><f>NOW()</f><v>1</v></c>'), 'Andere Zellen bleiben unverändert');
  assert.ok(xml.includes('<mergeCell ref="A1:B1"/>'));
});

test('patcheBlattXml schreibt Text als Inline-String mit XML-Escaping', () => {
  const xml = N.patcheBlattXml(BLATT, [{ adresse: 'C10', wert: '2+ <&>' }]);
  assert.ok(xml.includes('<c r="C10" s="7" t="inlineStr"><is><t>2+ &lt;&amp;&gt;</t></is></c>'));
});

test('patcheBlattXml fügt fehlende Zelle in richtiger Spaltenreihenfolge ein', () => {
  const xml = N.patcheBlattXml(BLATT, [{ adresse: 'B10', wert: 3 }, { adresse: 'F10', wert: 4 }]);
  const zeile = /<row r="10"[\s\S]*?<\/row>/.exec(xml)[0];
  const refs = [...zeile.matchAll(/<c r="([A-Z]+10)"/g)].map(m => m[1]);
  assert.deepEqual(refs, ['A10', 'B10', 'C10', 'E10', 'F10']);
  assert.ok(zeile.includes('<c r="B10" s="4"><v>3</v></c>'), 'Spaltenstil wird übernommen');
});

test('patcheBlattXml öffnet leere Zeile und legt fehlende Zeile sortiert an', () => {
  const xml = N.patcheBlattXml(BLATT, [{ adresse: 'B12', wert: 1 }, { adresse: 'B11', wert: 5 }]);
  assert.ok(xml.includes('<row r="12" s="9" customFormat="1"><c r="B12" s="9"><v>1</v></c></row>'));
  assert.ok(xml.indexOf('<row r="11">') > xml.indexOf('<row r="10"'));
  assert.ok(xml.indexOf('<row r="11">') < xml.indexOf('<row r="12"'));
});

test('patcheBlattXml verwechselt A1 nicht mit A10', () => {
  const xml = N.patcheBlattXml('<worksheet><sheetData><row r="1"><c r="A1"/></row><row r="10"><c r="A10" s="1"/></row></sheetData></worksheet>', [{ adresse: 'A1', wert: 9 }]);
  assert.ok(xml.includes('<c r="A1"><v>9</v></c>'));
  assert.ok(xml.includes('<c r="A10" s="1"/>'));
});

test('blattPfade und setzeNeuberechnung', () => {
  const wb = '<workbook><sheets><sheet name="5b &amp; 5c" sheetId="1" r:id="rId1"/><sheet name="Zeugnis" sheetId="2" r:id="rId2"/></sheets><calcPr calcId="191029"/></workbook>';
  const rels = '<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="/xl/worksheets/sheet2.xml"/></Relationships>';
  assert.deepEqual(N.blattPfade(wb, rels), { '5b & 5c': 'xl/worksheets/sheet1.xml', Zeugnis: 'xl/worksheets/sheet2.xml' });
  assert.ok(N.setzeNeuberechnung(wb).includes('<calcPr calcId="191029" fullCalcOnLoad="1"/>'));
  assert.ok(N.setzeNeuberechnung('<workbook><sheets></sheets></workbook>').includes('</sheets><calcPr fullCalcOnLoad="1"/>'));
});

test('Fach wird aus dem Kursnamen abgeleitet', () => {
  assert.equal(N.fachAusKursname('6b Englisch'), 'E');
  assert.equal(N.fachAusKursname('Mathe 5a'), 'M');
  assert.equal(N.fachAusKursname('5c Bio'), 'BIO');
  assert.equal(N.fachAusKursname('8a Gesellschaftslehre'), 'GL');
});
