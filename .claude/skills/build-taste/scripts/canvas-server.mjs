#!/usr/bin/env node
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { createServer } from "node:http";
import { isIP } from "node:net";
import { unlinkSync } from "node:fs";
import { lstat, mkdir, readdir, readFile, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const at = args.indexOf(flag);
  return at < 0 ? fallback : args[at + 1];
};
const agent = value("--agent", "agents");
if (!['agents', 'claude'].includes(agent)) {
  console.error("Use --agent agents or --agent claude");
  process.exit(1);
}
const project = await realpath(resolve(value("--project", process.cwd()))).catch(() => null);
if (!project || !(await stat(project)).isDirectory()) {
  console.error("Choose an existing project folder with --project");
  process.exit(1);
}

const relativeSkill = agent === "claude" ? ".claude/skills/taste" : ".agents/skills/taste";
const skillDir = join(project, relativeSkill);
const boardDir = join(skillDir, "board");
const imagesDir = join(boardDir, "images");
let nextDir = project;
for (const part of [...relativeSkill.split("/"), "board", "images"]) {
  nextDir = join(nextDir, part);
  await mkdir(nextDir).catch((error) => { if (error.code !== "EEXIST") throw error; });
  const actual = await realpath(nextDir);
  if (!actual.startsWith(`${project}${sep}`)) {
    console.error("The taste folder must stay inside the chosen project.");
    process.exit(1);
  }
}

const skillFile = join(skillDir, "SKILL.md");
const jsonFile = join(boardDir, "board.json");
const markdownFile = join(boardDir, "BOARD.md");
try {
  await writeFile(skillFile, await readFile(join(assets, "starter-skill.md")), { flag: "wx" });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}

// After Finish, a quiet copy of this server takes over the same address so the open board keeps saving (see
// /api/finish). It is started with --after-finish and the session's token in TASTE_CANVAS_TOKEN.
const afterFinish = args.includes("--after-finish");
const token = afterFinish && process.env.TASTE_CANVAS_TOKEN ? process.env.TASTE_CANVAS_TOKEN : randomBytes(24).toString("hex");
const pidFile = join(tmpdir(), `build-taste-${createHash("sha1").update(skillDir).digest("hex").slice(0, 12)}.pid`);
// a board left open after an earlier Finish is closed, so two canvases never write to the same board
if (!afterFinish && process.platform !== "win32") {
  const earlier = Number(await readFile(pidFile, "utf8").catch(() => ""));
  // only if that process is still this canvas, for this project: a pid can be reused by anything
  const command = earlier && earlier !== process.pid ? spawnSync("ps", ["-p", String(earlier), "-o", "command="], { encoding: "utf8" }).stdout || "" : "";
  if (command.includes("canvas-server.mjs") && command.includes("--after-finish") && command.includes(project)) {
    try { process.kill(earlier, "SIGTERM"); } catch {}
  }
}
/**
 * How long the canvas waits without hearing from its page before it closes itself. The page says it's there once a
 * minute. A session the agent is waiting on says so on the way out, so the agent isn't left waiting for a Finish
 * that will never come; its board is saved either way.
 */
const IDLE = Number(process.env.TASTE_CANVAS_IDLE_MS) || 20 * 60 * 1000;
let idle;
const rest = () => {
  clearTimeout(idle);
  idle = setTimeout(() => {
    if (!afterFinish) console.log(`TASTE_CANVAS_CLOSED=${boardDir}`);
    process.exit(0);
  }, IDLE);
};

