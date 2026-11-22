/*
 * Klassenlisten-Erkennung
 * Zerlegt erkannten Text (Foto per Texterkennung oder eingefügter Text) in Vor- und Nachnamen.
 * Reine Logik ohne DOM, appData oder OCR-Bibliothek (siehe docs/adr/0001).
 *
 * Einstiegspunkt:
 *   namenErkennen(erkannterText, kontext) → { kinder, uebersprungen, kursVorschlag, hinweis, reihenfolge }
 * Umwandlungen für den Adapter:
 *   ausEingefuegtemText(text)  → erkannterText
 *   ausTesseract(data)         → erkannterText
 *
 * erkannterText = { zeilen: [{ woerter: [{ text, sicherheit?, x0?, x1? }] }] }
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Klassenliste = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SICHERHEIT_MIN = 60;
  const KOPF_WOERTER = ['name', 'namen', 'nachname', 'familienname', 'vorname', 'vornamen', 'rufname', 'schuler', 'schulerin', 'schuelerin', 'schueler', 'nr', 'lfd', 'geburtsdatum', 'geb', 'geschlecht', 'konf', 'religion'];
  const STOER_WOERTER = ['klasse', 'klassenliste', 'kursliste', 'zeugnisliste', 'notenliste', 'schuljahr', 'halbjahr', 'lehrer', 'lehrerin', 'klassenlehrer', 'klassenlehrerin', 'klassenleitung', 'datum', 'seite', 'schule', 'hauptschule', 'realschule', 'gesamtschule', 'gymnasium', 'grundschule', 'sekundarschule', 'stand', 'gedruckt', 'schild', 'unterschrift', 'summe', 'gesamt', 'anzahl', 'druckdatum', 'erstellt'];
  const ANHANG_WOERTER = ['m', 'w', 'd', 'mannlich', 'weiblich', 'divers', 'kr', 'rk', 'ev', 'kath', 'isl', 'ob', 'ohne'];

  // ---------------------------------------------------------------------------
  // Normalisierung
  // ---------------------------------------------------------------------------
  function ohneDiakritika(t) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/ø/g, 'o');
  }
  function nurBuchstaben(s) {
    return ohneDiakritika(String(s || '').toLowerCase()).replace(/[^a-z]/g, '');
  }
  function schluessel(nachname, vorname) {
    const n = s => ohneDiakritika(String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')).replace(/[^a-z]+/g, ' ').trim();
    return n(nachname) + '|' + n(vorname);
  }
  function hatBuchstaben(s) {
    return /\p{L}/u.test(s);
  }
  function titelSchreibung(wort) {
    const buchstaben = wort.replace(/[^\p{L}]/gu, '');
    if (buchstaben.length < 2 || buchstaben !== buchstaben.toUpperCase()) return wort;
    return wort.toLowerCase().replace(/(^|[-'’\s])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  }
  function saeubereWort(t) {
    let w = String(t || '').trim();
    w = w.replace(/(\p{L})[|](\p{L})/gu, '$1l$2'); // "Mü|ler" → "Müller"
    w = w.replace(/^[^\p{L}\d]+/u, '').replace(/[^\p{L}\d]+$/u, '');
    return w;
  }
  function median(werte) {
    if (!werte.length) return 0;
    const s = [...werte].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // ---------------------------------------------------------------------------
  // Eingaben umwandeln
  // ---------------------------------------------------------------------------
  /** Eingefügter Text: Tabs werden zu einem expliziten Spaltentrenner (wie „|“ auf einem Foto). */
  function ausEingefuegtemText(text) {
    const zeilen = String(text || '').replace(/\r/g, '').split('\n').map(z => {
      const woerter = [];
      let x = 0;
      const re = /(\t+)|( +)|([^\t ]+)/g;
      let m;
      while ((m = re.exec(z))) {
        if (m[1]) {
          if (woerter.length) woerter.push({ text: '|', x0: x, x1: x + 1 });
          x += 20 * m[1].length;
        }
        else if (m[2]) x += m[2].length;
        else {
          woerter.push({ text: m[3], x0: x, x1: x + m[3].length });
          x += m[3].length;
        }
      }
      return { woerter };
    }).filter(z => z.woerter.length);
    return { zeilen, eingefuegt: true };
  }

  /** Tesseract.js-Ergebnis (v5: data.lines, v6: data.blocks[].paragraphs[].lines). */
  function ausTesseract(data) {
    let linien = (data && data.lines) || [];
    if (!linien.length && data && data.blocks) {
      linien = data.blocks.flatMap(b => (b.paragraphs || []).flatMap(p => p.lines || []));
    }
    return {
      zeilen: linien.map(l => ({
        woerter: (l.words || []).filter(w => String(w.text || '').trim()).map(w => ({
          text: w.text,
          sicherheit: typeof w.confidence === 'number' ? w.confidence : undefined,
          x0: w.bbox ? w.bbox.x0 : undefined,
          x1: w.bbox ? w.bbox.x1 : undefined
        }))
      })).filter(z => z.woerter.length)
    };
  }

  // ---------------------------------------------------------------------------
  // Zeilen klassifizieren und säubern
  // ---------------------------------------------------------------------------
  function istKopfZeile(woerter) {
    const n = woerter.map(w => nurBuchstaben(w.text));
    return n.includes('vorname') || n.includes('nachname') || (n.includes('name') && n.length <= 6 && n.filter(x => KOPF_WOERTER.includes(x)).length >= 2);
  }
  function istStoerZeile(woerter) {
    const n = woerter.map(w => nurBuchstaben(w.text));
    if (n.some(x => STOER_WOERTER.includes(x))) return true;
    const text = woerter.map(w => w.text).join(' ');
    if (!hatBuchstaben(text)) return true;
    if (/^\s*(seite\s*)?\d+\s*(\/|von)\s*\d+\s*$/i.test(text)) return true;
    // Adresszeile mit Postleitzahl („45772 Musterstadt“) – eine Nummerierung hat höchstens drei Ziffern
    if (/^\s*\d{4,5}\s+\p{L}/u.test(text)) return true;
    return false;
  }
  function klasseAus(woerter) {
    const text = woerter.map(w => w.text).join(' ');
    const m = /(?:klasse|klassenliste|kursliste|zeugnisliste|notenliste)\s*:?\s*(\d{1,2})\s*([a-zA-Z])(?![a-zA-Z])/i.exec(text);
    return m ? m[1] + m[2].toLowerCase() : null;
  }
  /** "L1na" – überwiegend Buchstaben mit einzelnen Ziffern: vermutlich ein Lesefehler, kein Anhang. */
  function istVerleseneZiffer(wortText) {
    const t = String(wortText);
    const l = (t.match(/\p{L}/gu) || []).length;
    const d = (t.match(/\d/g) || []).length;
    return d > 0 && l >= 2 && l > d;
  }
  function istAnhang(wortText) {
    const t = wortText.trim();
    if (/\d/.test(t)) return !istVerleseneZiffer(t);
    const b = nurBuchstaben(t);
    if (!b) return true;
    if (ANHANG_WOERTER.includes(b) && t.length <= 6) return true;
    return false;
  }
  /**
   * Senkrechter Strich oder Rest eines Kästchenrands, den die Texterkennung als „I“, „LT“, „[|“ o. Ä. liest.
   * Echte Namen bestehen nie nur aus diesen Zeichen.
   */
  function istTrenner(roh) {
    const t = String(roh).trim();
    if (/^[|│¦]+$/.test(t)) return true;
    return t.length <= 3 && /^[|│¦\[\](){}_—–\-=+~.:;!/\\IlLTJ1]+$/.test(t) && !/^[A-Za-z]\.$/.test(t);
  }
  /** Entfernt Nummerierung, Trennstriche und Anhänge (Datum, m/w, Konfession). Gibt Wörter mit Positionen zurück. */
  function saeubereZeile(woerter) {
    let w = woerter.map(x => {
      const roh = String(x.text);
      const wort = { ...x, roh, text: saeubereWort(roh), trenner: istTrenner(roh) };
      if (istVerleseneZiffer(roh)) wort.sicherheit = Math.min(typeof x.sicherheit === 'number' ? x.sicherheit : 100, 30);
      return wort;
    });
    // Nummerierung vorn
    while (w.length && (w[0].trenner || /^\d{1,3}[.)]?$/.test(w[0].text) || w[0].text === '')) w.shift();
    // Ab dem ersten Anhang (Zahl, Datum, m/w, Konfession) bis zum Ende abschneiden – aber nie das erste Wort
    const ersterAnhang = w.findIndex((x, i) => i > 0 && !x.trenner && istAnhang(x.roh));
    if (ersterAnhang > 0) w = w.slice(0, ersterAnhang);
    // Trenner hinten
    while (w.length && (w[w.length - 1].trenner || w[w.length - 1].text === '')) w.pop();
    return w;
  }

  // ---------------------------------------------------------------------------
  // Spaltengrenzen
  // ---------------------------------------------------------------------------
  function hatPositionen(zeilen) {
    return zeilen.length && zeilen.every(z => z.every(w => typeof w.x0 === 'number' && typeof w.x1 === 'number'));
  }
  function findeSpaltengrenze(zeilen) {
    const mehrwortig = zeilen.filter(z => z.length >= 2);
    if (mehrwortig.length < 2) return null;
    const luecken = mehrwortig.flatMap(z => z.slice(1).map((w, i) => w.x0 - z[i].x1)).sort((a, b) => a - b);
    // „Normale“ Wortlücke: unteres Viertel, damit breite Spaltenlücken den Wert nicht verfälschen
    const normal = luecken[Math.floor(luecken.length / 4)] || 0;
    const hoehe = median(mehrwortig.flatMap(z => z.filter(w => !w.trenner).map(w => (w.x1 - w.x0) / Math.max(1, w.text.length))));
    const toleranz = Math.max(hoehe * 2, 1);
    const kandidaten = [];
    for (const z of mehrwortig) {
      const explizit = z.findIndex(w => w.trenner);
      if (explizit > 0 && explizit < z.length - 1) { kandidaten.push(z[explizit + 1].x0); continue; }
      let best = -1;
      let bestLuecke = 0;
      z.slice(1).forEach((w, i) => {
        const l = w.x0 - z[i].x1;
        if (l > bestLuecke) { bestLuecke = l; best = i + 1; }
      });
      if (best > 0 && bestLuecke > Math.max(normal * 1.8, hoehe * 1.5)) kandidaten.push(z[best].x0);
    }
    if (kandidaten.length < Math.max(2, mehrwortig.length * 0.4)) return null;
    // größtes Cluster
    let bester = null;
    for (const k of kandidaten) {
      const mitglieder = kandidaten.filter(x => Math.abs(x - k) <= toleranz);
      if (!bester || mitglieder.length > bester.anzahl) bester = { mitte: median(mitglieder), anzahl: mitglieder.length };
    }
    if (bester.anzahl < Math.max(2, mehrwortig.length * 0.4)) return null;
    return { x: bester.mitte, toleranz };
  }

  // ---------------------------------------------------------------------------
  // Reihenfolge
  // ---------------------------------------------------------------------------
  function sortiertheit(liste) {
    const n = liste.map(x => schluessel(x, ''));
    if (n.length < 3) return 0;
    let ok = 0;
    for (let i = 1; i < n.length; i++) if (n[i - 1] <= n[i]) ok++;
    return ok / (n.length - 1);
  }

  // ---------------------------------------------------------------------------
  // Hauptfunktion
  // ---------------------------------------------------------------------------
  function namenErkennen(erkannterText, kontext) {
    const ctx = kontext || {};
    const vorhanden = new Set((ctx.vorhandeneKinder || []).map(k => schluessel(k.nachname, k.vorname)));
    let reihenfolge = null; // 'nachname-zuerst' | 'vorname-zuerst'
    let kopfGrenze = null;
    let kursVorschlag = null;

    const kandidaten = [];
    for (const z of (erkannterText && erkannterText.zeilen) || []) {
      const woerter = (z.woerter || []).filter(w => String(w.text || '').trim());
      if (!woerter.length) continue;
      const klasse = klasseAus(woerter);
      if (klasse && !kursVorschlag) kursVorschlag = klasse;
      if (istKopfZeile(woerter)) {
        const n = woerter.map(w => nurBuchstaben(w.text));
        const iVor = n.findIndex(x => x === 'vorname' || x === 'vornamen' || x === 'rufname');
        const iNach = n.findIndex(x => x === 'name' || x === 'nachname' || x === 'familienname' || x === 'namen');
        if (iVor >= 0 && iNach >= 0) {
          reihenfolge = iNach < iVor ? 'nachname-zuerst' : 'vorname-zuerst';
          const zweite = woerter[Math.max(iVor, iNach)];
          if (typeof zweite.x0 === 'number') kopfGrenze = zweite.x0;
        }
        continue;
      }
      if (istStoerZeile(woerter)) continue;
      const sauber = saeubereZeile(woerter);
      if (!sauber.length) continue;
      const buchstaben = sauber.map(w => w.text).join('').replace(/[^\p{L}]/gu, '');
      if (buchstaben.length < 2) continue;
      kandidaten.push(sauber);
    }

    // Spaltengrenze bestimmen
    let grenze = null;
    if (hatPositionen(kandidaten)) {
      const gefunden = findeSpaltengrenze(kandidaten);
      if (kopfGrenze !== null) {
        const zeichenBreite = median(kandidaten.flatMap(z => z.filter(w => !w.trenner).map(w => (w.x1 - w.x0) / Math.max(1, w.text.length))));
        grenze = { x: kopfGrenze, toleranz: Math.max(zeichenBreite * 2, 1) };
      } else grenze = gefunden;
    }

    // Zeilen aufteilen (in Teil A = erste Spalte, Teil B = zweite Spalte)
    const geteilt = kandidaten.map(w => {
      const komma = w.findIndex((x, i) => i < w.length - 1 && /,\s*$/.test(x.roh));
      const unsicherLesbar = w.some(x => typeof x.sicherheit === 'number' && x.sicherheit < SICHERHEIT_MIN);
      const texte = w.filter(x => !x.trenner).map(x => titelSchreibung(x.text)).filter(Boolean);
      if (komma >= 0) {
        const a = w.slice(0, komma + 1).filter(x => !x.trenner).map(x => titelSchreibung(x.text));
        // Nach dem Vornamen beginnt mit dem ersten Trenner die nächste Tabellenspalte (Kästchen)
        const rest = w.slice(komma + 1);
        const ende = rest.findIndex(x => x.trenner);
        const b = (ende >= 0 ? rest.slice(0, ende) : rest).map(x => titelSchreibung(x.text)).filter(Boolean);
        return { a, b, art: 'komma', unsicherLesbar };
      }
      const trenner = w.findIndex(x => x.trenner);
      if (trenner > 0 && trenner < w.length - 1) {
        // Nur die zweite Spalte übernehmen; alles nach einem weiteren Trenner ist eine Zusatzspalte
        const rest = w.slice(trenner + 1);
        const naechster = rest.findIndex(x => x.trenner);
        const b = (naechster >= 0 ? rest.slice(0, naechster) : rest).map(x => titelSchreibung(x.text));
        return { a: w.slice(0, trenner).map(x => titelSchreibung(x.text)), b, art: 'spalte', unsicherLesbar };
      }
      if (trenner === w.length - 1 && texte.length === 1) return { a: [texte[0]], b: [], art: 'eins', unsicherLesbar };
      if (grenze) {
        const ohneTrenner = w.filter(x => !x.trenner);
        const i = ohneTrenner.findIndex(x => x.x0 >= grenze.x - grenze.toleranz);
        if (i > 0) return { a: ohneTrenner.slice(0, i).map(x => titelSchreibung(x.text)), b: ohneTrenner.slice(i).map(x => titelSchreibung(x.text)), art: 'spalte', unsicherLesbar };
      }
      if (texte.length === 2) return { a: [texte[0]], b: [texte[1]], art: 'zwei', unsicherLesbar };
      if (texte.length === 1) return { a: [texte[0]], b: [], art: 'eins', unsicherLesbar };
      return { a: null, b: null, woerter: texte, art: 'unklar', unsicherLesbar };
    });

    // Reihenfolge bestimmen
    const komma = geteilt.some(g => g.art === 'komma');
    if (!reihenfolge && komma) reihenfolge = 'nachname-zuerst';
    if (!reihenfolge) {
      const paare = geteilt.map(g => g.a && g.b && g.b.length ? [g.a.join(' '), g.b.join(' ')] : (g.woerter ? [g.woerter[0], g.woerter[g.woerter.length - 1]] : null)).filter(Boolean);
      const sa = sortiertheit(paare.map(p => p[0]));
      const sb = sortiertheit(paare.map(p => p[1]));
      reihenfolge = sb > sa + 0.15 && sb >= 0.7 ? 'vorname-zuerst' : 'nachname-zuerst';
    }

    const kinder = [];
    const uebersprungen = [];
    const gesehen = new Set();
    for (const g of geteilt) {
      let nachname;
      let vorname;
      let unsicher = false;
      let grund = '';
      if (g.art === 'unklar') {
        const w = g.woerter;
        if (reihenfolge === 'vorname-zuerst') { nachname = w[w.length - 1]; vorname = w.slice(0, -1).join(' '); }
        else { nachname = w[0]; vorname = w.slice(1).join(' '); }
        unsicher = true;
        grund = 'Vor- und Nachname unklar getrennt';
      } else {
        const a = g.a.join(' ');
        const b = g.b.join(' ');
        if (g.art === 'komma' || reihenfolge === 'nachname-zuerst') { nachname = a; vorname = b; }
        else { nachname = b; vorname = a; }
        if (g.art === 'eins') {
          if (!nachname) { nachname = vorname; vorname = ''; }
          unsicher = true;
          grund = 'Nur ein Name erkannt';
        }
      }
      if (g.unsicherLesbar) {
        unsicher = true;
        grund = grund ? grund + ', schlecht lesbar' : 'Schlecht lesbar';
      }
      nachname = (nachname || '').replace(/,\s*$/, '').trim();
      vorname = (vorname || '').replace(/,\s*$/, '').trim();
      const key = schluessel(nachname, vorname);
      if (vorhanden.has(key)) { uebersprungen.push({ vorname, nachname }); continue; }
      if (gesehen.has(key)) continue;
      gesehen.add(key);
      const eintrag = { vorname, nachname, unsicher };
      if (grund) eintrag.grund = grund;
      kinder.push(eintrag);
    }

    const ergebnis = { kinder, uebersprungen, kursVorschlag, reihenfolge, hinweis: null };
    if (!kinder.length && !uebersprungen.length) {
      ergebnis.hinweis = erkannterText && erkannterText.eingefuegt
        ? 'Im Text wurden keine Namen gefunden. Eine Zeile pro Kind, z. B. „Nachname, Vorname“.'
        : 'Auf dem Foto wurden keine Namen erkannt. Tipp: Liste gerade, hell und formatfüllend fotografieren.';
    }
    return ergebnis;
  }

  // ---------------------------------------------------------------------------
  // Bildvorbereitung: Tabellenlinien entfernen
  // ---------------------------------------------------------------------------
  function otsuSchwelle(grau) {
    const hist = new Float64Array(256);
    for (let i = 0; i < grau.length; i++) hist[grau[i]]++;
    let summe = 0;
    for (let g = 0; g < 256; g++) summe += g * hist[g];
    let wB = 0, sB = 0, best = 0, schwelle = 128;
    for (let g = 0; g < 256; g++) {
      wB += hist[g];
      if (!wB) continue;
      const wF = grau.length - wB;
      if (!wF) break;
      sB += g * hist[g];
      const d = sB / wB - (summe - sB) / wF;
      const v = wB * wF * d * d;
      if (v > best) { best = v; schwelle = g; }
    }
    return schwelle;
  }

  /**
   * Längster zusammenhängender Pfad dunkler Pixel durch jedes Pixel – waagerecht (mit ±1 Zeile Drift
   * pro Schritt, damit schräg fotografierte Linien mitzählen) bzw. senkrecht.
   */
  function pfadLaengen(dunkel, b, h, waagerecht) {
    const vor = new Uint16Array(b * h);
    const rueck = new Uint16Array(b * h);
    const lang = waagerecht ? b : h;
    const quer = waagerecht ? h : b;
    const idx = waagerecht ? (s, q) => q * b + s : (s, q) => s * b + q;
    const lauf = (ziel, start, ende, schritt) => {
      for (let s = start; s !== ende; s += schritt) {
        const sv = s - schritt;
        for (let q = 0; q < quer; q++) {
          const i = idx(s, q);
          if (!dunkel[i]) continue;
          let m = 0;
          if (sv >= 0 && sv < lang) {
            m = ziel[idx(sv, q)];
            if (q > 0 && ziel[idx(sv, q - 1)] > m) m = ziel[idx(sv, q - 1)];
            if (q < quer - 1 && ziel[idx(sv, q + 1)] > m) m = ziel[idx(sv, q + 1)];
          }
          ziel[i] = Math.min(65535, m + 1);
        }
      }
    };
    lauf(vor, 0, lang, 1);
    lauf(rueck, lang - 1, -1, -1);
    const erg = new Uint16Array(b * h);
    for (let i = 0; i < erg.length; i++) if (dunkel[i]) erg[i] = Math.min(65535, vor[i] + rueck[i] - 1);
    return erg;
  }

  /** Dicke des dunklen Laufs (ohne Drift) durch jedes Pixel. */
  function laufDicke(dunkel, b, h, waagerecht) {
    const erg = new Uint16Array(b * h);
    const lang = waagerecht ? b : h;
    const quer = waagerecht ? h : b;
    const idx = waagerecht ? (s, q) => q * b + s : (s, q) => s * b + q;
    for (let q = 0; q < quer; q++) {
      let s = 0;
      while (s < lang) {
        if (!dunkel[idx(s, q)]) { s++; continue; }
        let e = s;
        while (e < lang && dunkel[idx(e, q)]) e++;
        const n = Math.min(65535, e - s);
        for (let k = s; k < e; k++) erg[idx(k, q)] = n;
        s = e;
      }
    }
    return erg;
  }

  /** Quadratische Ausdehnung einer Maske um r Pixel (getrennt nach Zeilen und Spalten). */
  function ausdehnen(maske, b, h, r) {
    if (r <= 0) return maske;
    const zw = new Uint8Array(b * h);
    for (let y = 0; y < h; y++) {
      let letzte = -1e9;
      for (let x = 0; x < b; x++) { if (maske[y * b + x]) letzte = x; if (x - letzte <= r) zw[y * b + x] = 1; }
      letzte = 1e9;
      for (let x = b - 1; x >= 0; x--) { if (maske[y * b + x]) letzte = x; if (letzte - x <= r) zw[y * b + x] = 1; }
    }
    const erg = new Uint8Array(b * h);
    for (let x = 0; x < b; x++) {
      let letzte = -1e9;
      for (let y = 0; y < h; y++) { if (zw[y * b + x]) letzte = y; if (y - letzte <= r) erg[y * b + x] = 1; }
      letzte = 1e9;
      for (let y = h - 1; y >= 0; y--) { if (zw[y * b + x]) letzte = y; if (letzte - y <= r) erg[y * b + x] = 1; }
    }
    return erg;
  }

  /**
   * Entfernt lange, dünne waagerechte und senkrechte Linien (Tabellengitter, Kästchen, Unterstreichungen)
   * aus einem Graustufenbild (ein Wert 0–255 pro Pixel). Schrift und dunkle Flächen bleiben stehen.
   * Ohne diesen Schritt liest die Texterkennung Kästchenränder als Buchstaben („|“, „I“, „[“).
   */
  function linienEntfernen(grau, breite, hoehe) {
    const b = breite, h = hoehe, n = b * h;
    const schwelle = otsuSchwelle(grau);
    const dunkel = new Uint8Array(n);
    for (let i = 0; i < n; i++) dunkel[i] = grau[i] <= schwelle ? 1 : 0;
    const groesse = Math.max(b, h);
    const minLaenge = Math.max(30, Math.round(groesse * 0.07));
    const maxDicke = Math.max(3, Math.round(groesse * 0.006));
    const pfadW = pfadLaengen(dunkel, b, h, true);
    const pfadS = pfadLaengen(dunkel, b, h, false);
    const dickeW = laufDicke(dunkel, b, h, true);
    const dickeS = laufDicke(dunkel, b, h, false);
    const linie = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (!dunkel[i]) continue;
      if ((pfadW[i] >= minLaenge && dickeS[i] <= maxDicke) || (pfadS[i] >= minLaenge && dickeW[i] <= maxDicke)) linie[i] = 1;
    }
    // Kreuzungen: dort sind beide Linien „dick“, aber Teil von zwei langen Linien
    const nah = ausdehnen(linie, b, h, maxDicke);
    for (let i = 0; i < n; i++) {
      if (dunkel[i] && !linie[i] && nah[i] && pfadW[i] >= minLaenge && pfadS[i] >= minLaenge) linie[i] = 1;
    }
    const weg = ausdehnen(linie, b, h, 1); // weiche Kanten der Linie mitnehmen
    const out = new Uint8ClampedArray(grau);
    for (let i = 0; i < n; i++) if (weg[i]) out[i] = 255;
    return out;
  }

  return { namenErkennen, ausEingefuegtemText, ausTesseract, linienEntfernen };
});
