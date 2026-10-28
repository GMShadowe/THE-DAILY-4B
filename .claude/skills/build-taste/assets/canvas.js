// The Build Taste canvas: tasteboard's board, running on the person's machine and saving into their project.
// An infinite canvas of things (pictures, sites, notes) placed by hand. Hold the ground and drag to look around (a
// throw glides on), hold a thing to move it, pinch or ctrl+wheel to zoom. Things can be grouped by hand under a
// name, and each carries a line in the person's own words about what they like in it. No dependencies.

const token = new URLSearchParams(location.search).get("token");
const endpoint = (path) => `${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
const $ = (id) => document.getElementById(id);

const stage = $("stage");
const world = $("world");
const zoomer = $("zoomer");
const saveState = $("save-state");
const finishButton = $("finish-button");
const nameInput = $("board-name");

const NOTE_W = 220;
const SITE_W = 280;
const SITE_FOOT = 44;
/** A picture is shown inside a box this big when it lands. */
const SHOWN = 320;
/** No picture is shown with a side shorter than this. */
const MIN_SIDE = 72;
/** How far a group's ring sits outside its things. */
const RING = 22;
const MIN_Z = 0.2;
const MAX_Z = 3;
/** How far a press has to travel before it's a drag and not a click. */
const SLOP = 4;
const GAP = 16;
/** A throw slows down like this: the speed falls to a third every GLIDE seconds. */
const GLIDE = 0.38;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"];

let board = { name: "My taste", items: [] };
let project = "your project";
let loaded = false;
let uploads = 0;
/** The board went to the agent. It stays open and keeps saving; what changes now is read on the next run. */
let sent = false;
let changedSinceSent = false;
let picked = new Set();
/** Someone has picked several things: the hint about it isn't needed again. */
let hinted = false;
const view = { x: 0, y: 0, z: 1 };
const past = [];
const future = [];

const clampZoom = (z) => Math.max(MIN_Z, Math.min(MAX_Z, z));
const byId = (id) => board.items.find((item) => item.id === id);
const P = (item) => item.place;

/* ---------- saving ---------- */

let saveTimer;
let saveQueue = Promise.resolve();
async function api(path, options) {
  const response = await fetch(endpoint(path), options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not save this change.");
  return result;
}
function status(text) { saveState.textContent = text; }
function scheduleSave() {
  if (!loaded) return;
  if (sent && !changedSinceSent) { changedSinceSent = true; finishButton.textContent = "Saved for next time"; finishButton.dataset.short = "Saved"; say(SENT); }
  status("Saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveNow().catch(() => {}), 450);
}
function saveNow() {
  clearTimeout(saveTimer);
  // `wait` is only for the canvas: a site whose picture is on its way
  const snapshot = JSON.stringify({ name: board.name, items: board.items }, (key, value) => (key === "wait" ? undefined : value));
  const post = () => api("/api/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: snapshot });
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    // right after Finish the server hands over to its quiet copy: a save that lands in between tries again
    try { await post(); } catch { await new Promise((r) => setTimeout(r, 900)); await post(); }
    status(`Saved in ${project}`);
  }).catch((error) => { status(error.message); throw error; });
  return saveQueue;
}

/** Keeps the board as it was, for undo, then saves what it is now. */
function remember() {
  past.push(JSON.stringify(board));
  if (past.length > 80) past.shift();
  future.length = 0;
}
function changed() { render(); scheduleSave(); }
const SENT = "saved. ask your agent to use Build Taste again to read these changes";
function travel(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify(board));
  board = JSON.parse(from.pop());
  nameInput.value = board.name;
  sizeName();
  picked = new Set([...picked].filter((id) => byId(id)));
  changed();
}

/* ---------- the view ---------- */

let anim = 0;
/** Where a glide is heading, so a second zoom click starts from there and not from halfway. */
let aim = null;
function halt() { cancelAnimationFrame(anim); anim = 0; aim = null; }
/** The corners take this much of the stage's top: a bar that would sit under them goes below its things instead. */
const TOP_ROOM = 72;
function placeFloats() {
  const stageBox = stage.getBoundingClientRect();
  if (soloBar) {
    const node = soloBar.parentElement;
    const why = node?.querySelector(".why");
    soloBar.style.setProperty("--under", why ? `${why.offsetHeight + 6}px` : "0px");
    const top = node ? node.getBoundingClientRect().top - stageBox.top : 0;
    soloBar.classList.toggle("below", top - 54 < TOP_ROOM);
  }
  if (manyBar && manyBar.dataset.box) {
    const box = JSON.parse(manyBar.dataset.box);
    const top = stageBox.height / 2 + view.y + box.y * view.z;
    const below = top - 54 < TOP_ROOM;
    manyBar.classList.toggle("below", below);
    manyBar.style.transform = `translate3d(${box.x + box.w / 2}px, ${below ? box.y + box.h + Number(manyBar.dataset.ring || 0) : box.y - Number(manyBar.dataset.ring || 0)}px, 0)`;
  }
}

function applyView() {
  world.style.transform = `translate3d(${view.x}px, ${view.y}px, 0)`;
  zoomer.style.transform = `scale(${view.z})`;
  zoomer.style.setProperty("--inv", String(1 / view.z));
  $("zoom-reset").textContent = `${Math.round(view.z * 100)}%`;
  ground.ask();
  placeFloats();
}
function go(to, instant = false) {
  halt();
  if (instant || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    Object.assign(view, to);
    return applyView();
  }
  const from = { ...view };
  aim = { ...to };
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 520);
    const e = 1 - Math.pow(1 - t, 4);
    view.x = from.x + (to.x - from.x) * e;
    view.y = from.y + (to.y - from.y) * e;
    view.z = from.z + (to.z - from.z) * e;
    applyView();
    if (t < 1) anim = requestAnimationFrame(step);
    else { anim = 0; aim = null; }
  };
  anim = requestAnimationFrame(step);
}
/** Zooms about a point on the stage (px from its middle), which stays put. */
function zoomAt(to, sx = 0, sy = 0, glide = false) {
  const from = aim ?? view;
  const next = clampZoom(to);
  go({ x: sx - ((sx - from.x) / from.z) * next, y: sy - ((sy - from.y) / from.z) * next, z: next }, !glide);
}
/** The zoom a click on − or + starts from: where a glide is heading, or where the view is. */
const zoomNow = () => (aim ?? view).z;
function size() { return { w: stage.clientWidth, h: stage.clientHeight }; }
/** The view that shows all of these things, with room for the corners and the field. */
function fit(items = board.items) {
  const { w, h } = size();
  if (!items.length) return { x: 0, y: 0, z: 1 };
  const box = boxOf(items);
  const padX = Math.min(64, w * 0.08);
  const z = clampZoom(Math.min(1, (w - padX * 2) / box.w, (h - 220) / box.h));
  return { x: -(box.x + box.w / 2) * z, y: -(box.y + box.h / 2) * z - 12, z };
}
function toCanvas(clientX, clientY) {
  const box = stage.getBoundingClientRect();
  return { x: (clientX - box.left - box.width / 2 - view.x) / view.z, y: (clientY - box.top - box.height / 2 - view.y) / view.z };
}
/** The place in the middle of the stage, a little above it, clear of the field. */
function middle() {
  const box = stage.getBoundingClientRect();
  return toCanvas(box.left + box.width / 2, box.top + box.height / 2 - 24);
}
function toss(vx, vy) {
  if (Math.hypot(vx, vy) < 60 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let then = performance.now();
  const step = (now) => {
    const keep = Math.exp(-Math.max(0, Math.min(0.05, (now - then) / 1000)) / GLIDE);
    then = now;
    view.x += vx * GLIDE * (1 - keep);
    view.y += vy * GLIDE * (1 - keep);
    vx *= keep;
    vy *= keep;
    applyView();
    anim = Math.hypot(vx, vy) > 6 ? requestAnimationFrame(step) : 0;
  };
  anim = requestAnimationFrame(step);
}

/* ---------- the ground: a fine grid of dots, and a soft ring through them where a thing lands ---------- */

const ground = (() => {
  const DOT = 28;
  const RIPPLE = 0.9;
  const MOST = 4;
  const canvas = $("ground");
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
  const plain = () => {
    canvas.hidden = true;
    const dots = $("dots");
    dots.hidden = false;
    return {
      ask() {
        const fine = DOT * view.z;
        const big = DOT * 4 * view.z;
        const { w, h } = size();
        dots.style.backgroundSize = `${big}px ${big}px, ${fine}px ${fine}px`;
        dots.style.backgroundPosition = `${w / 2 + view.x - big / 2}px ${h / 2 + view.y - big / 2}px, ${w / 2 + view.x - fine / 2}px ${h / 2 + view.y - fine / 2}px`;
      },
      land() {},
    };
  };
  if (!gl) return plain();
  const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize; uniform float uDpr; uniform vec3 uView; uniform vec4 uRing[${MOST}];
out vec4 color;
float dots(vec2 at, float gap, float radius) {
  vec2 cell = (fract(at / gap + 0.5) - 0.5) * gap;
  return 1.0 - smoothstep(radius - 0.5, radius + 0.5, length(cell) * uView.z);
}
void main() {
  vec2 px = gl_FragCoord.xy / uDpr;
  px.y = uSize.y - px.y;
  vec2 at = (px - uSize * 0.5 - uView.xy) / uView.z;
  vec2 push = vec2(0.0);
  float lit = 0.0;
  for (int i = 0; i < ${MOST}; i++) {
    float age = uRing[i].z;
    if (age < 0.0) continue;
    vec2 from = at - uRing[i].xy;
    float far = length(from);
    float band = exp(-pow((far - age * 560.0) / 52.0, 2.0)) * (1.0 - smoothstep(0.0, ${RIPPLE.toFixed(1)}, age));
    push += from / max(far, 0.001) * band * 7.0;
    lit += band;
  }
  at -= push;
  float fine = dots(at, ${DOT}.0, 1.0) * 0.13 * smoothstep(0.45, 0.8, uView.z);
  float bold = dots(at, ${DOT * 4}.0, 1.25) * 0.22;
  color = vec4(0.0, 0.0, 0.0, max(fine, bold) * (1.0 + lit * 1.6));
}`;
  const shader = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, "#version 300 es\nin vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return plain();
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  const u = (name) => gl.getUniformLocation(program, name);
  const [uSize, uDpr, uView, uRing] = ["uSize", "uDpr", "uView", "uRing"].map(u);
  const data = new Float32Array(MOST * 4);
  let rings = [];
  let frame = 0;
  // it draws only while something changes: the view moving, a ring still running
  const draw = (now) => {
    frame = 0;
    rings = rings.filter((r) => now - r.born < RIPPLE * 1000);
    const { w, h } = size();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    for (let i = 0; i < MOST; i++) data.set(rings[i] ? [rings[i].x, rings[i].y, (now - rings[i].born) / 1000, 0] : [0, 0, -1, 0], i * 4);
    gl.uniform2f(uSize, w, h);
    gl.uniform1f(uDpr, dpr);
    gl.uniform3f(uView, view.x, view.y, view.z);
    gl.uniform4fv(uRing, data);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (rings.length) frame = requestAnimationFrame(draw);
  };
  const ask = () => { if (!frame) frame = requestAnimationFrame(draw); };
  return {
    ask,
    land(x, y) {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      rings = [...rings.slice(-(MOST - 1)), { x, y, born: performance.now() }];
      ask();
    },
  };
})();