const mime = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml" };
const imagePath = (path) => typeof path === "string" && /^images\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}\.(png|jpg|webp|gif|avif|svg)$/.test(path) && !path.includes("..");
const plain = (text, max) => String(text ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const number = (n, fallback) => Number.isFinite(Number(n)) ? Math.max(-100000, Math.min(100000, Number(n))) : fallback;

function cleanItem(raw) {
  if (!raw || typeof raw !== "object") throw new Error("A reference is invalid.");
  const kind = raw.kind === "picture" ? "image" : raw.kind;
  if (!["image", "site", "note"].includes(kind)) throw new Error("An unknown reference type was sent.");
  const id = plain(raw.id, 64);
  if (!/^[a-zA-Z0-9-]{4,64}$/.test(id)) throw new Error("A reference has an invalid ID.");
  const file = imagePath(raw.file) ? raw.file : undefined;
  const url = plain(raw.url, 2048);
  if (kind === "site" && !/^https?:\/\//i.test(url)) throw new Error("Site links must start with http or https.");
  if (kind === "image" && !file) throw new Error("An image reference has no saved picture.");
  const at = raw.place ?? raw;
  return {
    id,
    kind,
    ...(file ? { file } : {}),
    ...(kind === "image" ? { name: plain(raw.name, 180) } : {}),
    ...(kind === "site" ? { url, title: plain(raw.title ?? raw.name, 180) } : {}),
    ...(kind === "note" ? { text: String(raw.text ?? "").slice(0, 3000) } : {}),
    ...(kind !== "note" ? { why: String(raw.why ?? "").slice(0, 1000) } : {}),
    group: plain(raw.group, 60).replace(/^#+\s*/, ""),
    added: /^\d{4}-\d{2}-\d{2}$/.test(raw.added) ? raw.added : new Date().toISOString().slice(0, 10),
    place: { x: number(at.x, 0), y: number(at.y, 0), w: number(at.w, kind === "image" ? 300 : 280), h: number(at.h, kind === "image" ? 260 : 210) },
  };
}

function cleanBoard(raw) {
  if (!raw || typeof raw !== "object") throw new Error("The board is invalid.");
  const incoming = raw.items ?? raw.things ?? [];
  if (!Array.isArray(incoming) || incoming.length > 300) throw new Error("The board has too many references.");
  const groups = new Map();
  if (Array.isArray(raw.groups)) {
    for (const group of raw.groups) {
      if (group?.by !== "hand" || !Array.isArray(group.things)) continue;
      for (const id of group.things) groups.set(id, plain(group.name, 60));
    }
  }
  const items = incoming.map((item) => cleanItem({ ...item, group: item.group ?? groups.get(item.id) }));
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error("References must have unique IDs.");
  return { name: plain(raw.name, 60) || "My taste", items };
}

/** Set when board.json couldn't be read on opening: it was kept under this name and the canvas started empty. */
let recovered = "";
async function loadBoard() {
  let text;
  try {
    text = await readFile(jsonFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { name: "My taste", items: [] };
    throw error;
  }
  try {
    return cleanBoard(JSON.parse(text));
  } catch {
    const aside = `board.unreadable-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    await rename(jsonFile, join(boardDir, aside));
    recovered = `board/${aside}`;
    return { name: "My taste", items: [] };
  }
}

const quote = (text) => `“${plain(text, 3000).replace(/“|”/g, "'")}”`;
/** A note in the person's words, its lines kept: the first after the dash, the rest indented under it. */
const quoteLines = (text) => {
  const lines = String(text ?? "").slice(0, 3000).replace(/\r/g, "").split("\n").map((l) => l.replace(/\t/g, " ").trim().replace(/“|”/g, "'")).filter(Boolean);
  return `“${lines.join("\n    ")}”`;
};
function buildMarkdown(board) {
  const grouped = new Map();
  for (const item of board.items) {
    const group = item.group || "";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(item);
  }
  const line = (item) => {
    const head = item.kind === "note"
      ? `- \`${item.id}\` note: ${quoteLines(item.text)}`
      : item.kind === "site"
        ? `- \`${item.id}\` site · ${item.url}${item.title ? ` · ${plain(item.title, 180)}` : ""}${item.file ? ` · picture: ${item.file}` : ""}`
        : `- \`${item.id}\` picture · ${item.file}${item.name ? ` · ${plain(item.name, 180)}` : ""}`;
    return item.why ? `${head}\n  why: ${quote(item.why)}` : head;
  };
  // groups first, by name; the things in no group last, under a heading no group can have
  const order = [...grouped].sort(([a], [b]) => (a === "") - (b === ""));
  const sections = order.map(([group, items]) => `## ${group ? `Group: ${group}` : "Not in a group"}\n\n${items.map(line).join("\n")}`);
  return `# ${board.name}\n\n${board.items.length} ${board.items.length === 1 ? "reference" : "references"}. Written ${new Date().toISOString().slice(0, 10)}.\n\nA group name (after “Group:”), every note and every “why” line are the person's own words. Images are in board/images/. Places are in board.json.\n\n${sections.join("\n\n") || "_The board is empty._"}\n`;
}

async function atomicWrite(path, content) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}

let saveQueue = Promise.resolve();
function saveBoard(board) {
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    const groups = [...new Set(board.items.map((item) => item.group).filter(Boolean))].map((name) => ({ name, by: "hand", things: board.items.filter((item) => item.group === name).map((item) => item.id) }));
    const data = { version: 1, name: board.name, written: new Date().toISOString(), groups, things: board.items };
    await atomicWrite(jsonFile, `${JSON.stringify(data, null, 2)}\n`);
    await atomicWrite(markdownFile, buildMarkdown(board));
  });
  return saveQueue;
}

// A site's title and picture, read from the page's own head. The picture is kept in the project beside the others,
// so the agent can look at it. http(s) only, 6 seconds, 600 KB of page and 8 MB of picture at most.
const decodeEntities = (text) => text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, " ").trim();
/**
 * Where a link preview may go: the public internet, or this computer (so a person can keep their own dev site). Not
 * other machines on their network, link-local or cloud metadata addresses, which a pasted link could otherwise reach.
 */
