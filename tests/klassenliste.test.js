// Tests für das Modul „Klassenlisten-Erkennung“. Alle Namen sind erfunden.
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../klassenliste.js');

/**
 * Baut OCR-Zeilen aus einer „Druckvorlage“: Jede Zeile ist ein String, Spalten beginnen dort,
 * wo sie im String stehen (1 Zeichen = 10 px). So entstehen realistische Wortpositionen.
 */
function ocr(zeilen, sicherheiten = {}) {
  return {
    zeilen: zeilen.map(z => {
      const woerter = [];
      const re = /\S+/g;
      let m;
      while ((m = re.exec(z))) {
        woerter.push({ text: m[0], x0: m.index * 10, x1: (m.index + m[0].length) * 10, sicherheit: sicherheiten[m[0]] ?? 95 });
      }
      return { woerter };
    })
  };
}
const namen = erg => erg.kinder.map(k => `${k.nachname}|${k.vorname}`);

test('Tabelle mit Kopf „Name | Vorname“ und mehrteiligen Namen wird über Spaltenpositionen getrennt', () => {
  const erg = K.namenErkennen(ocr([
    'Katholische Hauptschule Musterstadt',
    'Klassenliste 5b                          Schuljahr 2026/27',
    'Nr.  Name              Vorname          Geb.-Datum   m/w',
    '1.   Al Masri          Tarek            03.04.2015   m',
    '2.   Arkan Kamel       Rana             12.11.2014   w',
    '3.   Becker            Mia-Sophie       01.02.2015   w',
    '4.   Celik             Emre Can         22.08.2014   m',
    'Seite 1 von 1'
  ]));
  assert.deepEqual(namen(erg), ['Al Masri|Tarek', 'Arkan Kamel|Rana', 'Becker|Mia-Sophie', 'Celik|Emre Can']);
  assert.ok(erg.kinder.every(k => !k.unsicher));
  assert.equal(erg.kursVorschlag, '5b');
});

test('Format „Nachname, Vorname“ wird am Komma getrennt', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Albrecht, Jonas\nvan der Berg, Lotta Marie\nYıldız, Ömer'));
  assert.deepEqual(namen(erg), ['Albrecht|Jonas', 'van der Berg|Lotta Marie', 'Yıldız|Ömer']);
  assert.ok(erg.kinder.every(k => !k.unsicher));
});

test('Liste „Vorname Nachname“ ohne Kopf wird an der Sortierung nach Nachnamen erkannt', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Tom Adler\nLina Bauer\nAnna Christ\nBen Dorn\nMia Engel'));
  assert.equal(erg.reihenfolge, 'vorname-zuerst');
  assert.deepEqual(namen(erg), ['Adler|Tom', 'Bauer|Lina', 'Christ|Anna', 'Dorn|Ben', 'Engel|Mia']);
});

test('Liste „Nachname Vorname“ ohne Kopf ist Standard', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Adler Tom\nBauer Lina\nChrist Anna'));
  assert.equal(erg.reihenfolge, 'nachname-zuerst');
  assert.deepEqual(namen(erg), ['Adler|Tom', 'Bauer|Lina', 'Christ|Anna']);
});

test('Mehrteilige Namen ohne Positionen werden als unsicher markiert statt still falsch geraten', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Adler Tom\nBauer Lina\nArkan Kamel Rana'));
  const rana = erg.kinder.find(k => k.vorname.includes('Rana') || k.nachname.includes('Rana'));
  assert.equal(rana.unsicher, true);
  assert.match(rana.grund, /unklar/);
  assert.equal(erg.kinder.find(k => k.nachname === 'Adler').unsicher, false);
});

test('Tabs aus kopiertem Excel-Text gelten als Spaltengrenze', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Name\tVorname\nArkan Kamel\tRana\nAl Masri\tTarek Ali'));
  assert.deepEqual(namen(erg), ['Arkan Kamel|Rana', 'Al Masri|Tarek Ali']);
  assert.ok(erg.kinder.every(k => !k.unsicher));
});

test('Tabs gelten auch bei gemischter Liste mit Nummerierung, Kopf und Klassenzeile als Spaltengrenze', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Klassenliste 6c\nName\tVorname\n1. Albrecht\tJonas\nArkan Kamel\tRana\nKARABEKTAŞOĞLU\tÖmer\nvan der Berg\tLotta Marie\nSchulz\t03.04.2015'));
  assert.deepEqual(namen(erg), ['Albrecht|Jonas', 'Arkan Kamel|Rana', 'Karabektaşoğlu|Ömer', 'van der Berg|Lotta Marie', 'Schulz|']);
  assert.deepEqual(erg.kinder.map(k => k.unsicher), [false, false, false, false, true]);
  assert.equal(erg.kursVorschlag, '6c');
});