/* ---------- drawing the board ---------- */

const icon = {
  trash: '<svg viewBox="0 0 18 18"><path class="ln" d="M3.9 5.3h10.2M7.3 5.1V4.1c0-.45.35-.8.8-.8h1.8c.45 0 .8.35.8.8v1"/><path class="pf" stroke-width="1.5" d="M5.3 7.4h7.4l-.55 6.4a1.2 1.2 0 01-1.2 1.1H7.05a1.2 1.2 0 01-1.2-1.1L5.3 7.4z"/></svg>',
  open: '<svg viewBox="0 0 18 18"><path class="ln" d="M5.25 12.75l7.5-7.5M6.75 5.25h6v6"/></svg>',
};
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };
const imageUrl = (file) => endpoint(`/api/image/${encodeURIComponent(file.split("/").at(-1))}`);

/** How far the line written under a thing reaches below it (about: its letters over the thing's width). */
/** How far the line written under a thing reaches below it: at most four lines are shown, the rest is in its bar. */
const under = (i) => (i.kind !== "note" && i.why ? Math.min(4, Math.ceil((i.why.length * 7.6) / P(i).w)) * 22 + 8 : 0);
/** The box round some things, the lines written under them included. */
function boxOf(list) {
  const x = Math.min(...list.map((i) => P(i).x));
  const y = Math.min(...list.map((i) => P(i).y));
  return { x, y, w: Math.max(...list.map((i) => P(i).x + P(i).w)) - x, h: Math.max(...list.map((i) => P(i).y + P(i).h + under(i))) - y };
}

