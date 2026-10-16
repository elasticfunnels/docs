// Builds the HTML for an annotated image. The browser lays it out, measures it and draws the leader lines;
// shoot.cjs then screenshots the panel at 2x. Two kinds:
//   screen: a real UI capture in a dark rounded frame, outlined elements, dots, leader lines to callouts on the side
//   url:    a URL split into pastel segments, dots and leader lines down to callouts underneath
// Style reference: CLAUDE.md "Screenshots are required".

const FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, Helvetica, Arial, sans-serif`;
const MONO = `"SF Mono", ui-monospace, Menlo, Consolas, monospace`;
const PASTELS = ["#DCE8FF", "#E9E2FF", "#D6F5E3", "#FFE4D1", "#FFF1BF", "#FFDDEB", "#D7F1F7"];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:transparent;font-family:${FONT};-webkit-font-smoothing:antialiased}
  #panel{position:relative;display:inline-block;background:#F5F6FA;border-radius:28px;padding:40px}
  #panel.has-pill{padding-bottom:58px}
  .callout{position:absolute;background:#fff;border:1px solid #E3E5EE;border-radius:12px;padding:11px 15px 12px;
    box-shadow:0 1px 2px rgba(16,24,40,.05);width:var(--cw)}
  .callout b{display:block;font-size:17px;line-height:1.3;color:#0F1222;font-weight:650}
  .callout span{display:block;font-size:15px;line-height:1.4;color:#6B7080;margin-top:3px}
  .dot{position:absolute;width:9px;height:9px;border-radius:50%;background:#0F1222;transform:translate(-50%,-50%);z-index:3}
  svg.lines{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:2}
  .pill{position:absolute;right:18px;bottom:14px;background:#fff;border:1px solid #E3E5EE;border-radius:999px;
    padding:5px 12px 5px 10px;font-size:12px;color:#4A4F5E;display:flex;align-items:center;gap:6px}
`;

const PILL = `<div class="pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A4F5E" stroke-width="2.4"
  stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/></svg>Click to enlarge</div>`;