test('Dritte Textspalte nach einem Tab landet nicht im Vornamen', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Adler\tTom\tkath\nBauer\tLina Marie\tSport-AG'));
  assert.deepEqual(namen(erg), ['Adler|Tom', 'Bauer|Lina Marie']);
});

test('OCR-Spalten mit großem Abstand werden auch ohne Kopfzeile erkannt', () => {
  const erg = K.namenErkennen(ocr([
    'Al Masri            Tarek',
    'Becker              Mia Sophie',
    'Celik               Emre',
    'van der Berg        Lotta'
  ]));
  assert.deepEqual(namen(erg), ['Al Masri|Tarek', 'Becker|Mia Sophie', 'Celik|Emre', 'van der Berg|Lotta']);
});

test('Nummerierungen, Datum, Geschlecht und Konfession werden entfernt', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('12) Becker, Mia 01.02.2015 w kath\n13. Dorn, Ben m\n14 Engel, Ida'));
  assert.deepEqual(namen(erg), ['Becker|Mia', 'Dorn|Ben', 'Engel|Ida']);
});

test('Sonderzeichen und Bindestriche bleiben erhalten, GROSSSCHRIFT wird normalisiert', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('KARABEKTAŞOĞLU, Feyza\nMÜLLER-LÜDENSCHEIDT, Jörg\nØstergård, Søren'));
  assert.deepEqual(namen(erg), ['Karabektaşoğlu|Feyza', 'Müller-Lüdenscheidt|Jörg', 'Østergård|Søren']);
});

test('Typische Erkennungsfehler werden bereinigt (| statt l, Satzzeichen am Rand)', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('"Mü|ler, Lea.\n_Adler, Tom;'));
  assert.deepEqual(namen(erg), ['Müller|Lea', 'Adler|Tom']);
});

test('Senkrechte Striche einer Tabellenlinie trennen die Spalten', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('| Al Masri | Tarek |\n| Becker | Mia Sophie |'));
  assert.deepEqual(namen(erg), ['Al Masri|Tarek', 'Becker|Mia Sophie']);
});

test('Schlecht lesbare Wörter markieren die Zeile als unsicher', () => {
  const erg = K.namenErkennen(ocr(['Adler     Tom', 'Bauer     L1na', 'Christ    Anna'], { L1na: 30 }));
  const lina = erg.kinder.find(k => k.nachname === 'Bauer');
  assert.equal(lina.unsicher, true);
  assert.match(lina.grund, /lesbar/);
});

test('Bereits vorhandene Kinder werden übersprungen, Duplikate zwischen zwei Fotos nur einmal übernommen', () => {
  const seite1 = ocr(['Adler     Tom', 'Bauer     Lina']).zeilen;
  const seite2 = ocr(['Bauer     Lina', 'Christ    Anna']).zeilen;
  const erg = K.namenErkennen({ zeilen: [...seite1, ...seite2] }, { vorhandeneKinder: [{ vorname: 'Tom', nachname: 'Adler' }] });
  assert.deepEqual(namen(erg), ['Bauer|Lina', 'Christ|Anna']);
  assert.deepEqual(erg.uebersprungen, [{ vorname: 'Tom', nachname: 'Adler' }]);
});

test('Unbrauchbares Ergebnis liefert einen Hinweis', () => {
  const foto = K.namenErkennen(ocr(['~~ ##', '12 34']));
  assert.equal(foto.kinder.length, 0);
  assert.match(foto.hinweis, /Foto/);
  const text = K.namenErkennen(K.ausEingefuegtemText('   '));
  assert.match(text.hinweis, /Text/);
});

test('Einzelner Name wird übernommen, aber als unsicher markiert', () => {
  const erg = K.namenErkennen(K.ausEingefuegtemText('Adler, Tom\nMaximilian'));
  const max = erg.kinder.find(k => k.nachname === 'Maximilian' || k.vorname === 'Maximilian');
  assert.equal(max.unsicher, true);
});

test('ausTesseract versteht v5 (lines) und v6 (blocks)', () => {
  const wort = (text, x0, conf = 90) => ({ text, confidence: conf, bbox: { x0, x1: x0 + 50, y0: 0, y1: 10 } });
  const v5 = { lines: [{ words: [wort('Adler', 0), wort('Tom', 200)] }] };
  const v6 = { blocks: [{ paragraphs: [{ lines: [{ words: [wort('Adler', 0), wort('Tom', 200)] }] }] }] };
  for (const d of [v5, v6]) {
    const t = K.ausTesseract(d);
    assert.deepEqual(t.zeilen[0].woerter.map(w => [w.text, w.x0, w.sicherheit]), [['Adler', 0, 90], ['Tom', 200, 90]]);
  }
});