const tiles = new Map();
const entering = new Set();

function faceOf(item) {
  const face = el("div", "face");
  if (item.kind === "image") {
    const img = el("img");
    img.src = imageUrl(item.file);
    img.alt = item.why || item.name || "a saved picture";
    img.draggable = false;
    face.append(img);
  } else if (item.kind === "site") {
    // 16px card, 4px in: a 12px picture
    const card = el("div", "site");
    if (item.file) {
      const img = el("img");
      img.src = imageUrl(item.file);
      img.alt = "";
      img.draggable = false;
      card.append(img);
    } else if (item.wait) card.append(el("span", "wait"));
    const foot = el("p", "site-foot");
    const host = hostOf(item.url);
    foot.append(el("span", "site-letter", host[0] || "?"), el("span", "site-title", item.title || host));
    if (item.title && item.title !== host) foot.append(el("span", "site-host", host));
    card.append(foot);
    face.append(card);
  } else {
    face.append(el("p", "note", item.text));
  }
  if (item.kind !== "note" && item.why) face.append(el("p", "why", item.why));
  return face;
}

function itemBar(item) {
  const note = item.kind === "note";
  const bar = el("div", "float item-bar");
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", note ? "This note" : item.kind === "site" ? "This site" : "This picture");
  // a note can have several lines: its field keeps them (Enter keeps the note, Shift+Enter starts a new line)
  const input = el(note ? "textarea" : "input");
  if (note) { input.rows = 1; input.className = "note-field"; }
  const saved = (note ? item.text : item.why) || "";
  input.value = saved;
  input.placeholder = note ? "write the note" : "what do you like here?";
  input.setAttribute("aria-label", note ? "The note" : "What you like here");
  input.maxLength = note ? 3000 : 1000;
  input.autocomplete = "off";
  const commit = () => {
    const next = input.value.trim();
    const now = byId(item.id);
    if (!now || next === ((note ? now.text : now.why) || "")) return;
    remember();
    if (note && !next) board.items = board.items.filter((i) => i.id !== item.id);
    else if (note) now.text = next;
    else { now.why = next; makeRoomUnder(now); }
    changed();
  };
  const fit = () => { if (note) { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 120)}px`; } };
  requestAnimationFrame(fit);
  input.addEventListener("input", () => {
    fit();
    // what you write shows under the thing as you write it
    const now = byId(item.id);
    const tile = tiles.get(item.id);
    if (!now || !tile) return;
    if (note) tile.querySelector(".note").textContent = input.value;
    else {
      let why = tile.querySelector(".why");
      if (!why) tile.querySelector(".face").append((why = el("p", "why")));
      why.textContent = input.value;
    }
  });
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    // Enter keeps what's written, whether or not the window has focus to send a blur
    if (e.key === "Enter" && !(note && e.shiftKey)) { e.preventDefault(); commit(); input.blur(); }
    else if (e.key === "Escape") { input.value = saved; input.blur(); }
    e.stopPropagation();
  });
  bar.append(input);
  if (item.url) {
    const open = el("a", "tool");
    open.href = item.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.setAttribute("aria-label", `Open ${hostOf(item.url)}`);
    open.innerHTML = icon.open;
    bar.append(open);
  }
  const bin = el("button", "tool");
  bin.type = "button";
  bin.setAttribute("aria-label", "Take it off the board");
  bin.innerHTML = icon.trash;
  bin.addEventListener("click", () => removeThings([item.id]));
  bar.append(bin);
  return bar;
}

let soloBar = null;
let manyBar = null;
const rings = new Map();

function render() {
  const items = board.items;
  const live = new Set(items.map((i) => i.id));
  picked = new Set([...picked].filter((id) => live.has(id)));
  const solo = picked.size === 1 ? [...picked][0] : null;

  // each group's ring
  const groups = new Map();
  for (const item of items) if (item.group) groups.set(item.group, [...(groups.get(item.group) || []), item]);
  const wholeGroups = new Set([...groups].filter(([, members]) => members.every((m) => picked.has(m.id))).map(([name]) => name));
  for (const [name, node] of rings) if (!groups.has(name)) { node.remove(); rings.delete(name); }
  for (const [name, members] of groups) {
    let node = rings.get(name);
    if (!node) {
      node = el("div", "ring");
      node.dataset.ring = name;
      node.innerHTML = '<svg aria-hidden="true"><rect width="100%" height="100%" rx="28"/></svg>';
      const label = el("button", "ring-name");
      label.type = "button";
      label.dataset.group = name;
      node.append(label);
      rings.set(name, node);
      zoomer.prepend(node);
    }
    const box = boxOf(members);
    node.style.width = `${box.w + RING * 2}px`;
    node.style.height = `${box.h + RING * 2}px`;
    node.style.transform = `translate3d(${box.x - RING}px, ${box.y - RING}px, 0)`;
    node.classList.toggle("picked", wholeGroups.has(name));
    const label = node.querySelector(".ring-name");
    label.textContent = name;
    label.setAttribute("aria-label", `Group: ${name}`);
  }

  // the things, in their pile order
  for (const [id, node] of tiles) if (!live.has(id) && !node.classList.contains("out")) {
    node.classList.add("out");
    node.removeAttribute("data-item");
    node.addEventListener("animationend", () => node.remove(), { once: true });
    tiles.delete(id);
  }
  items.forEach((item, index) => {
    let node = tiles.get(item.id);
    const sign = JSON.stringify([item.kind, item.file, item.url, item.title, item.text, item.why, item.wait]);
    if (!node) {
      node = el("div", "tile");
      node.dataset.item = item.id;
      node.dataset.kind = item.kind;
      node.tabIndex = 0;
      node.setAttribute("role", "group");
      tiles.set(item.id, node);
      zoomer.append(node);
      if (entering.has(item.id)) {
        node.classList.add("in");
        setTimeout(() => node.classList.remove("in"), 400);
      }
    }
    if (node.dataset.sign !== sign) {
      node.dataset.sign = sign;
      node.querySelector(".face")?.remove();
      node.prepend(faceOf(item));
      node.setAttribute("aria-label", item.kind === "note" ? `Note: ${item.text}` : item.kind === "site" ? `Site: ${item.title || hostOf(item.url)}` : `Picture${item.why ? `: ${item.why}` : ""}`);
    }
    const p = P(item);
    node.style.width = `${p.w}px`;
    node.style.height = item.kind === "note" ? "" : `${p.h}px`;
    node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    node.style.zIndex = String(index + 1);
    // a group picked whole shows it on its own ring, not on each thing inside
    node.classList.toggle("picked", picked.has(item.id) && !wholeGroups.has(item.group));
  });

  // a note is as tall as its words
  for (const item of items) {
    if (item.kind !== "note") continue;
    const h = tiles.get(item.id)?.offsetHeight;
    if (h && Math.abs(h - P(item).h) > 0.5) P(item).h = h;
  }

  // the bar over the one thing picked, and its corner to pull
  const soloNode = solo && tiles.get(solo);
  if (!soloBar || soloBar.dataset.for !== solo || !soloNode?.contains(soloBar)) {
    soloBar?.remove();
    stage.querySelector(".handle")?.remove();
    soloBar = null;
    if (soloNode) {
      soloBar = itemBar(byId(solo));
      soloBar.dataset.for = solo;
      const handle = el("span", "handle");
      handle.setAttribute("aria-hidden", "true");
      soloNode.append(soloBar, handle);
    }
  }

  // the bar over several picked things
  const list = items.filter((i) => picked.has(i.id));
  if (list.length > 1) hinted = true;
  const group = list.length > 1 && wholeGroups.size === 1 && list.every((i) => i.group === [...wholeGroups][0]) ? [...wholeGroups][0] : null;
  const manySign = list.length > 1 ? `${group ?? ""}|${list.map((i) => i.id).join()}` : "";
  if (!manySign) { manyBar?.remove(); manyBar = null; }
  else {
    if (!manyBar || manyBar.dataset.sign !== manySign) {
      manyBar?.remove();
      manyBar = manyBarFor(list, group);
      manyBar.dataset.sign = manySign;
      zoomer.append(manyBar);
    }
    manyBar.dataset.box = JSON.stringify(boxOf(list));
    manyBar.dataset.ring = String(group ? RING : 0);
  }
  placeFloats();

  // what the line over the field says: dropping wins, then how to reach into a picked group, then how to pick several
  if (sent && changedSinceSent && !depth) say(SENT);
  else if (!depth) {
    const groupOnly = wholeGroups.size === 1 && list.length > 1 && list.every((i) => i.group === [...wholeGroups][0]);
    const touch = matchMedia("(pointer: coarse)").matches;
    say(groupOnly ? `${touch ? "tap" : "click"} a thing again to move it on its own` : items.length > 1 && !picked.size && !hinted && !touch ? "drag across things to pick several" : "");
  }

  // the corners and the empty board
  const count = items.length;
  $("count").textContent = String(count);
  $("count-word").textContent = count === 1 ? "thing" : "things";
  $("empty").hidden = !loaded || count > 0;
  finishButton.disabled = !loaded || !count || uploads > 0 || sent;
  entering.clear();
}

function manyBarFor(list, group) {
  const bar = el("div", "float many-bar");
  bar.setAttribute("role", "toolbar");
  const ids = list.map((i) => i.id);
  if (group) {
    bar.setAttribute("aria-label", "This group");
    const input = el("input");
    input.value = group;
    input.placeholder = "what do these share?";
    input.setAttribute("aria-label", "The group's name");
    input.maxLength = 60;
    const commit = () => {
      let next = cleanName(input.value);
      if (!board.items.some((i) => i.group === group)) return;
      if (!next || next === group) return (input.value = group);
      // another group already has this name: this one gets a number, so the two never become one
      const others = new Set(board.items.filter((i) => i.group && i.group !== group).map((i) => i.group));
      if (others.has(next)) { let n = 2; while (others.has(`${next} ${n}`)) n++; next = `${next} ${n}`; }
      remember();
      for (const item of board.items) if (item.group === group) item.group = next;
      changed();
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { commit(); input.blur(); }
      else if (e.key === "Escape") { input.value = group; input.blur(); }
      e.stopPropagation();
    });
    const apart = el("button", "plain", "Ungroup");
    apart.type = "button";
    apart.addEventListener("click", () => ungroup(group));
    bar.append(input, apart);
  } else {
    bar.setAttribute("aria-label", "These things");
    const join = el("button", "primary", "Group");
    join.type = "button";
    join.addEventListener("click", () => groupThings(ids));
    bar.append(el("span", "count", `${ids.length} things`), join);
  }
  const bin = el("button", "tool");
  bin.type = "button";
  bin.setAttribute("aria-label", "Take them off the board");
  bin.innerHTML = icon.trash;
  bin.addEventListener("click", () => removeThings(ids));
  bar.append(bin);
  return bar;
}

/* ---------- changing the board ---------- */

function removeThings(ids) {
  remember();
  board.items = board.items.filter((i) => !ids.includes(i.id));
  picked = new Set();
  changed();
}
function groupThings(ids) {
  if (ids.length < 2) return;
  remember();
  const taken = new Set(board.items.map((i) => i.group));
  let n = 1;
  while (taken.has(`group ${n}`)) n++;
  for (const item of board.items) if (ids.includes(item.id)) item.group = `group ${n}`;
  changed();
  // the name is the point: the field for it is ready to write in
  requestAnimationFrame(() => { const input = manyBar?.querySelector("input"); input?.focus(); input?.select(); });
}
function ungroup(name) {
  remember();
  for (const item of board.items) if (item.group === name) item.group = "";
  changed();
}
/** A "why" written under a thing needs room: whatever it would run over moves down just enough to clear it. */
function makeRoomUnder(item) {
  const p = P(item);
  const bottom = p.y + p.h + under(item) + GAP / 2;
  for (const other of board.items) {
    const o = P(other);
    if (other === item || o.x >= p.x + p.w || o.x + o.w <= p.x) continue;
    if (o.y >= p.y + p.h && o.y < bottom) o.y = Math.round(bottom);
  }
}

/** A group's name as it's kept: one line, no leading #, no longer than 60. */
const cleanName = (text) => text.replace(/\s+/g, " ").replace(/^#+\s*/, "").trim().slice(0, 60);

/** What's picked up comes to the front of the pile. */
function front(ids) {
  const set = new Set(ids);
  board.items = [...board.items.filter((i) => !set.has(i.id)), ...board.items.filter((i) => set.has(i.id))];
}

/* ---------- taking things in ---------- */

/** The open spot nearest to a place, spiralling out like a sunflower's seeds, so nothing lands on top of anything. */
function freeSpot(others, w, h, cx, cy) {
  for (let i = 0; i < 400; i++) {
    const r = 36 * Math.sqrt(i);
    const x = Math.round(cx + r * Math.cos(i * 2.399963) - w / 2);
    const y = Math.round(cy + r * Math.sin(i * 2.399963) - h / 2);
    // each thing keeps the room its "why" line takes below it, and 40px for one a new thing may get
    if (others.every((o) => x + w + GAP <= o.x || o.x + o.w + GAP <= x || y + h + GAP + 40 <= o.y || o.y + o.h + (o.under || 0) + GAP <= y)) return { x, y };
  }
  return { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) };
}
const fresh = (kind) => ({ id: crypto.randomUUID(), kind, why: "", group: "", added: new Date().toISOString().slice(0, 10) });

function land(things, at) {
  remember();
  for (const thing of things) {
    const spot = freeSpot(board.items.map((i) => ({ ...P(i), under: Math.max(40, under(i)) })), thing.place.w, thing.place.h, at.x, at.y);
    Object.assign(thing.place, spot);
    board.items.push(thing);
    entering.add(thing.id);
    ground.land(spot.x + thing.place.w / 2, spot.y + thing.place.h / 2);
  }
  picked = new Set(things.map((t) => t.id));
  changed();
  return things;
}

function naturalSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 800, h: img.naturalHeight || 600 });
    img.onerror = () => resolve({ w: 800, h: 600 });
    img.src = src;
  });
}

async function addPictures(files, at = middle()) {
  const valid = [...files].filter((file) => TYPES.includes(file.type));
  if (!valid.length) return status("Use PNG, JPEG, WebP, GIF, AVIF, or SVG images.");
  uploads++;
  render();
  const things = [];
  for (const [index, file] of valid.entries()) {
    status(valid.length > 1 ? `Adding ${index + 1} of ${valid.length}…` : "Adding…");
    try {
      const local = URL.createObjectURL(file);
      const { w, h } = await naturalSize(local);
      URL.revokeObjectURL(local);
      const result = await api("/api/image", { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const scale = Math.min(1, SHOWN / Math.max(w, h));
      // a very wide or very tall picture keeps a short side of at least 72px, so it can be seen and picked up;
      // the picture is cropped to that box, never squashed
      const box = { w: Math.max(MIN_SIDE, Math.round(w * scale)), h: Math.max(MIN_SIDE, Math.round(h * scale)) };
      things.push({ ...fresh("image"), file: result.file, name: (file.name || "Pasted screenshot").replace(/\.[a-z0-9]+$/i, ""), place: { x: 0, y: 0, ...box } });
    } catch (error) {
      status(error.message);
    }
  }
  uploads--;
  if (things.length) land(things, at);
  else render();
}

/** A link, if this text is one and nothing else: with or without its https. */
function asLink(text) {
  const t = text.trim();
  if (!t || /\s/.test(t)) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : /^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/.test(t) ? `https://${t}` : null;
  if (!withScheme) return null;
  try { const url = new URL(withScheme); return url.hostname.includes(".") ? url : null; } catch { return null; }
}

