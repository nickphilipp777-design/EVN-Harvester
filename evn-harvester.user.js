eet our new Armbian Imager 2.0 https://tinyurl.com/a7b2b4su

 Commands:

 Configuration: armbian-config
 Upgrade      : armbian-upgrade
 Monitoring   : htop

nick@inovato-quadra:~$ temp 2
nick@inovato-quadra:~$ ls
bahn.log            duckdns              extract_abfahrt.js  nohup.out          proxy
debug.log           duckdns.sh           for_armbian         package.json       start_bahn_web.sh
docker-compose.yml  extract_abfahrt1.js  node_modules        package-lock.json
nick@inovato-quadra:~$ cat extract_abfahrt.js
#!/usr/bin/env node
/**
 * extract_abfahrt.js
 *
 * Puppeteer-Umsetzung des evn_harvester.user.js
 * Öffnet eine bahn.expert Abfahrtstafel, klappt jeden Zug auf,
 * liest EVNs + TZ + Gleis und exportiert einen HTML-Report.
 *
 * Usage:
 *   node extract_abfahrt.js --url="https://bahn.expert/Freiburg(Breisgau)%20Hbf" --out=report.html
 *
 * Dependencies:
 *   npm install puppeteer minimist
 */
process.env.TZ = 'Europe/Berlin';

const fs       = require('fs');
const path     = require('path');
const puppeteer = require('puppeteer');
const DEFAULT_OUT = '/var/www/bahn/index.html';
const argv     = require('minimist')(process.argv.slice(2), {
  string:  ['url', 'out'],
  boolean: ['debug'],
  default: { out: DEFAULT_OUT, debug: false }
});

const PAGE_URL = argv.url || 'https://bahn.expert/Freiburg(Breisgau)%20Hbf';
const OUT_FILE = DEFAULT_OUT;
const DEBUG    = !!argv.debug;