function reachable(address) {
  const v = isIP(address);
  if (v === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 127) return true;
    return !(a === 0 || a === 10 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224);
  }
  if (v === 6) {
    const lower = address.toLowerCase();
    if (lower === "::1") return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return reachable(mapped[1]);
    return !(lower === "::" || /^(fc|fd|fe[89ab]|ff)/.test(lower));
  }
  return false;
}
async function allowedUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost") return url;
  if (isIP(host)) return reachable(host) ? url : null;
  try {
    const found = await lookup(host, { all: true });
    return found.length && found.every((f) => reachable(f.address)) ? url : null;
  } catch {
    return null;
  }
}
/** Fetches a link preview's page or picture, following redirects by hand so every hop is checked. */
async function fetchUpTo(address, accept, max) {
  const signal = AbortSignal.timeout(6000);
  let next = address;
  let response = null;
  for (let hop = 0; hop <= 4 && next; hop++) {
    const url = await allowedUrl(next);
    if (!url) return null;
    response = await fetch(url, { headers: { accept, "user-agent": "Mozilla/5.0 (Build Taste; local canvas)" }, redirect: "manual", signal });
    if (response.status >= 300 && response.status < 400) {
      const to = response.headers.get("location");
      await response.body?.cancel().catch(() => {});
      next = to ? new URL(to, url).href : null;
      response = null;
      continue;
    }
    break;
  }
  if (!response || !response.ok || !response.body) return null;
  const parts = [];
  let size = 0;
  for await (const part of response.body) {
    size += part.length;
    parts.push(part);
    if (size > max) { if (accept.startsWith("image")) return null; break; }
  }
  return { response, bytes: Buffer.concat(parts) };
}
async function unfurl(address) {
  if (!/^https?:\/\//i.test(address)) return {};
  const page = await fetchUpTo(address, "text/html,application/xhtml+xml", 600_000).catch(() => null);
  if (!page || !(page.response.headers.get("content-type") || "").includes("html")) return {};
  const head = page.bytes.toString("utf8").split(/<\/head>/i)[0];
  const meta = [...head.matchAll(/<meta\b([^>]*)>/gi)].map(([, attrs]) => Object.fromEntries([...attrs.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)].map((m) => [m[1].toLowerCase(), decodeEntities(m[3] ?? m[4] ?? "")])));
  const pick = (...names) => meta.find((m) => names.includes(m.property) || names.includes(m.name))?.content;
  const title = plain(pick("og:title", "twitter:title") || decodeEntities(head.match(/<title[^>]*>([^<]*)/i)?.[1] || ""), 180);
  const image = pick("og:image", "og:image:url", "twitter:image");
  if (!image) return { title };
  try {
    const picture = await fetchUpTo(new URL(image, page.response.url || address).href, "image/*", 8 * 1024 * 1024);
    const type = (picture?.response.headers.get("content-type") || "").split(";")[0];
    const ext = Object.entries(mime).find(([key, value]) => value === type && key !== "svg")?.[0];
    if (!ext || !picture.bytes.length) return { title };
    const file = `${randomUUID()}.${ext}`;
    await writeFile(join(imagesDir, file), picture.bytes, { flag: "wx" });
    return { title, file: `images/${file}` };
  } catch {
    return { title };
  }
}