function addText(text, at = middle()) {
  const link = asLink(text);
  if (link) return addSite(link, at);
  if (!text.trim()) return;
  land([{ ...fresh("note"), text: text.trim().slice(0, 3000), place: { x: 0, y: 0, w: NOTE_W, h: 30 } }], at);
}

/**
 * Puts a site on the board at once, as its name and address, then fills in its title and picture when they
 * arrive. The canvas asks its own local server, which reads the page's head and keeps its picture in the project.
 */
function addSite(url, at) {
  const host = hostOf(url.href);
  const [thing] = land([{ ...fresh("site"), url: url.href, title: host, wait: true, place: { x: 0, y: 0, w: SITE_W, h: Math.round((SITE_W - 8) / 1.91) + SITE_FOOT } }], at);
  void (async () => {
    const patch = { wait: false };
    let h = SITE_FOOT + 8;
    try {
      const found = await api("/api/unfurl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.href }) });
      if (found.title) patch.title = found.title.slice(0, 180);
      if (found.file) {
        patch.file = found.file;
        const shape = await naturalSize(imageUrl(found.file));
        h = Math.round(Math.max(120, Math.min(SITE_W, ((SITE_W - 8) * shape.h) / shape.w))) + SITE_FOOT;
      }
    } catch {}
    const now = byId(thing.id);
    if (!now) return;
    // filling in isn't a step of its own
    Object.assign(now, patch);
    P(now).h = h;
    changed();
  })();
}

/* ---------- holding and moving ---------- */

let gesture = null;
let depth = 0;
/** The stage keeps the pointer, wherever it goes. A pointer the browser no longer knows can't be kept. */
const capture = (id) => { try { stage.setPointerCapture(id); } catch {} };
let trail = [];
const fingers = new Map();
let pinch = null;

/** Space held down: the ground is for moving, like in a design tool. */
let spaceDown = false;
const marquee = el("div", "marquee");
marquee.hidden = true;
stage.append(marquee);

function down(e) {
  const target = e.target;
  // the middle button always moves the board
  if ((e.button !== 0 && e.button !== 1) || target.closest("[data-ui], .float, input, a")) return;
  halt();
  if (document.activeElement?.closest?.("[data-ui], .float")) document.activeElement.blur();
  const box = stage.getBoundingClientRect();
  const local = { x: e.clientX - box.left - box.width / 2, y: e.clientY - box.top - box.height / 2 };
  fingers.set(e.pointerId, local);

  if (fingers.size === 2) {
    // two fingers: the spot between them is held, and their spread is the zoom
    gesture = null;
    marquee.hidden = true;
    const [a, b] = [...fingers.values()];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.z, wx: (mx - view.x) / view.z, wy: (my - view.y) / view.z };
    for (const id of fingers.keys()) capture(id);
    return;
  }

  const start = { pointer: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };
  const adding = e.shiftKey || e.metaKey || e.ctrlKey;
  const handle = target.closest(".handle");
  const id = target.closest(".tile")?.dataset.item;
  const named = target.closest(".ring-name")?.dataset.group;
  const item = id ? byId(id) : named ? board.items.find((i) => i.group === named) : null;

  if (e.button === 1 || spaceDown || (e.pointerType === "touch" && !item)) {
    e.preventDefault();
    gesture = { type: "pan", ...start, ox: view.x, oy: view.y };
    trail = [];
  } else if (handle && item) {
    gesture = { type: "resize", ...start, item, node: tiles.get(item.id), w: P(item).w, h: P(item).h };
  } else if (item) {
    // A thing in a group is picked up with its group. Once the group is picked, a click on one of its things picks
    // that thing alone, and it can then be moved on its own and stays in the group. Alt reaches it at once.
    const members = item.group ? board.items.filter((i) => i.group === item.group).map((i) => i.id) : [item.id];
    const groupPicked = item.group && members.every((m) => picked.has(m));
    const aloneNow = picked.size === 1 && picked.has(item.id);
    const whole = named ?? (e.altKey || aloneNow ? "" : item.group);
    const unit = whole ? board.items.filter((i) => i.group === whole).map((i) => i.id) : [item.id];
    let next = picked;
    if (adding) {
      next = new Set(picked);
      if (unit.every((u) => next.has(u))) unit.forEach((u) => next.delete(u));
      else unit.forEach((u) => next.add(u));
    } else if (!unit.every((u) => picked.has(u))) next = new Set(unit);
    const alone = !adding && unit.every((u) => picked.has(u)) && picked.size > unit.length;
    if (next !== picked) { picked = next; render(); }
    if (!picked.has(item.id)) return;
    const from = board.items.filter((i) => picked.has(i.id)).map((i) => ({ id: i.id, x: P(i).x, y: P(i).y, node: tiles.get(i.id) }));
    gesture = { type: "move", ...start, unit, alone, from, drill: !named && !adding && groupPicked && item.group ? item.id : null };
  } else {
    // drag across the ground to pick everything the box touches
    gesture = { type: "select", ...start, base: adding ? new Set(picked) : new Set() };
  }
}

