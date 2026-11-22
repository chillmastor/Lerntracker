/*
 * Notenlisten-Übertragung
 * Überträgt Noten eines Lerntracker-Kurses in die Excel-Notenliste des Klassenlehrers.
 * Reine Logik ohne DOM, appData oder Excel-Bibliothek (siehe docs/adr/0001).
 *
 * Einstiegspunkte:
 *   planen(arbeitsmappe, kontext)        → plan
 *   entscheiden(plan, antworten)         → plan
 *   patcheBlattXml(blattXml, schreibungen) → blattXml
 * Hilfen für den Adapter:
 *   blattPfade(workbookXml, relsXml)     → { blattName: 'xl/worksheets/sheetN.xml' }
 *   setzeNeuberechnung(workbookXml)      → workbookXml
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Notenliste = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Zellen & Adressen
  // ---------------------------------------------------------------------------
  function zellWert(z) {
    if (z && typeof z === 'object' && 'wert' in z) return z.wert;
    return z;
  }
  function istFormel(z) {
    return !!(z && typeof z === 'object' && z.formel);
  }
  function text(z) {
    const v = zellWert(z);
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }
  function spaltenBuchstabe(c) {
    let s = '';
    let n = c + 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }
  function adresse(zeile, spalte) {
    return spaltenBuchstabe(spalte) + (zeile + 1);
  }
  function spaltenIndex(buchstaben) {
    let c = 0;
    for (const ch of buchstaben) c = c * 26 + (ch.charCodeAt(0) - 64);
    return c - 1;
  }
  function parseAdresse(a) {
    const m = /^([A-Z]+)(\d+)$/.exec(a);
    if (!m) throw new Error('Ungültige Zelladresse: ' + a);
    return { zeile: Number(m[2]) - 1, spalte: spaltenIndex(m[1]) };
  }

  // ---------------------------------------------------------------------------
  // Normalisierung
  // ---------------------------------------------------------------------------
  function ohneDiakritika(t) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/ø/g, 'o').replace(/đ/g, 'd');
  }
  function umlauteAusschreiben(t) {
    return t.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  }
  function saeubern(t) {
    return t.replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  /** Zwei Normalformen: "Güzel" → ["gueze l"-Form, "guzel"-Form], damit beide Schreibweisen passen. */
  function namensFormen(s) {
    const basis = String(s || '').toLowerCase().trim();
    return [...new Set([saeubern(ohneDiakritika(umlauteAusschreiben(basis))), saeubern(ohneDiakritika(basis))])];
  }
  function namenGleich(a, b) {
    const fa = namensFormen(a);
    const fb = namensFormen(b);
    return fa.some(x => fb.includes(x));
  }
  function nurBuchstaben(s) {
    return ohneDiakritika(String(s || '').toLowerCase()).replace(/[^a-z]/g, '');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let vorher = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const jetzt = [i];
      for (let j = 1; j <= b.length; j++) {
        const kosten = a[i - 1] === b[j - 1] ? 0 : 1;
        jetzt[j] = Math.min(vorher[j] + 1, jetzt[j - 1] + 1, vorher[j - 1] + kosten);
      }
      vorher = jetzt;
    }
    return vorher[b.length];
  }
  function namensAbstand(a, b) {
    let best = Infinity;
    for (const x of namensFormen(a)) for (const y of namensFormen(b)) best = Math.min(best, levenshtein(x, y));
    return best;
  }
  function schwelle(name) {
    const n = namensFormen(name)[0].replace(/ /g, '').length;
    if (n <= 3) return 0;
    if (n <= 5) return 1;
    if (n <= 9) return 2;
    return 3;
  }
  /** "Alessia" ⊂ "Alessia Sophia" (Wortebene), aber nicht gleich. */
  function teilmenge(a, b) {
    const ta = namensFormen(a)[0].split(' ').filter(Boolean);
    const tb = namensFormen(b)[0].split(' ').filter(Boolean);
    if (!ta.length || !tb.length || ta.length === tb.length) return false;
    const [kurz, lang] = ta.length < tb.length ? [ta, tb] : [tb, ta];
    return kurz.every(t => lang.includes(t));
  }

  // ---------------------------------------------------------------------------
  // Fächer
  // ---------------------------------------------------------------------------
  const FAECHER = {
    D: ['d', 'deu', 'deutsch'],
    E: ['e', 'en', 'eng', 'englisch'],
    M: ['m', 'ma', 'mathe', 'mathematik'],
    GL: ['gl', 'gesellschaftslehre'],
    GP: ['gp', 'geschichtepolitik'],
    GE: ['ge', 'g', 'geschichte'],
    EK: ['ek', 'erdkunde', 'geographie', 'geografie'],
    PK: ['pk', 'politik', 'politikwirtschaft'],
    NW: ['nw', 'naturwissenschaften', 'naturwissenschaft'],
    BIO: ['bio', 'bi', 'biologie'],
    CH: ['ch', 'chemie'],
    PH: ['ph', 'physik'],
    KU: ['ku', 'kunst'],
    MU: ['mu', 'musik'],
    TX: ['tx', 'textil', 'textilgestaltung'],
    SP: ['sp', 'sport'],
    KR: ['kr', 'kath', 'katholischereligion', 'religionkatholisch', 'kreligion', 'religion', 'rel', 'reli'],
    ER: ['er', 'ev', 'evangelischereligion', 'religionevangelisch'],
    PP: ['pp', 'praktischephilosophie', 'philosophie'],
    IF: ['if', 'inf', 'info', 'informatik'],
    SW: ['sw', 'sozialwissenschaften'],
    AW: ['aw', 'wirtschaft', 'arbeitslehrewirtschaft'],
    AH: ['ah', 'hauswirtschaft', 'arbeitslehrehauswirtschaft'],
    AT: ['at', 'technik', 'arbeitslehretechnik'],
    AL: ['al', 'arbeitslehre'],
    WPU: ['wpu', 'wp', 'wahlpflicht', 'wahlpflichtunterricht']
  };
  const FACH_INDEX = {};
  for (const [code, namen] of Object.entries(FAECHER)) for (const n of namen) FACH_INDEX[n] = code;
  const VERWANDT = [
    ['NW', 'BIO', 'CH', 'PH'],
    ['GL', 'GE', 'EK', 'GP', 'PK'],
    ['AL', 'AW', 'AH', 'AT'],
    ['KR', 'ER', 'PP']
  ];
  function verwandt(a, b) {
    return a !== b && VERWANDT.some(g => g.includes(a) && g.includes(b));
  }
  /** Fach aus einer Spaltenüberschrift: "E-G" → E, "Bio" → BIO, "If " → IF. */
  function fachAusKopf(kopf) {
    let t = ohneDiakritika(String(kopf || '').toLowerCase()).trim();
    const niveau = /^([a-z]+)\s*-\s*[ge]$/.exec(t);
    if (niveau) t = niveau[1];
    t = t.replace(/[^a-z]/g, '');
    return FACH_INDEX[t] || null;
  }
  /** Fach aus einem Kursnamen: "6b Englisch" → E, "Mathe 5a (Förder)" → M. */
  function fachAusKursname(name) {
    const rest = String(name || '').replace(/\b\d{1,2}\s*[a-zA-Z]?\b/g, ' ');
    const ganz = FACH_INDEX[nurBuchstaben(rest)];
    if (ganz) return ganz;
    const woerter = rest.split(/[\s,;()\/\-]+/).map(nurBuchstaben).filter(w => w.length >= 2);
    for (const w of woerter) if (FACH_INDEX[w] && w.length >= 3) return FACH_INDEX[w];
    for (const w of woerter) {
      const treffer = Object.keys(FACH_INDEX).find(k => k.length >= 4 && (w.startsWith(k) || k.startsWith(w) && w.length >= 4));
      if (treffer) return FACH_INDEX[treffer];
    }
    for (const w of woerter) if (FACH_INDEX[w]) return FACH_INDEX[w];
    return null;
  }
  function fachAusAngabe(angabe) {
    if (!angabe) return null;
    const t = String(angabe).trim();
    if (FAECHER[t.toUpperCase()]) return t.toUpperCase();
    return fachAusKopf(t) || fachAusKursname(t);
  }
  function klasseAusText(t) {
    const m = /(?:^|[^\d])(\d{1,2})\s*([a-zA-Z])(?![a-zA-Z])/.exec(String(t || ''));
    return m ? (m[1] + m[2]).toLowerCase() : null;
  }

  // ---------------------------------------------------------------------------
  // Blattanalyse
  // ---------------------------------------------------------------------------
  const KEINE_FACHSPALTE = ['fz', 'ges', 'ue', 'sbjahre', 'sbj', 'nr', 'name', 'vorname', 'nachname', 'klasse', 'stand', 'datum', 'hj', 'halbjahr'];
  const KEINE_FACHSPALTE_PRAEFIX = ['bemerk', 'schulpflicht', 'unterschrift', 'fehl', 'versaeum', 'notiz', 'kommentar'];
  function istFachKopf(kopf, kuerzel) {
    const t = nurBuchstaben(kopf);
    if (!t) return false;
    if (KEINE_FACHSPALTE.includes(t)) return false;
    if (KEINE_FACHSPALTE_PRAEFIX.some(p => t.startsWith(p))) return false;
    const k = nurBuchstaben(kuerzel);
    if (['ges', 'ue', 'fz'].includes(k)) return false;
    return true;
  }

  function findeKoepfe(zellen) {
    const koepfe = [];
    zellen.forEach((reihe, r) => {
      if (!reihe) return;
      let nameSp = -1;
      let vornameSp = -1;
      reihe.forEach((z, c) => {
        const t = nurBuchstaben(text(z));
        if ((t === 'name' || t === 'nachname') && nameSp < 0) nameSp = c;
        else if (t === 'vorname' && vornameSp < 0) vornameSp = c;
      });
      if (nameSp >= 0 && vornameSp >= 0) koepfe.push({ zeile: r, nameSpalte: nameSp, vornameSpalte: vornameSp });
    });
    return koepfe;
  }

  function analysiereBlatt(blatt) {
    const zellen = blatt.zellen || [];
    const koepfe = findeKoepfe(zellen);
    const bloecke = [];
    koepfe.forEach((kopf, i) => {
      const reihe = zellen[kopf.zeile] || [];
      const unter = zellen[kopf.zeile + 1] || [];
      let kuerzelZeile = null;
      const unterNameLeer = !text(unter[kopf.nameSpalte]) && !text(unter[kopf.vornameSpalte]);
      if (unterNameLeer && unter.some((z, c) => c !== kopf.nameSpalte && c !== kopf.vornameSpalte && /^[A-Za-zÄÖÜäöüß\/.]{1,8}$/.test(text(z)))) {
        kuerzelZeile = kopf.zeile + 1;
      }
      const spalten = [];
      reihe.forEach((z, c) => {
        if (c === kopf.nameSpalte || c === kopf.vornameSpalte) return;
        const k = text(z);
        const kz = kuerzelZeile !== null ? text((zellen[kuerzelZeile] || [])[c]) : '';
        if (!k || istFormel(z) || !istFachKopf(k, kz)) return;
        spalten.push({ spalte: c, kopf: k, kuerzel: kz, fach: fachAusKopf(k) });
      });
      const start = (kuerzelZeile !== null ? kuerzelZeile : kopf.zeile) + 1;
      const ende = i + 1 < koepfe.length ? koepfe[i + 1].zeile : zellen.length;
      const kinder = [];
      for (let r = start; r < ende; r++) {
        const z = zellen[r] || [];
        const nz = z[kopf.nameSpalte];
        const vz = z[kopf.vornameSpalte];
        const n = text(nz);
        const v = text(vz);
        if (!n && !v) {
          if (kinder.length) break;
          if (r - start > 2) break;
          continue;
        }
        if (istFormel(nz) || istFormel(vz)) continue;
        if (/:$/.test(n) || /:$/.test(v)) continue;
        if (!/[a-zA-ZÀ-ž]/.test(n + v)) continue;
        kinder.push({ zeile: r, nachname: n, vorname: v, block: i });
      }
      bloecke.push({ kopf, kuerzelZeile, spalten, kinder });
    });

    const kopfdaten = leseKopfdaten(zellen, koepfe.length ? koepfe[0].zeile : Math.min(zellen.length, 10));
    const kinder = bloecke.flatMap(b => b.kinder);
    const hauptBlock = bloecke.find(b => b.kinder.length) || null;
    return { name: blatt.name, zellen, bloecke, hauptBlock, kinder, ...kopfdaten };
  }

  function leseKopfdaten(zellen, bisZeile) {
    let klasse = null;
    let schuljahr = null;
    let halbjahr = null;
    for (let r = 0; r < Math.min(bisZeile, zellen.length); r++) {
      const reihe = zellen[r] || [];
      for (let c = 0; c < reihe.length; c++) {
        const t = text(reihe[c]);
        if (!t) continue;
        const danach = [1, 2, 3].map(d => text(reihe[c + d])).join(' ');
        const low = t.toLowerCase();
        if (!klasse && /klasse\s*$/.test(low)) klasse = klasseAusText(danach.replace(/\s+/g, ''));
        if (!klasse && /(kursliste|zeugnisliste|notenliste|klasse)\s*\d{1,2}\s*[a-z]\b/i.test(t)) klasse = klasseAusText(t);
        if (!schuljahr && /^schuljahr\s*$/.test(low)) schuljahr = danach.replace(/\s+/g, '') || null;
        if (!schuljahr && /schuljahr\s+\d/.test(low)) {
          const m = /schuljahr\s+([\d\/]+)/i.exec(t);
          if (m) schuljahr = m[1];
        }
        if (!halbjahr && /^halbjahr\s*$/.test(low)) halbjahr = text(reihe[c + 1]) || null;
        if (!halbjahr) {
          const m = /(\d)\s*\.\s*(?:hj|halbjahr)/i.exec(t);
          if (m) halbjahr = m[1];
        }
      }
    }
    return { klasse, schuljahr, halbjahr };
  }

  // ---------------------------------------------------------------------------
  // Spaltenbewertung
  // ---------------------------------------------------------------------------
  function spaltenIdentitaet(sp) {
    return nurBuchstaben(sp.kopf) + '|' + nurBuchstaben(sp.kuerzel);
  }
  function bewerteSpalte(sp, fach, kuerzel, gemerkteSpalte) {
    const kOk = !!(kuerzel && sp.kuerzel && nurBuchstaben(kuerzel) === nurBuchstaben(sp.kuerzel));
    if (gemerkteSpalte && gemerkteSpalte === spaltenIdentitaet(sp)) return { score: 100, grund: 'Wie beim letzten Mal' };
    if (fach && sp.fach === fach) {
      if (kOk) return { score: 90, grund: 'Fach und Kürzel passen' };
      if (kuerzel && sp.kuerzel) return { score: 55, grund: 'Fach passt, anderes Kürzel' };
      return { score: 70, grund: 'Fach passt' };
    }
    if (fach && sp.fach && verwandt(fach, sp.fach)) {
      return kOk ? { score: 45, grund: 'Verwandtes Fach, Kürzel passt' } : { score: 30, grund: 'Verwandtes Fach' };
    }
    if (kOk) return { score: 40, grund: 'Kürzel passt' };
    return { score: 0, grund: '' };
  }
  function rangiereSpalten(blatt, fach, kuerzel, gemerkteSpalte) {
    if (!blatt.hauptBlock) return [];
    const kinderZeilen = blatt.kinder.map(k => k.zeile);
    return blatt.hauptBlock.spalten.map(sp => {
      const b = bewerteSpalte(sp, fach, kuerzel, gemerkteSpalte);
      const befuellt = kinderZeilen.filter(r => text((blatt.zellen[r] || [])[sp.spalte]) !== '').length;
      return {
        spalte: sp.spalte,
        buchstabe: spaltenBuchstabe(sp.spalte),
        kopf: sp.kopf,
        kuerzel: sp.kuerzel,
        fach: sp.fach,
        befuellt,
        score: b.score,
        grund: b.grund
      };
    }).sort((a, b) => b.score - a.score || a.spalte - b.spalte);
  }

  // ---------------------------------------------------------------------------
  // Namensabgleich
  // ---------------------------------------------------------------------------
  function aliasSchluessel(nachname, vorname) {
    return String(nachname || '').trim() + '|' + String(vorname || '').trim();
  }
  function vergleiche(s, z) {
    for (const alias of s.aliase || []) {
      const [an, av] = String(alias).split('|');
      if (namenGleich(an, z.nachname) && namenGleich(av || '', z.vorname)) {
        return { score: 100, sicherheit: 'exakt', grund: 'Gemerkte Schreibweise' };
      }
    }
    const ln = namenGleich(s.nachname, z.nachname);
    const fn = namenGleich(s.vorname, z.vorname);
    if (ln && fn) return { score: 100, sicherheit: 'exakt', grund: '' };
    if (s.vorname && namenGleich(s.nachname, z.vorname) && namenGleich(s.vorname, z.nachname)) {
      return { score: 75, sicherheit: 'ähnlich', grund: 'Vor- und Nachname vertauscht' };
    }
    const fnTeil = teilmenge(s.vorname, z.vorname);
    const lnTeil = teilmenge(s.nachname, z.nachname);
    if ((ln && fnTeil) || (fn && lnTeil)) return { score: 85, sicherheit: 'ähnlich', grund: 'Name unvollständig' };
    if (!s.nachname || !z.nachname) return null;
    const dl = ln ? 0 : namensAbstand(s.nachname, z.nachname);
    const df = fn ? 0 : namensAbstand(s.vorname, z.vorname);
    const okL = ln || lnTeil || dl <= schwelle(s.nachname);
    const okF = fn || fnTeil || (!!s.vorname && !!z.vorname && df <= schwelle(s.vorname));
    if (okL && okF && (dl + df) > 0) {
      return { score: 70 - dl * 4 - df * 4, sicherheit: 'ähnlich', grund: 'Ähnliche Schreibweise' };
    }
    return null;
  }
  function ordneZu(schueler, kinder) {
    const paare = [];
    schueler.forEach(s => kinder.forEach(z => {
      const v = vergleiche(s, z);
      if (v) paare.push({ s, z, ...v });
    }));
    paare.sort((a, b) => b.score - a.score);
    const vergebenS = new Set();
    const vergebenZ = new Set();
    const ergebnis = new Map();
    for (const p of paare) {
      if (vergebenS.has(p.s.id) || vergebenZ.has(p.z.zeile)) continue;
      vergebenS.add(p.s.id);
      vergebenZ.add(p.z.zeile);
      ergebnis.set(p.s.id, { zeile: p.z.zeile, kind: p.z, sicherheit: p.sicherheit, grund: p.grund });
    }
    return ergebnis;
  }

  // ---------------------------------------------------------------------------
  // Werte
  // ---------------------------------------------------------------------------
  function zielWert(w) {
    const t = String(w).trim();
    if (/^\d+$/.test(t)) return Number(t);
    return t;
  }
  function wertGleich(a, b) {
    const n = v => String(zellWert(v) === null || zellWert(v) === undefined ? '' : zellWert(v)).trim().toLowerCase().replace(',', '.');
    return n(a) === n(b);
  }

  // ---------------------------------------------------------------------------
  // Planung
  // ---------------------------------------------------------------------------
  function planen(arbeitsmappe, kontext) {
    return berechne({ arbeitsmappe, kontext }, {});
  }

  function entscheiden(plan, antworten) {
    const neu = { ...plan.antworten };
    const a = antworten || {};
    if ('blatt' in a && a.blatt !== neu.blatt) {
      for (const k of Object.keys(neu)) delete neu[k];
    }
    if ('spalte' in a && a.spalte !== neu.spalte) {
      for (const k of Object.keys(neu)) if (k.startsWith('konflikt:') || k === 'alleKonflikte') delete neu[k];
    }
    Object.assign(neu, a);
    return berechne(plan._eingabe, neu);
  }

  function berechne(eingabe, antworten) {
    const { arbeitsmappe, kontext } = eingabe;
    const k = kontext || {};
    const gemerkt = k.gemerkt || {};
    const fach = fachAusAngabe(k.fach) || fachAusKursname(k.kursName);
    const kuerzel = k.lehrerKuerzel || '';
    const kursKlasse = klasseAusText(k.kursName);

    const blaetter = (arbeitsmappe.blaetter || []).map(analysiereBlatt);
    const blattInfos = blaetter.map(b => {
      const spalten = rangiereSpalten(b, fach, kuerzel, gemerkt.spalte);
      const top = spalten[0];
      const blattKlasse = b.klasse || klasseAusText(b.name);
      return {
        name: b.name,
        klassePasst: !!(kursKlasse && blattKlasse && blattKlasse === kursKlasse),
        kinderAnzahl: b.kinder.length,
        waehlbar: b.kinder.length > 0,
        fachTreffer: !!(top && top.score >= 30),
        besterScore: top ? top.score : 0,
        klasse: b.klasse,
        schuljahr: b.schuljahr,
        halbjahr: b.halbjahr
      };
    });

    let blattVorschlag = null;
    const waehlbar = blattInfos.filter(i => i.waehlbar);
    if (gemerkt.blatt && waehlbar.some(i => i.name === gemerkt.blatt)) blattVorschlag = gemerkt.blatt;
    else if (waehlbar.length) {
      blattVorschlag = [...waehlbar].sort((a, b) => (b.klassePasst - a.klassePasst) || b.besterScore - a.besterScore || b.kinderAnzahl - a.kinderAnzahl)[0].name;
    }
    const mehrereBlaetter = blaetter.length > 1;
    const gewaehltesBlattName = antworten.blatt != null ? antworten.blatt : (mehrereBlaetter ? null : blattVorschlag);
    const aktivesBlattName = gewaehltesBlattName || blattVorschlag;

    const plan = {
      _eingabe: eingabe,
      antworten,
      fach,
      blaetter: blattInfos,
      blattVorschlag,
      blatt: gewaehltesBlattName,
      spalten: [],
      spaltenVorschlag: null,
      spalte: null,
      zuordnungen: [],
      schreibungen: [],
      rueckfragen: [],
      hinweise: [],
      neueAliase: [],
      ausfuehren: [],
      zusammenfassung: null,
      gemerkt: null,
      fertig: false,
      fehler: null
    };

    if (mehrereBlaetter) {
      plan.rueckfragen.push({ id: 'blatt', typ: 'blatt', optionen: blattInfos, vorschlag: blattVorschlag, antwort: antworten.blatt != null ? antworten.blatt : null });
    }
    const blatt = blaetter.find(b => b.name === aktivesBlattName);
    if (!blatt || !blatt.kinder.length) {
      plan.fehler = 'Keine Namensliste gefunden. Die Liste braucht eine Kopfzeile mit „Name“ und „Vorname“.';
      return plan;
    }

    // Spalten
    plan.spalten = rangiereSpalten(blatt, fach, kuerzel, gemerkt.spalte);
    const top = plan.spalten[0];
    plan.spaltenVorschlag = top && top.score >= 30 ? top.spalte : null;
    const spalteGewaehlt = antworten.spalte != null && plan.spalten.some(s => s.spalte === antworten.spalte);
    plan.spalte = spalteGewaehlt ? antworten.spalte : null;
    plan.rueckfragen.push({ id: 'spalte', typ: 'spalte', optionen: plan.spalten, vorschlag: plan.spaltenVorschlag, antwort: plan.spalte });

    // Hinweise zum Blatt
    if (kursKlasse && blatt.klasse && kursKlasse !== blatt.klasse) {
      plan.hinweise.push({ typ: 'klasse', text: `Laut Kopf gehört die Liste zur Klasse ${blatt.klasse}, der Kurs „${k.kursName}“ zu ${kursKlasse}. Ist das die richtige Datei?` });
    }
    if (blatt.schuljahr || blatt.halbjahr) {
      plan.hinweise.push({ typ: 'info', text: `Liste: ${blatt.schuljahr ? 'Schuljahr ' + blatt.schuljahr : ''}${blatt.schuljahr && blatt.halbjahr ? ', ' : ''}${blatt.halbjahr ? blatt.halbjahr + '. Halbjahr' : ''}` });
    }

    // Namensabgleich
    const schueler = k.schueler || [];
    const automatisch = ordneZu(schueler, blatt.kinder);
    const belegt = new Set();
    const zuordnung = new Map();
    // 1. Exakte und bestätigte Zuordnungen
    for (const s of schueler) {
      const a = automatisch.get(s.id);
      const manuell = antworten['kind:' + s.id];
      if (typeof manuell === 'number') continue;
      if (a && (a.sicherheit === 'exakt' || antworten['name:' + s.id] === true)) {
        zuordnung.set(s.id, { ...a, sicherheit: a.sicherheit === 'exakt' ? 'exakt' : 'bestätigt' });
        belegt.add(a.zeile);
      }
    }
    // 2. Manuelle Zuordnungen
    for (const s of schueler) {
      const manuell = antworten['kind:' + s.id];
      if (typeof manuell === 'number' && !belegt.has(manuell)) {
        const kind = blatt.kinder.find(x => x.zeile === manuell);
        if (kind) {
          zuordnung.set(s.id, { zeile: manuell, kind, sicherheit: 'manuell', grund: '' });
          belegt.add(manuell);
        }
      }
    }
    // 3. Offene Vorschläge
    for (const s of schueler) {
      if (zuordnung.has(s.id)) continue;
      const a = automatisch.get(s.id);
      if (a && antworten['name:' + s.id] !== false && !belegt.has(a.zeile) && antworten['kind:' + s.id] === undefined) {
        zuordnung.set(s.id, { ...a, sicherheit: 'ähnlich' });
        belegt.add(a.zeile);
      }
    }

    const hatWert = s => s.wert !== null && s.wert !== undefined && String(s.wert).trim() !== '' && !s.wertHinweis;
    const freieZeilen = () => blatt.kinder.filter(x => !belegt.has(x.zeile));

    for (const s of schueler) {
      const z = zuordnung.get(s.id) || null;
      plan.zuordnungen.push({
        schuelerId: s.id,
        vorname: s.vorname,
        nachname: s.nachname,
        zeile: z ? z.zeile : null,
        listenName: z ? { nachname: z.kind.nachname, vorname: z.kind.vorname } : null,
        sicherheit: z ? z.sicherheit : (antworten['kind:' + s.id] === 'ueberspringen' ? 'übersprungen' : 'keine'),
        grund: z ? z.grund : ''
      });
      if (!hatWert(s)) continue;
      if (z && z.sicherheit === 'ähnlich') {
        plan.rueckfragen.push({
          id: 'name:' + s.id, typ: 'name', schuelerId: s.id,
          schueler: { vorname: s.vorname, nachname: s.nachname },
          liste: { vorname: z.kind.vorname, nachname: z.kind.nachname, adresse: adresse(z.zeile, blatt.hauptBlock.kopf.nameSpalte) },
          grund: z.grund, antwort: antworten['name:' + s.id] !== undefined ? antworten['name:' + s.id] : null
        });
      } else if (!z) {
        const antwort = antworten['kind:' + s.id];
        plan.rueckfragen.push({
          id: 'kind:' + s.id, typ: 'kind', schuelerId: s.id,
          schueler: { vorname: s.vorname, nachname: s.nachname },
          optionen: freieZeilen().map(x => ({ zeile: x.zeile, nachname: x.nachname, vorname: x.vorname })),
          antwort: antwort === 'ueberspringen' ? 'ueberspringen' : null
        });
      }
    }

    // Bestätigte Abweichungen merken
    for (const s of schueler) {
      const z = zuordnung.get(s.id);
      if (!z || !(z.sicherheit === 'bestätigt' || z.sicherheit === 'manuell')) continue;
      if (namenGleich(s.nachname, z.kind.nachname) && namenGleich(s.vorname, z.kind.vorname)) continue;
      plan.neueAliase.push({ schuelerId: s.id, alias: aliasSchluessel(z.kind.nachname, z.kind.vorname) });
    }

    // Kinder der Liste, die im Kurs fehlen
    const fehlendImKurs = blatt.kinder.filter(x => !belegt.has(x.zeile)).map(x => ({ zeile: x.zeile, nachname: x.nachname, vorname: x.vorname }));

    // Zellschreibungen (erst nach bestätigter Spalte)
    const zusammenfassung = {
      zuSchreiben: 0, gleich: 0, behalten: 0, formel: 0,
      ohneNote: schueler.filter(s => !hatWert(s) && !s.wertHinweis).map(s => ({ schuelerId: s.id, vorname: s.vorname, nachname: s.nachname })),
      keinNotenwert: schueler.filter(s => s.wertHinweis).map(s => ({ schuelerId: s.id, vorname: s.vorname, nachname: s.nachname, wert: s.wert })),
      uebersprungen: schueler.filter(s => hatWert(s) && antworten['kind:' + s.id] === 'ueberspringen').map(s => ({ schuelerId: s.id, vorname: s.vorname, nachname: s.nachname })),
      fehlendImKurs
    };

    if (plan.spalte !== null) {
      const sp = plan.spalten.find(x => x.spalte === plan.spalte);
      const kopfNorm = nurBuchstaben(sp.kopf);
      blatt.bloecke.forEach((b, i) => {
        if (b === blatt.hauptBlock || !b.kinder.length) return;
        const kopfHier = text((blatt.zellen[b.kopf.zeile] || [])[plan.spalte]);
        if (nurBuchstaben(kopfHier) !== kopfNorm) {
          plan.hinweise.push({ typ: 'seite', text: `Auf Seite ${i + 1} der Liste steht über Spalte ${sp.buchstabe} „${kopfHier || 'nichts'}“ statt „${sp.kopf}“. Diese Kinder werden nicht befüllt.` });
        } else if (b.kuerzelZeile !== null && blatt.hauptBlock.kuerzelZeile !== null) {
          const kzHier = text((blatt.zellen[b.kuerzelZeile] || [])[plan.spalte]);
          if (nurBuchstaben(kzHier) !== nurBuchstaben(sp.kuerzel)) {
            plan.hinweise.push({ typ: 'seite', text: `Auf Seite ${i + 1} steht über Spalte ${sp.buchstabe} das Kürzel „${kzHier}“ statt „${sp.kuerzel}“. Bitte prüfen.` });
          }
        }
      });
      const gesperrteBloecke = new Set(blatt.bloecke.map((b, i) => (b !== blatt.hauptBlock && nurBuchstaben(text((blatt.zellen[b.kopf.zeile] || [])[plan.spalte])) !== kopfNorm) ? i : -1));

      for (const s of schueler) {
        const z = zuordnung.get(s.id);
        if (!z || !hatWert(s) || z.sicherheit === 'ähnlich') continue;
        if (gesperrteBloecke.has(z.kind.block)) continue;
        const zelle = (blatt.zellen[z.zeile] || [])[plan.spalte];
        const alt = zellWert(zelle);
        const neu = zielWert(s.wert);
        const adr = adresse(z.zeile, plan.spalte);
        let art;
        if (istFormel(zelle)) art = 'formel';
        else if (text(zelle) === '') art = 'leer';
        else if (wertGleich(alt, neu)) art = 'gleich';
        else art = 'konflikt';
        const schreibung = { schuelerId: s.id, vorname: s.vorname, nachname: s.nachname, adresse: adr, alt: alt === undefined ? null : alt, neu, art, entscheidung: null };
        if (art === 'konflikt') {
          const e = antworten['konflikt:' + s.id] || antworten.alleKonflikte || null;
          schreibung.entscheidung = e;
          if (!antworten.alleKonflikte) {
            plan.rueckfragen.push({ id: 'konflikt:' + s.id, typ: 'konflikt', schuelerId: s.id, schueler: { vorname: s.vorname, nachname: s.nachname }, adresse: adr, alt, neu, antwort: antworten['konflikt:' + s.id] || null });
          }
        }
        plan.schreibungen.push(schreibung);
      }
      for (const w of plan.schreibungen) {
        if (w.art === 'leer' || (w.art === 'konflikt' && w.entscheidung === 'ueberschreiben')) zusammenfassung.zuSchreiben++;
        else if (w.art === 'gleich') zusammenfassung.gleich++;
        else if (w.art === 'konflikt' && w.entscheidung === 'behalten') zusammenfassung.behalten++;
        else if (w.art === 'formel') zusammenfassung.formel++;
      }
      if (zusammenfassung.formel) plan.hinweise.push({ typ: 'formel', text: `${zusammenfassung.formel} Zelle(n) enthalten eine Formel und werden nicht überschrieben.` });
      plan.gemerkt = { blatt: blatt.name, spalte: spaltenIdentitaet(sp) };
    }
    plan.zusammenfassung = zusammenfassung;

    plan.fertig = plan.spalte !== null && plan.rueckfragen.every(r => r.antwort !== null && r.antwort !== undefined);
    plan.ausfuehren = plan.fertig
      ? plan.schreibungen.filter(w => w.art === 'leer' || (w.art === 'konflikt' && w.entscheidung === 'ueberschreiben')).map(w => ({ adresse: w.adresse, wert: w.neu }))
      : [];
    return plan;
  }

  // ---------------------------------------------------------------------------
  // XML: Worksheet patchen
  // ---------------------------------------------------------------------------
  function xmlEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function attr(tag, name) {
    const m = new RegExp('\\s' + name + '="([^"]*)"').exec(tag);
    return m ? m[1] : null;
  }
  function zellXml(ref, stil, wert) {
    const s = stil !== null && stil !== undefined ? ` s="${stil}"` : '';
    if (typeof wert === 'number' && isFinite(wert)) return `<c r="${ref}"${s}><v>${wert}</v></c>`;
    const t = String(wert);
    const space = /^\s|\s$/.test(t) ? ' xml:space="preserve"' : '';
    return `<c r="${ref}"${s} t="inlineStr"><is><t${space}>${xmlEsc(t)}</t></is></c>`;
  }
  function spaltenStil(xml, spalte) {
    const re = /<col\b[^>]*?\/>/g;
    let m;
    while ((m = re.exec(xml))) {
      const min = Number(attr(m[0], 'min'));
      const max = Number(attr(m[0], 'max'));
      if (spalte + 1 >= min && spalte + 1 <= max) return attr(m[0], 'style');
    }
    return null;
  }
  function setzeZelle(xml, ref, wert) {
    const { zeile, spalte } = parseAdresse(ref);
    const r = zeile + 1;
    const rowRe = new RegExp(`<row\\b[^>]*?\\sr="${r}"[^>]*?(?:/>|>[\\s\\S]*?</row>)`);
    const m = rowRe.exec(xml);
    if (!m) {
      const neueZeile = `<row r="${r}">${zellXml(ref, spaltenStil(xml, spalte), wert)}</row>`;
      if (/<sheetData\s*\/>/.test(xml)) return xml.replace(/<sheetData\s*\/>/, `<sheetData>${neueZeile}</sheetData>`);
      const zeilenRe = /<row\b[^>]*?\sr="(\d+)"/g;
      let z;
      while ((z = zeilenRe.exec(xml))) {
        if (Number(z[1]) > r) return xml.slice(0, z.index) + neueZeile + xml.slice(z.index);
      }
      return xml.replace('</sheetData>', neueZeile + '</sheetData>');
    }
    const zeilenXml = m[0];
    const offen = /^<row\b[^>]*?(\/?)>/.exec(zeilenXml);
    let tag = offen[0];
    let inhalt;
    if (offen[1] === '/') {
      tag = tag.replace(/\s*\/>$/, '>');
      inhalt = '';
    } else {
      inhalt = zeilenXml.slice(tag.length, zeilenXml.length - '</row>'.length);
    }
    const zellRe = new RegExp(`<c\\b[^>]*?\\sr="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`);
    const cm = zellRe.exec(inhalt);
    if (cm) {
      const ctag = /^<c\b[^>]*?\/?>/.exec(cm[0])[0];
      inhalt = inhalt.slice(0, cm.index) + zellXml(ref, attr(ctag, 's'), wert) + inhalt.slice(cm.index + cm[0].length);
    } else {
      const stil = attr(tag, 'customFormat') === '1' ? attr(tag, 's') : spaltenStil(xml, spalte);
      const neu = zellXml(ref, stil, wert);
      const alleRe = /<c\b[^>]*?\sr="([A-Z]+)\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g;
      let c;
      let eingefuegt = false;
      while ((c = alleRe.exec(inhalt))) {
        if (spaltenIndex(c[1]) > spalte) {
          inhalt = inhalt.slice(0, c.index) + neu + inhalt.slice(c.index);
          eingefuegt = true;
          break;
        }
      }
      if (!eingefuegt) inhalt += neu;
    }
    return xml.slice(0, m.index) + tag + inhalt + '</row>' + xml.slice(m.index + m[0].length);
  }
  function patcheBlattXml(blattXml, schreibungen) {
    let xml = blattXml;
    for (const s of schreibungen || []) xml = setzeZelle(xml, s.adresse, s.wert);
    return xml;
  }

  function xmlUnesc(s) {
    return String(s).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  function blattPfade(workbookXml, relsXml) {
    const rels = {};
    const relRe = /<Relationship\b[^>]*?\/?>/g;
    let m;
    while ((m = relRe.exec(relsXml))) rels[attr(m[0], 'Id')] = attr(m[0], 'Target');
    const pfade = {};
    const sheetRe = /<sheet\b[^>]*?\/?>/g;
    while ((m = sheetRe.exec(workbookXml))) {
      const name = xmlUnesc(attr(m[0], 'name'));
      const rid = attr(m[0], 'r:id');
      let ziel = rels[rid];
      if (!ziel) continue;
      ziel = ziel.startsWith('/') ? ziel.slice(1) : 'xl/' + ziel.replace(/^\.\//, '');
      pfade[name] = ziel;
    }
    return pfade;
  }
  function setzeNeuberechnung(workbookXml) {
    const calc = /<calcPr\b[^>]*?\/>/.exec(workbookXml);
    if (calc) {
      let tag = calc[0];
      tag = /\sfullCalcOnLoad="[^"]*"/.test(tag) ? tag.replace(/\sfullCalcOnLoad="[^"]*"/, ' fullCalcOnLoad="1"') : tag.replace(/\s*\/>$/, ' fullCalcOnLoad="1"/>');
      return workbookXml.slice(0, calc.index) + tag + workbookXml.slice(calc.index + calc[0].length);
    }
    for (const anker of ['</definedNames>', '</externalReferences>', '</sheets>']) {
      const i = workbookXml.indexOf(anker);
      if (i >= 0) return workbookXml.slice(0, i + anker.length) + '<calcPr fullCalcOnLoad="1"/>' + workbookXml.slice(i + anker.length);
    }
    return workbookXml;
  }

  return {
    planen,
    entscheiden,
    patcheBlattXml,
    blattPfade,
    setzeNeuberechnung,
    fachAusKursname,
    aliasSchluessel,
    _intern: { namenGleich, fachAusKopf, adresse, parseAdresse }
  };
});