function send(response, status, body, type = "text/plain; charset=utf-8", extra = {}) {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    ...extra,
  });
  response.end(body);
}
const json = (response, status, value) => send(response, status, JSON.stringify(value), "application/json; charset=utf-8");
async function bodyOf(request, max) {
  let size = 0;
  const parts = [];
  for await (const part of request) {
    size += part.length;
    if (size > max) throw Object.assign(new Error("This upload is too large."), { status: 413 });
    parts.push(part);
  }
  return Buffer.concat(parts);
}

// Pictures nothing on the board points to (taken off in an earlier session) are cleared when a session opens, so the
// agent only ever sees what's on the board. Undo can't reach an earlier session, so nothing it needs is lost.
if (!afterFinish) {
  const board = await loadBoard().catch(() => null);
  if (board) {
    const kept = new Set(board.items.map((item) => item.file).filter(Boolean).map((file) => file.split("/").at(-1)));
    for (const name of await readdir(imagesDir).catch(() => [])) {
      if (imagePath(`images/${name}`) && !kept.has(name)) await unlink(join(imagesDir, name)).catch(() => {});
    }
  }
}

const html = await readFile(join(assets, "canvas.html"), "utf8");
const css = await readFile(join(assets, "canvas.css"), "utf8");
const fonts = { "public-sans.woff2": await readFile(join(assets, "fonts", "public-sans.woff2")), "caveat.woff2": await readFile(join(assets, "fonts", "caveat.woff2")) };
const script = await readFile(join(assets, "canvas.js"), "utf8");
let finished = false;
let origin = "";
const server = createServer((request, response) => {
  (async () => {
    const url = new URL(request.url, origin);
    if (url.searchParams.get("token") !== token) return send(response, 403, "This canvas link is invalid.");
    if (request.method !== "GET" && request.headers.origin !== origin) return send(response, 403, "Invalid origin.");
    if (finished && request.method !== "GET") return send(response, 409, "This canvas session has finished.");
    rest();

    if (request.method === "GET" && url.pathname === "/") return send(response, 200, html.replaceAll("__TOKEN__", token), "text/html; charset=utf-8");
    if (request.method === "GET" && url.pathname === "/canvas.css") return send(response, 200, css.replaceAll("__TOKEN__", token), "text/css; charset=utf-8");
    if (request.method === "GET" && url.pathname.startsWith("/fonts/") && fonts[url.pathname.slice(7)]) return send(response, 200, fonts[url.pathname.slice(7)], "font/woff2");
    if (request.method === "GET" && url.pathname === "/canvas.js") return send(response, 200, script, "text/javascript; charset=utf-8");
    if (request.method === "GET" && url.pathname === "/api/board") return json(response, 200, { ...(await loadBoard()), folder: relativeSkill, project: basename(project), ...(recovered ? { recovered } : {}), ...(afterFinish ? { sent: true } : {}) });
    if (request.method === "POST" && url.pathname === "/api/ping") return json(response, 200, { ok: true });

    if (request.method === "GET" && url.pathname.startsWith("/api/image/")) {
      const file = decodeURIComponent(url.pathname.slice("/api/image/".length));
      if (!imagePath(`images/${file}`)) return send(response, 404, "Image not found.");
      const path = join(imagesDir, file);
      const safe = await lstat(path).then((item) => item.isFile() && !item.isSymbolicLink()).catch(() => false);
      const contents = safe ? await readFile(path).catch(() => null) : null;
      const ext = file.split(".").at(-1);
      return contents ? send(response, 200, contents, mime[ext], ext === "svg" ? { "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:" } : {}) : send(response, 404, "Image not found.");
    }
    if (request.method === "POST" && url.pathname === "/api/image") {
      const type = plain(request.headers["content-type"], 100).split(";")[0];
      const ext = Object.entries(mime).find(([, value]) => value === type)?.[0];
      if (!ext) return json(response, 415, { error: "Paste a PNG, JPEG, WebP, GIF, AVIF, or SVG image." });
      const data = await bodyOf(request, 12 * 1024 * 1024);
      if (!data.length) return json(response, 400, { error: "The image is empty." });
      const file = `${randomUUID()}.${ext}`;
      await writeFile(join(imagesDir, file), data, { flag: "wx" });
      return json(response, 201, { file: `images/${file}` });
    }
    if (request.method === "POST" && url.pathname === "/api/unfurl") {
      const { url: wanted } = JSON.parse((await bodyOf(request, 8 * 1024)).toString("utf8"));
      return json(response, 200, await unfurl(plain(wanted, 2048)));
    }
    if (request.method === "POST" && url.pathname === "/api/board") {
      const board = cleanBoard(JSON.parse((await bodyOf(request, 1024 * 1024)).toString("utf8")));
      await saveBoard(board);
      return json(response, 200, { saved: true, count: board.items.length });
    }
    if (request.method === "POST" && url.pathname === "/api/finish") {
      await saveQueue;
      const board = await loadBoard();
      if (!board.items.length) return json(response, 400, { error: "Add a reference before finishing." });
      // already handed over: nobody is listening for a second Finish
      if (afterFinish) return json(response, 200, { finished: true, folder: relativeSkill });
      finished = true;
      json(response, 200, { finished: true, folder: relativeSkill });
      console.log(`TASTE_BOARD_READY=${boardDir}`);
      // The agent is waiting for this process to end, so it does. A detached copy picks up the same address and
      // token, so the board stays open and keeps saving into the project until it's idle for 20 minutes.
      const port = server.address().port;
      setTimeout(() => {
        server.closeAllConnections();
        server.close(() => {
          const keep = spawn(process.execPath, [fileURLToPath(import.meta.url), "--project", project, "--agent", agent, "--after-finish", "--port", String(port), "--no-open"], { detached: true, stdio: "ignore", env: { ...process.env, TASTE_CANVAS_TOKEN: token } });
          keep.unref();
          process.exit(0);
        });
      }, 400);
      return;
    }
    send(response, 404, "Not found.");
  })().catch((error) => {
    const status = error.status || (error.code === "ENOENT" ? 404 : 400);
    // a refused upload's unread rest would spoil the next request on this connection: close it instead
    if (status === 413) response.setHeader("Connection", "close");
    // a JSON parse error means a broken request, not something the person did
    json(response, status, { error: error instanceof SyntaxError ? "That change couldn't be read. Try again." : error.message || "Could not save this reference." });
  });
});

function listen(attempt = 0) {
  server.once("error", (error) => {
    // the session's own address is let go a moment before the copy takes it
    if (afterFinish && error.code === "EADDRINUSE" && attempt < 20) return setTimeout(() => listen(attempt + 1), 100);
    throw error;
  });
  server.listen(afterFinish ? Number(value("--port", 0)) : 0, "127.0.0.1", started);
}
listen();
process.on("exit", () => {
  if (afterFinish) { try { unlinkSync(pidFile); } catch {} }
});
process.on("SIGTERM", () => process.exit(0));

function started() {
  origin = `http://127.0.0.1:${server.address().port}`;
  if (afterFinish) {
    void writeFile(pidFile, String(process.pid));
    rest();
    return;
  }
  rest();
  const link = `${origin}/?token=${token}`;
  console.log(`TASTE_CANVAS_URL=${link}`);
  console.log(`TASTE_FOLDER=${skillDir}`);
  if (!args.includes("--no-open")) {
    const platform = process.platform;
    const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
    const commandArgs = platform === "win32" ? ["/c", "start", "", link] : [link];
    const child = spawn(command, commandArgs, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
  }
}