/** Each group's ring, drawn round where its things are right now (some of them may be on the move). */
function drawRings(moved = new Map()) {
  for (const [name, node] of rings) {
    const members = board.items.filter((i) => i.group === name).map((i) => (moved.has(i.id) ? { ...i, place: { ...P(i), ...moved.get(i.id) } } : i));
    if (!members.length) continue;
    const box = boxOf(members);
    node.style.width = `${box.w + RING * 2}px`;
    node.style.height = `${box.h + RING * 2}px`;
    node.style.transform = `translate3d(${box.x - RING}px, ${box.y - RING}px, 0)`;
  }
}

function move(e) {
  if (!fingers.has(e.pointerId)) return;
  const box = stage.getBoundingClientRect();
  fingers.set(e.pointerId, { x: e.clientX - box.left - box.width / 2, y: e.clientY - box.top - box.height / 2 });
  if (pinch && fingers.size === 2) {
    const [a, b] = [...fingers.values()];
    view.z = clampZoom((pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d);
    view.x = (a.x + b.x) / 2 - pinch.wx * view.z;
    view.y = (a.y + b.y) / 2 - pinch.wy * view.z;
    return applyView();
  }
  const g = gesture;
  if (!g || g.pointer !== e.pointerId) return;
  const dx = e.clientX - g.sx;
  const dy = e.clientY - g.sy;
  if (!g.moved) {
    if (Math.hypot(dx, dy) < SLOP) return;
    g.moved = true;
    capture(e.pointerId);
    stage.classList.add(g.type === "pan" ? "panning" : "busy");
    if (g.type === "move") {
      front(g.from.map((f) => f.id));
      board.items.forEach((item, index) => { const node = tiles.get(item.id); if (node) node.style.zIndex = String(index + 1); });
    }
  }
  const z = view.z;
  if (g.type === "pan") {
    view.x = g.ox + dx;
    view.y = g.oy + dy;
    applyView();
    trail.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    while (trail.length > 2 && e.timeStamp - trail[0].t > 100) trail.shift();
  } else if (g.type === "select") {
    const left = Math.min(g.sx, e.clientX) - box.left;
    const top = Math.min(g.sy, e.clientY) - box.top;
    Object.assign(marquee.style, { left: `${left}px`, top: `${top}px`, width: `${Math.abs(dx)}px`, height: `${Math.abs(dy)}px` });
    marquee.hidden = false;
    const a = toCanvas(Math.min(g.sx, e.clientX), Math.min(g.sy, e.clientY));
    const b = toCanvas(Math.max(g.sx, e.clientX), Math.max(g.sy, e.clientY));
    const next = new Set(g.base);
    for (const item of board.items) {
      const p = P(item);
      if (p.x < b.x && p.x + p.w > a.x && p.y < b.y && p.y + p.h > a.y) next.add(item.id);
    }
    if (next.size !== picked.size || [...next].some((id) => !picked.has(id))) { picked = next; render(); }
  } else if (g.type === "move") {
    const moved = new Map();
    for (const f of g.from) {
      f.node.style.transform = `translate3d(${f.x + dx / z}px, ${f.y + dy / z}px, 0)`;
      moved.set(f.id, { x: f.x + dx / z, y: f.y + dy / z });
    }
    drawRings(moved);
  } else {
    const { item } = g;
    if (item.kind === "note" || (item.kind === "site" && !item.file)) {
      // words and a bare address only get wider or narrower
      g.w = Math.max(140, Math.round(P(item).w + dx / z));
    } else {
      // pictures keep their shape: the corner follows whichever way the pointer has gone further
      const grow = Math.max((P(item).w + dx / z) / P(item).w, (P(item).h + dy / z) / P(item).h, 64 / Math.min(P(item).w, P(item).h));
      g.w = Math.round(P(item).w * grow);
      g.h = Math.round(P(item).h * grow);
      g.node.style.height = `${g.h}px`;
    }
    g.node.style.width = `${g.w}px`;
    drawRings(new Map([[item.id, { w: g.w, h: g.h ?? P(item).h }]]));
  }
}

function up(e) {
  if (!fingers.delete(e.pointerId)) return;
  if (pinch) {
    pinch = null;
    const [rest] = [...fingers.entries()];
    if (rest) {
      const box = stage.getBoundingClientRect();
      gesture = { type: "pan", pointer: rest[0], sx: rest[1].x + box.left + box.width / 2, sy: rest[1].y + box.top + box.height / 2, ox: view.x, oy: view.y, moved: true };
      trail = [];
    }
    return;
  }
  const g = gesture;
  gesture = null;
  stage.classList.remove("panning", "busy");
  marquee.hidden = true;
  if (!g) return;
  const cancelled = e.type === "pointercancel";
  if (g.type === "pan" || g.type === "select") {
    if (!g.moved) {
      // a click on the ground lets go of everything
      if (!e.shiftKey && picked.size) { picked = new Set(); render(); }
      return;
    }
    if (g.type === "select") return render();
    const first = trail[0];
    const last = trail.at(-1);
    if (cancelled || !first || last === first || e.timeStamp - last.t > 80) return;
    toss(((last.x - first.x) / (last.t - first.t)) * 1000, ((last.y - first.y) / (last.t - first.t)) * 1000);
  } else if (g.type === "move") {
    if (!g.moved) {
      // into a picked group: the one thing clicked
      if (g.drill) { picked = new Set([g.drill]); render(); }
      else if (g.alone) { picked = new Set(g.unit); render(); }
      return;
    }
    if (cancelled) { drawRings(); return render(); }
    const dx = Math.round((e.clientX - g.sx) / view.z);
    const dy = Math.round((e.clientY - g.sy) / view.z);
    remember();
    for (const f of g.from) { const item = byId(f.id); P(item).x = f.x + dx; P(item).y = f.y + dy; }
    changed();
  } else {
    if (!g.moved || cancelled) { drawRings(); return render(); }
    remember();
    P(g.item).w = g.w;
    if (g.h) P(g.item).h = g.h;
    changed();
  }
}

stage.addEventListener("pointerdown", down);
stage.addEventListener("pointermove", move);
stage.addEventListener("pointerup", up);
stage.addEventListener("pointercancel", up);
stage.addEventListener("dblclick", (e) => {
  // into a group: the one thing under the pointer
  const id = e.target.closest(".tile")?.dataset.item;
  if (id) { picked = new Set([id]); render(); }
});
stage.addEventListener("focusin", (e) => {
  // reaching a thing with Tab picks it: its ring is its focus ring
  if (fingers.size) return;
  const id = e.target.dataset?.item;
  const group = e.target.dataset?.group;
  if (id && !picked.has(id)) { picked = new Set([id]); render(); }
  else if (group) { picked = new Set(board.items.filter((i) => i.group === group).map((i) => i.id)); render(); }
});
stage.addEventListener("wheel", (e) => {
  if (e.target.closest("[data-ui], .float")) return;
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    // a pinch on a trackpad arrives as ctrl+wheel
    const box = stage.getBoundingClientRect();
    zoomAt(view.z * Math.exp(-e.deltaY * 0.01), e.clientX - box.left - box.width / 2, e.clientY - box.top - box.height / 2);
  } else {
    halt();
    const line = e.deltaMode === 1 ? 16 : 1;
    view.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * line;
    view.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * line;
    applyView();
  }
}, { passive: false });