if (!PAGE_URL) {
  console.error('Usage: node extract_abfahrt.js --url="https://bahn.expert/..." [--out=report.html]');
  process.exit(1);
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}
function log(...a) { if (DEBUG) console.log(...a); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── HTML Export (identisch mit Userscript-Stil) ──────────────────────────────

function exportHTML(station, dateObj, data) {
  const pad = n => String(n).padStart(2, '0');
  const ts  = `${pad(dateObj.getDate())}-${pad(dateObj.getMonth()+1)}-${dateObj.getFullYear()}_${pad(dateObj.getHours())}-${pad(dateObj.getMinutes())}`;

  let tableRows = '';
  data.forEach(item => {
    const evnsHtml  = item.evns.length
      ? item.evns.map(e => `<span class="evn">${esc(e)}</span>`).join(' ')
      : `<span style="color:#aaa;">–</span>`;
    const trackHtml = item.track
      ? `<span class="track-box">${esc(item.track)}</span>`
      : `<span style="color:#aaa;">–</span>`;
    const clipHtml  = item.link
      ? `<a href="${esc(item.link)}" target="_blank" class="clip-box">&#x1F517;</a>`
      : `<span style="color:#aaa;">–</span>`;
    const tzHtml    = item.tz
      ? `<span class="tz-box">${esc(item.tz)}</span>`
      : `<span style="color:#aaa;">–</span>`;

    tableRows += `<tr>
      <td><b>${esc(item.time)}</b></td>
      <td><b>${esc(item.train)}</b><br><small>${esc(item.nr)}</small></td>
      <td><b>${esc(item.dest)}</b></td>
      <td>${evnsHtml}</td>
      <td style="text-align:center;">${clipHtml}</td>
      <td style="text-align:center;">${trackHtml}</td>
      <td style="text-align:center;">${tzHtml}</td>
    </tr>\n`;
  });

  // Zeitzone für alle Datumsausgaben
  const TZ = 'Europe/Berlin';

  const html = `<!doctype html>
<html lang="de"><head><meta charset="UTF-8">
<title>EVN Overview – ${esc(station)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: sans-serif; padding: 0; margin: 0; background: #f4f6f8; }
  .header { background: #1d3857; color: white; padding: 13px 28px; font-weight: bold;
    display: flex; align-items: center; gap: 20px;}
  .header h1 { font-size: 1.7rem; margin: 0; }
  .header p  { font-size: 1.5rem; margin: 0; font-weight: normal; }
  #filterbar { position: sticky; top: 0; z-index: 999; background: #18191F;
    padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
  #filterbar input { padding: 7px 12px; border-radius: 6px; border: none;
    font-size: 14px; width: 220px; background: #2e3f52; color: white; outline: none; }
  #filterbar input::placeholder { color: #7a8fa0; }
  #filterbar button { padding: 7px 14px; border-radius: 6px; border: none;
    color: white; font-size: 15px; cursor: pointer; font-weight: bold; white-space: nowrap; }
  #chipArea { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 1; }
  .chip { background: #1976d2; color: white; padding: 4px 10px; border-radius: 20px;
    font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  #counter { font-size: 13px; color: #9eb5af; background: #111;
    padding: 4px 10px; border-radius: 4px; white-space: nowrap; }
  .table-wrap { padding: 20px; }
  table { width: 100%; border-collapse: collapse; background: white;
    border-radius: 6px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.1); }
  th, td { border: 1px solid #dde3ea; padding: 10px 12px; vertical-align: middle; }
  th { background: #f2f2f2; color: #003366; text-transform: uppercase; font-size: 12px; }
  .evn { background: #eeeeee; padding: 4px 8px; border-radius: 4px; font-family: monospace;
    font-weight: bold; border: 1px solid #ccc; margin: 0 2px; display: inline-block; }
  .clip-box { background: #624887; border: 2px solid #ccc; border-radius: 6px;
    padding: 4px 8px; text-decoration: none; font-size: 1.5rem; display: inline-block; }
  .track-box { background: #006666; color: white; padding: 6px 12px;
    border-radius: 4px; font-weight: bold; display: inline-block; }
  .tz-box { background: #9eb5af; color: #010a1c; padding: 6px 12px; border-radius: 4px;
    font-family: monospace; font-weight: bold; font-size: 1.1rem;
    letter-spacing: 1px; display: inline-block; }
  .footer { text-align: center; padding: 16px; color: #999; font-size: 12px; }
</style>
</head><body>

<div id="filterbar">
  <div id="chipArea"><span style="color:#7a8fa0;font-size:13px;">Keine aktiven Filter</span></div>
  <input id="searchInput" placeholder="EVN, Zugnr, Ziel … dann Enter"
         onkeydown="if(event.key==='Enter') addSearch()" />
  <button onclick="addSearch()" style="background:#1976d2;">+ Suche</button>
  <button id="btnToggle" onclick="toggleHide()" style="background:#294f27;">&#x1F453; Nur Treffer anzeigen</button>
  <button onclick="resetAll()" style="background:#7b2020;">&#x2715; Zur&uuml;cksetzen</button>
  <span id="counter"></span>
</div>

<div class="header">
  <h1>&#x1F689; ${esc(station)}</h1>
  <p>${dateObj.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
</div>

<div class="table-wrap">
<table>
  <thead><tr>
    <th>Zeit</th><th>Zug / Nr</th><th>Ziel</th><th>Waggons</th>
    <th style="width:50px;">Links</th><th>Gl.</th><th>TZ</th>
  </tr></thead>
  <tbody>
${tableRows}
  </tbody>
</table>
</div>

<div class="footer">EVN Harvester – bahn.expert Report &nbsp;|&nbsp; ${data.length} Z&uuml;ge</div>

<script>
var searches = [], hideNoMatch = false;
function addSearch(){
  var val = document.getElementById('searchInput').value.trim().toLowerCase();
  if(!val || searches.includes(val)){ document.getElementById('searchInput').value=''; return; }
  searches.push(val); document.getElementById('searchInput').value='';
  renderChips(); applyFilter();
}
function removeSearch(val){
  searches = searches.filter(function(s){ return s!==val; });
  renderChips(); applyFilter();
}
function resetAll(){
  searches=[]; hideNoMatch=false;
  document.getElementById('btnToggle').innerHTML='&#x1F453; Nur Treffer anzeigen';
  document.getElementById('btnToggle').style.background='#555';
  renderChips(); applyFilter();
}
function toggleHide(){
  hideNoMatch=!hideNoMatch;
  var btn=document.getElementById('btnToggle');
  btn.innerHTML=hideNoMatch?'&#x1F441; Alle anzeigen':'&#x1F453; Nur Treffer anzeigen';
  btn.style.background=hideNoMatch?'#30403d':'#294f27';
  applyFilter();
}
function renderChips(){
  var area=document.getElementById('chipArea');
  area.innerHTML='';
  if(!searches.length){ area.innerHTML='<span style="color:#7a8fa0;font-size:13px;">Keine aktiven Filter</span>'; return; }
  searches.forEach(function(s){
    var c=document.createElement('span'); c.className='chip';
    c.innerHTML=s+' <b style="font-size:16px;line-height:1;">&#x00D7;</b>';
    c.onclick=function(){ removeSearch(s); }; area.appendChild(c);
  });
}
function applyFilter(){
  var rows=document.querySelectorAll('table tbody tr'), total=rows.length, visible=0;
  rows.forEach(function(row){
    if(!searches.length){
      row.style.display=hideNoMatch?'none':''; row.style.background='';
      if(!hideNoMatch) visible++;
    } else {
      var text=row.innerText.toLowerCase();
      var matched=searches.filter(function(s){ return text.includes(s); });
      if(matched.length>0){
        row.style.display=''; row.style.background='#b6dbbc'; visible++;
      } else {
        row.style.display=hideNoMatch?'none':''; row.style.background='';
        if(!hideNoMatch) visible++;
      }
    }
  });
  document.getElementById('counter').textContent=visible+' / '+total+' Z\u00FCge';
}
applyFilter();
<\/script>
</body></html>`;

  fs.writeFileSync(OUT_FILE, '\uFEFF' + html, 'utf8');
  console.log(`Report saved: ${OUT_FILE} (${data.length} Züge)`);
}

// ── Puppeteer Hauptlogik ─────────────────────────────────────────────────────

(async () => {
  console.log('Starte Browser...');

  // Sicherheits-Timeout: Das Skript MUSS nach 120 Sekunden beenden
  const forceExit = setTimeout(() => {
     console.error('FEHLER: Skript läuft zu lange, erzwinge Abbruch.');
     process.exit(1);
  }, 1100000);

  // System-Chromium bevorzugen (ARM/Raspberry Pi), sonst Puppeteer-eigenen nutzen
  const chromiumPaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);

  let executablePath = undefined;
  const fs2 = require('fs');
  for (const p of chromiumPaths) {
    if (fs2.existsSync(p)) { executablePath = p; break; }
  }
  if (executablePath) console.log(`Nutze Chromium: ${executablePath}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Domain einmal ansteuern damit Cookies gesetzt werden können
    await page.goto('https://bahn.expert', { waitUntil: 'domcontentloaded' });

    // Cookies setzen – aktiviert EVN-Anzeige, Wagenreihung und Zeitrahmen
    await page.setCookie(
      { name: 'showEVN',        value: 'true',  domain: 'bahn.expert' },
      { name: 'showFullEVN',    value: 'false', domain: 'bahn.expert' },
      { name: 'fahrzeugGruppe', value: 'true',  domain: 'bahn.expert' },
      { name: 'lineAndNumber',  value: 'true',  domain: 'bahn.expert' },
      { name: 'lookahead',      value: '480',   domain: 'bahn.expert' },
      { name: 'lookbehind',     value: '240',   domain: 'bahn.expert' }
    );

    console.log(`Lade Abfahrtstafel: ${PAGE_URL}`);
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 12000 });

    // localStorage setzen NACH dem Laden – bahn.expert nutzt localStorage fuer EVN-Einstellungen
    await page.evaluate(() => {
      localStorage.setItem('showEVN',        'true');
      localStorage.setItem('showFullEVN',    'false');
      localStorage.setItem('fahrzeugGruppe', 'true');
      localStorage.setItem('lineAndNumber',  'true');
      localStorage.setItem('lookahead',      '480');
      localStorage.setItem('lookbehind',     '240');
    });

    // Seite neu laden damit localStorage-Einstellungen aktiv werden
    console.log('Lade Seite neu mit EVN-Einstellungen...');
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep (3000); // API-Daten abwarten

    // Stationsname aus Titel
    const stationName = await page.evaluate(() => {
      return document.title.split('|')[0].split('–')[0].trim();
    });
    console.log(`Station: ${stationName}`);

    // Alle Container finden
    const containerCount = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[data-testid="detailsLink"]'));
      const containers = links.map(a => a.closest('div.css-eiq1za') || a.closest('[class]'))
        .filter((el, i, arr) => el && arr.indexOf(el) === i);
      return containers.length;
    });
    console.log(`Gefundene Container: ${containerCount}`);

    if (containerCount === 0) {
      console.error('Keine Abfahrten gefunden!');
      process.exit(1);
    }

    const startTime = new Date();
    const reportData = [];

    // ── Scan-Schleife (1:1 wie Userscript) ──────────────────────────────────
    for (let i = 0; i < containerCount; i++) {
      process.stdout.write(`\r  Scanne ${i+1}/${containerCount}...`);

      // Basis-Daten aus dem Container lesen (vor dem Klick)
      const baseData = await page.evaluate((idx) => {
        const links = Array.from(document.querySelectorAll('a[data-testid="detailsLink"]'));
        const containers = links.map(a => {
            let el = a.parentElement;
            while (el && el.tagName !== 'BODY') {
              if (el.tagName === 'DIV' && /\d{2}:\d{2}/.test(el.innerText || '')) return el;
              el = el.parentElement;
            }
            return a.parentElement;
          }).filter((el, i, arr) => el && arr.indexOf(el) === i);
        const container = containers[idx];
        if (!container) return null;

        // Zugnummer + Detaillink
        const detailAnchor = container.querySelector('a[data-testid="detailsLink"]');
        const trainFull  = detailAnchor?.innerText?.trim() || '';
        const detailLink = detailAnchor?.href || '';

        // Linie z.B. "Linie 12"
        const lineEl = container.querySelector('span.MuiBox-root');
        const displayNr = lineEl?.innerText?.trim() || '';

        // Ziel: letztes div ohne Kind-Links das Text enthält
        const destCandidates = Array.from(container.querySelectorAll('div'))
          .filter(d => !d.querySelector('a') && d.innerText?.trim().length > 2 && d.children.length === 0);
        const destination = destCandidates.length > 0
          ? destCandidates[destCandidates.length - 1].innerText.trim()
          : '';

        // Zeit: "Ab:"-Block -> erster span mit HH:MM
        let time = '--:--';
        const allDivs = Array.from(container.querySelectorAll('div'));
        const abDiv = allDivs.find(d => d.innerText?.startsWith('Ab:'));
        if (abDiv) {
          const timeSpan = abDiv.querySelector('span');
          if (timeSpan) time = timeSpan.innerText.trim();
        }
        if (time === '--:--') {
          const m = container.innerText.match(/\d{2}:\d{2}/);
          if (m) time = m[0];
        }

        // Gleis: letzter span der nur eine Zahl enthält
        const gleisSpans = Array.from(container.querySelectorAll('span'))
          .filter(s => /^\d+$/.test(s.innerText?.trim()));
        const track = gleisSpans.length > 0 ? gleisSpans[gleisSpans.length - 1].innerText.trim() : '';

        return { time, train: trainFull, nr: displayNr, link: detailLink, dest: destination, track };
      }, i);

      if (!baseData) continue;

      // Container in Sicht scrollen und anklicken
      await page.evaluate((idx) => {
        const links = Array.from(document.querySelectorAll('a[data-testid="detailsLink"]'));
        const containers = links.map(a => {
            let el = a.parentElement;
            while (el && el.tagName !== 'BODY') {
              if (el.tagName === 'DIV' && /\d{2}:\d{2}/.test(el.innerText || '')) return el;
              el = el.parentElement;
            }
            return a.parentElement;
          }).filter((el, i, arr) => el && arr.indexOf(el) === i);
        containers[idx]?.scrollIntoView({ block: 'center' });
        containers[idx]?.click();
      }, i);

      // Warten bis Wagenreihung erscheint
// Anstatt await sleep(2900);
      // Versuche, das Element zu finden, das die Wagenreihung enthält (mit Timeout)
      try {
          await page.waitForSelector('.css-760knn', { timeout: 1400 });
      } catch (e) {
           console.log("Wagenreihung für diesen Zug nicht gefunden – überspringe.");
}

      // EVNs + TZ lesen (nach dem Aufklappen)
      const evnData = await page.evaluate((idx) => {
        const links = Array.from(document.querySelectorAll('a[data-testid="detailsLink"]'));
        const containers = links.map(a => {
            let el = a.parentElement;
            while (el && el.tagName !== 'BODY') {
              if (el.tagName === 'DIV' && /\d{2}:\d{2}/.test(el.innerText || '')) return el;
              el = el.parentElement;
            }
            return a.parentElement;
          }).filter((el, i, arr) => el && arr.indexOf(el) === i);
        const container  = containers[idx];

        // EVNs document-weit suchen (Wagenreihung wird ausserhalb des Containers gerendert)
        const matches = (document.body?.innerHTML || '').match(/\d{4}\s\d{3}/g) || [];
        const evns    = [...new Set(matches)];

        // TZ: document-weit nach WRSheets-Link suchen (wird außerhalb des containers gerendert)
        let tzNr = '';
        const allPdfLinks = Array.from(document.querySelectorAll('a[href*="WRSheets"]'));
        if (allPdfLinks.length > 0) {
          const pdfLink = allPdfLinks[allPdfLinks.length - 1];
          const tzSpan  = pdfLink.parentElement?.querySelector('span');
          const tzRaw   = tzSpan?.innerText.trim() || '';
          if (/[A-Z]+[0-9]+/.test(tzRaw)) tzNr = tzRaw.replace(/[^0-9]/g, '');
        }

        return { evns, tz: tzNr };
      }, i);

      reportData.push({
        ...baseData,
        evns: evnData.evns,
        tz:   evnData.tz
      });

      // Zuklicken
      await page.evaluate((idx) => {
        const links = Array.from(document.querySelectorAll('a[data-testid="detailsLink"]'));
        const containers = links.map(a => {
            let el = a.parentElement;
            while (el && el.tagName !== 'BODY') {
              if (el.tagName === 'DIV' && /\d{2}:\d{2}/.test(el.innerText || '')) return el;
              el = el.parentElement;
            }
            return a.parentElement;
          }).filter((el, i, arr) => el && arr.indexOf(el) === i);
        containers[idx]?.click();
      }, i);

      await sleep(200);
    }

    console.log(`\nScan abgeschlossen. ${reportData.length} Züge gefunden.`);


    exportHTML(stationName, startTime, reportData);

  } catch (err) {
    console.error('FEHLER:', err);
    process.exit(1);
  } finally {
    clearTimeout(forceExit); // Den Timer stoppen, wenn alles gut lief
    await browser.close();
  }
})();
nick@inovato-quadra:~$
