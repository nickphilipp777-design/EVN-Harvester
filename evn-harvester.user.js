// ==UserScript==
// @name         evn_harvester.user.js
// @version      2.7
// @description  Dynamische TZ-Erkennung (nur reine Nummer) & EVN-Harvester für bahn.expert
// @author       clicktricks
// @match        https://bahn.expert/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const btn = document.createElement('button');
    btn.id = 'evn-scan-btn';
    btn.innerHTML = "<span style='font-size:22px;'>🔍</span><br>SCAN";
    btn.style = `position:fixed;top:15px;right:75px;z-index:99999;width:55px;height:55px;
                 border:3px solid #3d2273;border-radius:10px;font-weight:bold;color:white;
                 cursor:pointer;box-shadow:0 8px 30px rgba(0,0,0,0.8);display:flex;
                 flex-direction:column;justify-content:center;align-items:center;
                 text-align:center;background:#1976d2;font-family:sans-serif;font-size:15px;`;
    document.body.appendChild(btn);

    btn.onclick = async () => {
        let stationName = document.title.split('|')[0].split('–')[0].trim();

        let containers = Array.from(document.querySelectorAll('div.css-eiq1za'));
        if (containers.length === 0) {
            containers = Array.from(document.querySelectorAll('a[href*="/details/"]'))
                .map(el => el.closest('div.css-eiq1za, div[class*="MuiPaper"]') || el.parentElement)
                .filter((el, index, self) => el && self.indexOf(el) === index);
        }

        if (containers.length === 0) return alert("Keine Abfahrten gefunden!");

        btn.disabled = true;

        const overlay = document.createElement('div');
        overlay.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.95); z-index: 99998;
            display: flex; flex-direction: column; justify-content: flex-start;
            padding-top: 32px; align-items: center;
            color: #a5b7c9; font-family: sans-serif; font-size: 24px;
            pointer-events: none;
        `;
        overlay.innerHTML = "Scan läuft ⟶";
        document.body.appendChild(overlay);

        let reportData = [];
        const startTime = new Date();

        for (let i = 0; i < containers.length; i++) {
            const container = containers[i];
            btn.innerHTML = `⏳<br>${i+1}/${containers.length}`;

            try {
                // Zeit
                let time = "--:--";
                const timeSpans = container.querySelectorAll('.css-1u8qly9');
                timeSpans.forEach(span => {
                    const match = span.innerText.match(/(\d{2}):(\d{2})/);
                    if (match) time = match[0];
                });

                // Detail-Link & Linie
                const detailAnchor = container.querySelector('a[href*="/details/"]');
                let lineName = detailAnchor?.innerText?.trim() || "–";
                let detailHref = detailAnchor?.href || "";

                // Zugnummer
                const nrSpan = container.querySelector('.css-1kw7u7o, .MuiBox-root');
                let trainNr = nrSpan?.innerText?.trim() || lineName;

                // Ziel
                let destination = "Ziel unbekannt";
                const destElement = container.querySelector('.css-b2nyxf');
                if (destElement) {
                    destination = destElement.innerText.trim();
                }

                // Aufklappen
                container.scrollIntoView({ block: "center" });
                container.click();
                await new Promise(r => setTimeout(r, 1200));

                // EVNs sammeln (z. B. 5812 075, 2412 875 ...)
                let evns = [];
                const evnSpans = container.querySelectorAll('.css-760knn span, [class*="waggon"] span');
                evnSpans.forEach(el => {
                    const text = el.innerText.trim();
                    if (/^\d{4}\s\d{3}$/.test(text) || /\d{4}\s\d{3}/.test(text)) {
                        evns.push(text);
                    }
                });
                evns = [...new Set(evns)];

                // Gleis
                let track = "";
                const trackElement = Array.from(container.querySelectorAll('.css-1u8qly9'))
                    .find(el => /^\d+[a-z]?$/i.test(el.innerText.trim()));
                if (trackElement) track = trackElement.innerText.trim();

                // Triebzugnummer (TZ) – filtert Präfixe raus und speichert nur die reinen Ziffern
                let tz = "";
                const tzSpans = container.querySelectorAll('.css-1916ph3 span');
                tzSpans.forEach(span => {
                    const text = span.innerText.trim();
                    const match = text.match(/^(?:ICE|TZ|Tz)?\s?(\d{3,4})$/i);
                    if (match) {
                        tz = match[1];
                    }
                });

                reportData.push({
                    time,
                    line: lineName,
                    nr: trainNr,
                    link: detailHref,
                    dest: destination,
                    evns,
                    track,
                    tz
                });

                container.click();
                await new Promise(r => setTimeout(r, 150));

            } catch (e) {
                console.error("Fehler bei Container", i, e);
            }
        }

        if (overlay) overlay.remove();

        btn.disabled = false;
        btn.style.background = "#1976d2";
        btn.innerHTML = "<span style='font-size:25px;'>🔍</span><br>SCAN";

        const popup = document.createElement('div');
        popup.innerHTML = "<b>SCAN FERTIG ✔</b><br><span style='font-size:12px;'>Report wurde erstellt</span>";
        popup.style = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background:#0b3b20; color: white; padding: 12px 25px;
            border-radius: 4px; font-family: sans-serif; font-size: 16px;
            z-index: 100000; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            text-align: center; border: 1px solid white;
        `;
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.style.opacity = "0";
            popup.style.transition = "opacity 0.5s ease";
            setTimeout(() => popup.remove(), 500);
        }, 4000);

        exportHTML(stationName, startTime, reportData);
    };

    function exportHTML(station, dateObj, data) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const mins = String(dateObj.getMinutes()).padStart(2, '0');
        const timeStamp = `${day}-${month}-${year}_${hours}-${mins}`;

        let html = `<html><head><meta charset="UTF-8"><style>
            body { font-family: sans-serif; padding: 20px; background-color: #f5f7fa; }
            .header { background: #2b70b5; color: white; padding: 15px 20px; border-radius: 4px; margin-bottom: 20px; font-weight: bold; display: flex; align-items: center; gap: 20px; }
            .header h1 { font-size: 1.8rem; margin: 0; }
            .header p  { font-size: 1.3rem; margin: 0; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th, td { border: 1px solid #dcdcdc; padding: 8px 12px; vertical-align: middle; }
            th { background: #ebf1f5; color: #003366; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; }
            .evn { background: #eeeeee; padding: 3px 6px; border-radius: 3px; font-family: monospace; font-weight: bold; border: 1px solid #ccc; margin: 2px; display: inline-block; font-size: 0.9rem; }
            .clip-box { background: #624887; color: white; border-radius: 6px; padding: 4px 8px; text-decoration: none; font-size: 1.2rem; display: inline-block; }
            .track-box { background:#006666; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; display: inline-block; }
            .tz-box { background:#9eb5af; color: #010a1c; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; font-size: 0.95rem; letter-spacing: 0.5px; display: inline-block; }
            #filterbar { position: sticky; top: 0; z-index: 999; background: #0d2d4d; padding: 10px 16px;
                display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4); margin-bottom: 16px; }
            #filterbar input { padding: 7px 12px; border-radius: 6px; border: none;
                font-size: 14px; width: 240px; background: #2e3f52; color: white; outline: none; }
            #filterbar button { padding: 7px 14px; border-radius: 6px; border: none;
                color: white; font-size: 13px; cursor: pointer; font-weight: bold; white-space: nowrap; }
            #chipArea { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; flex: 1; }
            .chip { background: #2b70b5; color: white; padding: 4px 10px; border-radius: 20px;
                font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
            #counter { font-size: 13px; color: #9eb5af; background: #111;
                padding: 4px 10px; border-radius: 4px; white-space: nowrap; }
        </style></head><body>

        <div id="filterbar">
            <div id="chipArea"><span style="color:#7a8fa0;font-size:13px;">Keine aktiven Filter</span></div>
            <input id="searchInput" placeholder="EVN, TZ, Zugnr, Ziel … dann Enter" />
            <button onclick="addSearch()" style="background:#1976d2;">+ Suche</button>
            <button id="btnToggle" onclick="toggleHide()" style="background:#555;">&#x1F453; Nur Treffer anzeigen</button>
            <button onclick="resetAll()" style="background:#7b2020;">&#x2715; Zur&uuml;cksetzen</button>
            <span id="counter"></span>
        </div>

        <div class="header"><h1>&#x1F689; REPORT: ${station}</h1><p>${dateObj.toLocaleString('de-DE')}</p></div>
        <table><thead><tr>
            <th style="width:70px;">Zeit</th>
            <th style="width:110px;">Zug / Nr</th>
            <th>Ziel</th>
            <th>Waggons / EVNs</th>
            <th style="width:50px; text-align:center;">Links</th>
            <th style="width:50px; text-align:center;">Gl.</th>
            <th style="width:80px; text-align:center;">TZ</th>
        </tr></thead><tbody>`;

        data.forEach(item => {
            const evnsHtml = item.evns.map(e => `<span class="evn">${e}</span>`).join(" ");
            const trackHtml = item.track ? `<span class="track-box">${item.track}</span>` : `<span style="color:#aaa;">–</span>`;
            const clipHtml = item.link
                ? `<a href="${item.link}" target="_blank" class="clip-box">&#x1F517;</a>`
                : `<span style="color:#aaa;">–</span>`;
            const tzHtml = item.tz ? `<span class="tz-box">${item.tz}</span>` : `<span style="color:#aaa;">–</span>`;

            html += `<tr>
                <td><b>${item.time}</b></td>
                <td><b>${item.line}</b><br><small style="color:#444;">${item.nr}</small></td>
                <td><b>${item.dest}</b></td>
                <td>${evnsHtml}</td>
                <td style="text-align:center;">${clipHtml}</td>
                <td style="text-align:center;">${trackHtml}</td>
                <td style="text-align:center;">${tzHtml}</td>
            </tr>`;
        });

        html += `</tbody></table>
        <script>
            var searches = [];
            var hideNoMatch = false;

            document.getElementById('searchInput').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') addSearch();
            });

            function addSearch() {
                var val = document.getElementById('searchInput').value.trim().toLowerCase();
                if (!val || searches.includes(val)) { document.getElementById('searchInput').value = ''; return; }
                searches.push(val);
                document.getElementById('searchInput').value = '';
                renderChips();
                applyFilter();
            }

            function removeSearch(val) {
                searches = searches.filter(function(s) { return s !== val; });
                renderChips();
                applyFilter();
            }

            function resetAll() {
                searches = [];
                hideNoMatch = false;
                var btn = document.getElementById('btnToggle');
                btn.innerHTML = '&#x1F453; Nur Treffer anzeigen';
                btn.style.background = '#555';
                renderChips();
                applyFilter();
            }

            function toggleHide() {
                hideNoMatch = !hideNoMatch;
                var btn = document.getElementById('btnToggle');
                btn.innerHTML = hideNoMatch ? '&#x1F441; Alle anzeigen' : '&#x1F453; Nur Treffer anzeigen';
                btn.style.background = hideNoMatch ? '#1976d2' : '#555';
                applyFilter();
            }

            function renderChips() {
                var area = document.getElementById('chipArea');
                area.innerHTML = '';
                if (searches.length === 0) {
                    area.innerHTML = '<span style="color:#7a8fa0;font-size:13px;">Keine aktiven Filter</span>';
                    return;
                }
                searches.forEach(function(s) {
                    var chip = document.createElement('span');
                    chip.className = 'chip';
                    chip.innerHTML = s + ' <b style="font-size:16px;line-height:1;">&#x00D7;</b>';
                    chip.title = 'Klicken zum Entfernen';
                    chip.onclick = function() { removeSearch(s); };
                    area.appendChild(chip);
                });
            }

            function applyFilter() {
                var rows = document.querySelectorAll('table tbody tr');
                var total = rows.length;
                var visible = 0;
                rows.forEach(function(row) {
                    if (searches.length === 0) {
                        row.style.display = hideNoMatch ? 'none' : '';
                        row.style.background = '';
                        if (!hideNoMatch) visible++;
                    } else {
                        var text = row.innerText.toLowerCase();
                        var matched = searches.filter(function(s) { return text.includes(s); });
                        if (matched.length > 0) {
                            row.style.display = '';
                            row.style.background = '#b6dbbc';
                            visible++;
                        } else {
                            row.style.display = hideNoMatch ? 'none' : '';
                            row.style.background = '';
                        }
                    }
                });
                document.getElementById('counter').textContent = visible + ' / ' + total + ' Z\u00FCge';
            }

            applyFilter();
        <\/script>
        </body></html>`;

        const blob = new Blob(['\uFEFF' + html], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `EVN_Report_${station.replace(/[^a-z0-9]/gi, '_')}_${timeStamp}.html`;
        a.click();
    }
})();