/* ---------- the keyboard, the clipboard, and dropping ---------- */

const typing = (t) => t?.closest?.("input, textarea, [contenteditable='true']");
window.addEventListener("keydown", (e) => {
  if (typing(e.target) || !$("finished").hidden) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (!spaceDown) { spaceDown = true; stage.classList.add("hand"); }
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (mod && k === "z") travel(e.shiftKey ? future : past, e.shiftKey ? past : future);
  else if (mod && k === "y") travel(future, past);
  else if (mod && k === "g") {
    if (e.shiftKey) for (const name of new Set(board.items.filter((i) => picked.has(i.id) && i.group).map((i) => i.group))) ungroup(name);
    else groupThings([...picked]);
  } else if (mod && k === "a") { picked = new Set(board.items.map((i) => i.id)); render(); }
  else if (mod || e.altKey) return;
  else if ((k === "Backspace" || k === "Delete") && picked.size) removeThings([...picked]);
  else if (k === "Escape" && picked.size) { picked = new Set(); render(); }
  else if (k === "Enter" && picked.size === 1) soloBar?.querySelector("input")?.focus();
  else if (k.startsWith("Arrow")) {
    const way = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (!way) return;
    if (picked.size) {
      // picked things are nudged; with nothing picked the arrows move the canvas
      remember();
      const step = e.shiftKey ? 32 : 8;
      for (const item of board.items) if (picked.has(item.id)) { P(item).x += way[0] * step; P(item).y += way[1] * step; }
      changed();
    } else {
      const step = e.shiftKey ? 240 : 80;
      go({ x: view.x - way[0] * step, y: view.y - way[1] * step, z: view.z }, true);
    }
  } else if (k === "+" || k === "=") zoomAt(view.z * 1.25);
  else if (k === "-" || k === "_") zoomAt(view.z / 1.25);
  else if (k === "0" || k === "Home") go(fit());
  else if (k === "1") zoomAt(1);
  else return;
  e.preventDefault();
});