// ---------------------------------------------------------------------------------------------------------
// screen: imgDataUri + natural CSS size of the capture (w,h), annotations with boxes in capture CSS px.
function screenHtml({ img, w, h, annotations, maxWidth = 760, calloutWidth = 230, pill = true }) {
  const scale = Math.min(1, maxWidth / w);
  const W = Math.round(w * scale), H = Math.round(h * scale);
  const left = annotations.some((a) => a.side === "left");
  const right = annotations.some((a) => (a.side || "right") === "right");
  const GAP = 64; // frame edge to callout column
  const padL = left ? calloutWidth + GAP : 0, padR = right ? calloutWidth + GAP : 0;
  const data = annotations.map((a) => ({
    side: a.side || "right", title: a.title, text: a.text,
    box: a.box.map((v) => v * scale), pad: a.pad ?? 4,
  }));
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
    #stage{position:relative;width:${padL + W + padR + 4}px}
    #frame{position:relative;margin-left:${padL}px;width:${W + 4}px;border:2px solid #23263A;border-radius:14px;overflow:hidden;background:#fff}
    #frame img{display:block;width:${W}px;height:${H}px}
    .outline{position:absolute;border:2px solid #0F1222;border-radius:10px;z-index:2}
  </style></head><body style="--cw:${calloutWidth}px">
  <div id="panel" class="${pill ? "has-pill" : ""}"><div id="stage"><div id="frame"><img src="${img}"></div></div>${pill ? PILL : ""}</div>
  <script>
    const A = ${JSON.stringify(data)}, padL = ${padL}, W = ${W}, H = ${H}, CW = ${calloutWidth}, GAP = ${GAP};
    const stage = document.getElementById('stage');
    const fx = padL + 2, fy = 2; // frame content origin inside the stage (2px border)
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','lines');
    const items = A.map((a) => {
      const [x, y, w, h] = a.box, p = a.pad;
      const o = document.createElement('div'); o.className = 'outline';
      Object.assign(o.style, { left: (fx + x - p) + 'px', top: (fy + y - p) + 'px', width: (w + 2*p) + 'px', height: (h + 2*p) + 'px' });
      stage.appendChild(o);
      const tx = a.side === 'left' ? fx + x - p : fx + x + w + p, ty = fy + y + h / 2;
      const c = document.createElement('div'); c.className = 'callout';
      c.innerHTML = '<b></b>' + (a.text ? '<span></span>' : '');
      c.querySelector('b').textContent = a.title; if (a.text) c.querySelector('span').textContent = a.text;
      stage.appendChild(c);
      return { a, o, c, tx, ty, h: c.offsetHeight };
    });
    // Place each side's callouts at their target's height, then push apart so none overlap.
    for (const side of ['left', 'right']) {
      const col = items.filter((i) => i.a.side === side).sort((p, q) => p.ty - q.ty);
      let y = -Infinity;
      for (const i of col) { i.y = Math.max(i.ty - i.h / 2, y + 14); y = i.y + i.h; }
      const over = y - Math.max(H + 4, ...col.map((i) => i.ty + 30));
      if (over > 0) { let floor = Infinity; for (const i of col.slice().reverse()) { i.y = Math.min(i.y - over, floor - 14 - i.h); floor = i.y; } }
      for (const i of col) {
        i.cx = side === 'right' ? padL + W + 4 + GAP : 0;
        Object.assign(i.c.style, { left: i.cx + 'px', top: i.y + 'px' });
      }
    }
    let minTop = 0, maxBottom = H + 4;
    for (const i of items) {
      minTop = Math.min(minTop, i.y); maxBottom = Math.max(maxBottom, i.y + i.h);
      const cy = i.y + i.h / 2, ex = i.a.side === 'right' ? i.cx : i.cx + CW;
      const mx = i.a.side === 'right' ? Math.max(i.tx + 18, ex - GAP / 2) : Math.min(i.tx - 18, ex + GAP / 2);
      const d = Math.abs(cy - i.ty) < 2 ? \`M\${i.tx} \${i.ty} H\${ex}\` : \`M\${i.tx} \${i.ty} H\${mx} V\${cy} H\${ex}\`;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      // a white halo under the line keeps the UI text it crosses readable
      const halo = document.createElementNS('http://www.w3.org/2000/svg','path');
      halo.setAttribute('d', d); halo.setAttribute('fill','none'); halo.setAttribute('stroke','#fff'); halo.setAttribute('stroke-width','3.5');
      halo.setAttribute('stroke-opacity','.75'); svg.appendChild(halo);
      path.setAttribute('d', d); path.setAttribute('fill','none'); path.setAttribute('stroke','#0F1222'); path.setAttribute('stroke-width','1.4');
      svg.appendChild(path);
      const dot = document.createElement('div'); dot.className = 'dot'; Object.assign(dot.style, { left: i.tx + 'px', top: i.ty + 'px' });
      stage.appendChild(dot);
    }
    svg.setAttribute('width', stage.offsetWidth); svg.setAttribute('height', maxBottom);
    stage.appendChild(svg);
    if (minTop < 0) { stage.style.marginTop = (-minTop) + 'px'; }
    stage.style.height = (maxBottom) + 'px';
    document.body.dataset.ready = '1';
  </script></body></html>`;
}

// ---------------------------------------------------------------------------------------------------------
// url: segments [{text, title, desc}] in order; segments without a title are drawn plain (no callout).
function urlHtml({ segments, calloutWidth = 180, fontSize = 17, pill = false }) {
  let k = 0;
  const spans = segments.map((s, i) => {
    const color = s.title ? (s.color || PASTELS[k++ % PASTELS.length]) : "transparent";
    return `<span class="seg" data-i="${i}" style="background:${color}">${esc(s.text)}</span>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
    #stage{position:relative}
    #url{display:inline-block;font-family:${MONO};font-size:${fontSize}px;line-height:1;white-space:nowrap;color:#1B1F33;
      background:#fff;border:1px solid #E3E5EE;border-radius:14px;padding:18px 20px}
    .seg{border-radius:7px;padding:6px 3px}
  </style></head><body style="--cw:${calloutWidth}px">
  <div id="panel" class="${pill ? "has-pill" : ""}"><div id="stage"><div id="url">${spans}</div></div>${pill ? PILL : ""}</div>
  <script>
    const S = ${JSON.stringify(segments.map((s) => ({ title: s.title || "", desc: s.desc || "" })))}, CW = ${calloutWidth};
    const stage = document.getElementById('stage'), url = document.getElementById('url');
    const sr = stage.getBoundingClientRect();
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','lines');
    const segTop = url.offsetTop + url.offsetHeight; // leaders start under the URL box
    const items = [...document.querySelectorAll('.seg')].filter((el) => S[+el.dataset.i].title).map((el) => {
      const r = el.getBoundingClientRect();
      const c = document.createElement('div'); c.className = 'callout';
      c.innerHTML = '<b></b>' + (S[+el.dataset.i].desc ? '<span></span>' : '');
      c.querySelector('b').textContent = S[+el.dataset.i].title;
      if (S[+el.dataset.i].desc) c.querySelector('span').textContent = S[+el.dataset.i].desc;
      stage.appendChild(c);
      return { x: r.left - sr.left + r.width / 2, y: r.bottom - sr.top, c, h: c.offsetHeight };
    });
    // One row when the callouts fit side by side under their segments; otherwise alternate two rows.
    const fits = items.every((it, i) => i === 0 || it.x - items[i - 1].x >= CW + 12);
    const row1 = segTop + 46, rowH = Math.max(...items.map((i) => i.h)) + 22;
    let right = 0;
    items.forEach((it, i) => {
      const row = fits ? 0 : i % 2;
      let left = Math.max(0, it.x - CW / 2);
      it.top = row1 + row * rowH; it.left = left;
      Object.assign(it.c.style, { left: left + 'px', top: it.top + 'px' });
      right = Math.max(right, left + CW);
      const p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', \`M\${it.x} \${it.y + 4} V\${it.top}\`); p.setAttribute('stroke','#0F1222'); p.setAttribute('stroke-width','1.4');
      svg.appendChild(p);
      const dot = document.createElement('div'); dot.className = 'dot'; Object.assign(dot.style, { left: it.x + 'px', top: (it.y + 4) + 'px' });
      stage.appendChild(dot);
    });
    const bottom = Math.max(...items.map((i) => i.top + i.h));
    stage.style.width = Math.max(url.offsetWidth, right) + 'px'; stage.style.height = bottom + 'px';
    svg.setAttribute('width', stage.offsetWidth); svg.setAttribute('height', bottom); stage.appendChild(svg);
    document.body.dataset.ready = '1';
  </script></body></html>`;
}

module.exports = { screenHtml, urlHtml };