window.addEventListener("keyup", (e) => { if (e.code === "Space") { spaceDown = false; stage.classList.remove("hand"); } });
window.addEventListener("blur", () => { spaceDown = false; stage.classList.remove("hand"); });

document.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((file) => file.type.startsWith("image/"));
  if (files.length) {
    e.preventDefault();
    return void addPictures(files);
  }
  if (typing(e.target)) return;
  const text = e.clipboardData?.getData("text/plain") || "";
  if (text.trim()) {
    e.preventDefault();
    addText(text.slice(0, 2000));
  }
});

function say(text) {
  const line = $("line");
  line.hidden = !text;
  if (text && line.textContent !== text) { line.textContent = text; line.style.animation = "none"; void line.offsetWidth; line.style.animation = ""; }
}
stage.addEventListener("dragenter", (e) => { e.preventDefault(); depth++; say("let go, it lands where you drop it"); });
stage.addEventListener("dragover", (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; });
stage.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) say(""); });
stage.addEventListener("drop", (e) => {
  e.preventDefault();
  depth = 0;
  say("");
  const at = toCanvas(e.clientX, e.clientY);
  const files = [...(e.dataTransfer?.files || [])].filter((file) => file.type.startsWith("image/"));
  const text = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || "";
  if (files.length) void addPictures(files, at);
  else if (text.trim()) addText(text.split("\n")[0].slice(0, 2000), at);
});

/* ---------- the field: a link becomes a site, anything else a note ---------- */

const field = $("field");
const fieldInput = $("field-input");
const submit = $("field-submit");
const hint = $("paste-hint");
// the paste key as this computer names it
if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $("paste-key").textContent = "Ctrl";
// a narrow field gets a shorter prompt, so it stays on one line
const placeLine = () => { fieldInput.placeholder = field.clientWidth < 420 ? "Paste a link, or write a note" : "Paste a link or screenshot, or write a note"; };
new ResizeObserver(placeLine).observe(field);
/** The field grows with a longer note, up to about six lines, then scrolls. */
function growField() {
  fieldInput.style.height = "36px";
  fieldInput.style.height = `${Math.min(fieldInput.scrollHeight, 128)}px`;
}
function syncField() {
  const text = fieldInput.value.trim();
  const label = asLink(text) ? "Add site" : "Add note";
  hint.hidden = Boolean(text);
  submit.hidden = !text;
  if ($("submit-label").textContent !== label) $("submit-label").textContent = label;
  growField();
}
fieldInput.addEventListener("input", syncField);
fieldInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { fieldInput.value = ""; syncField(); fieldInput.blur(); }
  // Enter adds; Shift+Enter starts a new line in a note
  else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); field.requestSubmit(); }
});
field.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = fieldInput.value.trim();
  if (!text) return;
  addText(text);
  fieldInput.value = "";
  syncField();
});
field.addEventListener("pointerdown", (e) => { if (e.target === field) { e.preventDefault(); fieldInput.focus(); } });
const imageInput = $("image-input");
$("image-button").addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => { void addPictures(imageInput.files); imageInput.value = ""; });

/* ---------- the corners ---------- */

function sizeName() { $("name-size").textContent = nameInput.value || " "; }
nameInput.addEventListener("input", sizeName);
nameInput.addEventListener("change", () => {
  if ((nameInput.value.trim() || "My taste") === board.name) { nameInput.value = board.name; sizeName(); return; }
  remember();
  board.name = nameInput.value.trim() || "My taste";
  nameInput.value = board.name;
  sizeName();
  scheduleSave();
});
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") nameInput.dispatchEvent(new Event("change"));
  if (e.key === "Enter" || e.key === "Escape") nameInput.blur();
});
$("zoom-out").addEventListener("click", () => zoomAt(zoomNow() / 1.4, 0, 0, true));
$("zoom-in").addEventListener("click", () => zoomAt(zoomNow() * 1.4, 0, 0, true));
$("zoom-reset").addEventListener("click", () => zoomAt(1, 0, 0, true));
$("fit").addEventListener("click", () => go(fit()));
window.addEventListener("resize", () => ground.ask());

function backToBoard() {
  $("finished").hidden = true;
  stage.focus();
}
$("finished").addEventListener("click", (e) => { if (e.target === e.currentTarget) backToBoard(); });
$("finished-back").addEventListener("click", backToBoard);
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("finished").hidden) backToBoard(); });

finishButton.addEventListener("click", async () => {
  if (!board.items.length || uploads || sent) return;
  finishButton.disabled = true;
  status("Finishing…");
  try {
    document.activeElement?.blur();
    await saveNow();
    const result = await api("/api/finish", { method: "POST" });
    $("finished-path").textContent = `${result.folder}/SKILL.md`;
    const count = board.items.length;
    const groups = new Set(board.items.map((i) => i.group).filter(Boolean)).size;
    $("finished-count").textContent = `${count} ${count === 1 ? "reference" : "references"}${groups ? `, ${groups} ${groups === 1 ? "group" : "groups"}` : ""} on the board`;
    sent = true;
    finishButton.textContent = "Sent to your agent";
    finishButton.dataset.short = "Sent";
    render();
    $("finished").hidden = false;
    $("finished-back").focus();
  } catch (error) {
    status(error.message);
    render();
  }
});

/* ---------- opening ---------- */

async function load() {
  try {
    const result = await api("/api/board");
    board = { name: result.name, items: result.items };
    project = result.project;
    nameInput.value = board.name;
    sizeName();
    $("empty-project").textContent = project;
    loaded = true;
    render();
    if (result.recovered) say(`your old board couldn't be read. it's kept as ${result.recovered}`);
    // opened again after Finish: it was already sent, and what changes now is for next time
    if (result.sent) { sent = true; finishButton.textContent = "Sent to your agent"; finishButton.dataset.short = "Sent"; render(); }
    go(fit(), true);
    world.classList.add("placed");
    status(`Saved in ${project}`);
  } catch (error) {
    status(error.message);
  }
}
// the page is still open: the server closes itself some time after the last of these
setInterval(() => void fetch(endpoint("/api/ping"), { method: "POST" }).catch(() => {}), 60_000);

applyView();
void load();
