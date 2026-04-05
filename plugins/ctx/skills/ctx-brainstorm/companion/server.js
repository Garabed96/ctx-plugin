#!/usr/bin/env node
const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// ========== WebSocket Protocol (RFC 6455) ==========
// Ported from superpowers/brainstorming/scripts/server.cjs

const OPCODES = { TEXT: 0x01, CLOSE: 0x08, PING: 0x09, PONG: 0x0a };
const WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function computeAcceptKey(clientKey) {
  return crypto.createHash("sha1").update(clientKey + WS_MAGIC).digest("base64");
}

function encodeFrame(opcode, payload) {
  const fin = 0x80;
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = fin | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = fin | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = fin | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeFrame(buffer) {
  if (buffer.length < 2) return null;
  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) !== 0;
  let payloadLen = buffer[1] & 0x7f;
  let offset = 2;
  if (!masked) throw new Error("Client frames must be masked");
  if (payloadLen === 126) {
    if (buffer.length < 4) return null;
    payloadLen = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buffer.length < 10) return null;
    payloadLen = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  const dataOffset = offset + 4;
  const totalLen = dataOffset + payloadLen;
  if (buffer.length < totalLen) return null;
  const mask = buffer.slice(offset, dataOffset);
  const data = Buffer.alloc(payloadLen);
  for (let i = 0; i < payloadLen; i++) {
    data[i] = buffer[dataOffset + i] ^ mask[i % 4];
  }
  return { opcode, payload: data, bytesConsumed: totalLen };
}

// ========== Configuration ==========

const args = process.argv.slice(2);
const screenDir =
  args.find((_, i) => args[i - 1] === "--dir") || process.env.SCREEN_DIR;
const port = parseInt(args.find((_, i) => args[i - 1] === "--port") || "52341");
const projectDir = args.find((_, i) => args[i - 1] === "--project-dir") || "";

if (!screenDir) {
  console.error("Usage: server.js --dir <screen_dir> [--port <port>] [--project-dir <path>]");
  process.exit(1);
}

fs.mkdirSync(screenDir, { recursive: true });

const frameTemplate = fs.readFileSync(
  path.join(__dirname, "frame-template.html"),
  "utf8"
);

// ========== Config Loader ==========

let config = null;
if (projectDir) {
  const configPath = path.join(projectDir, "companion.config.js");
  if (fs.existsSync(configPath)) {
    try {
      config = require(configPath);
      const required = ["discover", "iterate", "preview"];
      const missing = required.filter(fn => typeof config[fn] !== "function");
      if (missing.length > 0) {
        console.error("[companion] Config missing: " + missing.join(", "));
        config = null;
      } else {
        console.error("[companion] Loaded config from " + configPath);
      }
    } catch (err) {
      console.error("[companion] Config load failed:", err.message);
    }
  } else {
    console.error("[companion] No companion.config.js — copy-only mode");
  }
}

// ========== WebSocket ==========

const clients = new Set();

function handleUpgrade(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) { socket.destroy(); return; }

  const accept = computeAcceptKey(key);
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
    "Upgrade: websocket\r\n" +
    "Connection: Upgrade\r\n" +
    "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
  );

  let buffer = Buffer.alloc(0);
  clients.add(socket);

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length > 0) {
      let result;
      try {
        result = decodeFrame(buffer);
      } catch (e) {
        socket.end(encodeFrame(OPCODES.CLOSE, Buffer.alloc(0)));
        clients.delete(socket);
        return;
      }
      if (!result) break;
      buffer = buffer.slice(result.bytesConsumed);

      switch (result.opcode) {
        case OPCODES.TEXT:
          handleMessage(result.payload.toString());
          break;
        case OPCODES.CLOSE:
          socket.end(encodeFrame(OPCODES.CLOSE, Buffer.alloc(0)));
          clients.delete(socket);
          return;
        case OPCODES.PING:
          socket.write(encodeFrame(OPCODES.PONG, result.payload));
          break;
        case OPCODES.PONG:
          break;
        default:
          socket.end(encodeFrame(OPCODES.CLOSE, Buffer.alloc(0)));
          clients.delete(socket);
          return;
      }
    }
  });

  socket.on("close", () => clients.delete(socket));
  socket.on("error", () => clients.delete(socket));
}

function handleMessage(text) {
  let event;
  try { event = JSON.parse(text); } catch { return; }
  if (event.type) {
    const eventsFile = path.join(screenDir, ".events");
    fs.appendFileSync(eventsFile, JSON.stringify(event) + "\n");
  }
}

function broadcast(msg) {
  const frame = encodeFrame(OPCODES.TEXT, Buffer.from(JSON.stringify(msg)));
  for (const socket of clients) {
    try { socket.write(frame); } catch { clients.delete(socket); }
  }
}

// ========== File Watching ==========

const knownFiles = new Set(
  fs.readdirSync(screenDir).filter(f => f.endsWith(".html"))
);
const debounceTimers = new Map();

fs.watch(screenDir, (eventType, filename) => {
  if (!filename || !filename.endsWith(".html")) return;

  if (debounceTimers.has(filename)) clearTimeout(debounceTimers.get(filename));
  debounceTimers.set(filename, setTimeout(() => {
    debounceTimers.delete(filename);
    const filePath = path.join(screenDir, filename);
    if (!fs.existsSync(filePath)) return;

    if (!knownFiles.has(filename)) {
      knownFiles.add(filename);
      // Clear events when a new screen is pushed
      const eventsFile = path.join(screenDir, ".events");
      if (fs.existsSync(eventsFile)) fs.unlinkSync(eventsFile);
    }

    broadcast({ type: "reload" });
  }, 100));
});

if (projectDir) {
  const pagesDir = path.join(projectDir, "companion/pages");
  fs.mkdirSync(pagesDir, { recursive: true });
  fs.watch(pagesDir, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith(".html")) return;
    const key = "pages:" + filename;
    if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key));
    debounceTimers.set(key, setTimeout(() => {
      debounceTimers.delete(key);
      broadcast({ type: "reload" });
    }, 100));
  });
}

// ========== Style Profile ==========

let _styleProfileCache = null;

function readStyleProfile() {
  if (!projectDir) return null;
  if (_styleProfileCache !== null) return _styleProfileCache;

  const profilePath = path.join(projectDir, "companion/style-profile.json");
  if (!fs.existsSync(profilePath)) return null;

  try {
    _styleProfileCache = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  } catch {
    _styleProfileCache = null;
  }

  try {
    fs.watch(profilePath, () => {
      _styleProfileCache = null;
    });
  } catch {
    // If watching fails, cache will persist until restart — acceptable degradation
  }

  return _styleProfileCache;
}

function buildInjectionStyle(profile) {
  const vars = [];

  const c = profile.colors || {};
  if (c.primary     != null) vars.push(`  --cp-primary: ${c.primary};`);
  if (c.secondary   != null) vars.push(`  --cp-secondary: ${c.secondary};`);
  if (c.accent      != null) vars.push(`  --cp-accent: ${c.accent};`);
  if (c.background  != null) vars.push(`  --cp-bg: ${c.background};`);
  if (c.foreground  != null) vars.push(`  --cp-fg: ${c.foreground};`);
  if (c.muted       != null) vars.push(`  --cp-muted: ${c.muted};`);
  if (c.destructive != null) vars.push(`  --cp-destructive: ${c.destructive};`);
  if (c.border      != null) vars.push(`  --cp-border: ${c.border};`);
  if (c.card        != null) vars.push(`  --cp-card: ${c.card};`);
  if (c.ring        != null) vars.push(`  --cp-ring: ${c.ring};`);

  const t = profile.typography || {};
  // Map display/sans to --cp-font-sans (display is the primary heading font)
  const primaryFont = t.display || t.sans;
  if (primaryFont != null) vars.push(`  --cp-font-sans: ${primaryFont};`);
  if (t.mono != null) vars.push(`  --cp-font-mono: ${t.mono};`);

  const r = (profile.spacing || {}).radius || {};
  if (r.sm != null) vars.push(`  --cp-radius-sm: ${r.sm};`);
  if (r.md != null) vars.push(`  --cp-radius-md: ${r.md};`);
  if (r.lg != null) vars.push(`  --cp-radius-lg: ${r.lg};`);

  const unit = (profile.spacing || {}).unit;
  if (unit != null) vars.push(`  --cp-spacing: ${unit};`);

  if (vars.length === 0) return "";

  // Base stylesheet: declares --cp-* vars AND applies them to common elements.
  // Uses !important so factory controls always override prototype styles.
  // Also disables DarkReader inside prototypes via meta + attribute.
  const baseStyles = `
<meta name="darkreader-lock">
<style id="cp-base">
:root {
${vars.join("\n")}
}
/* ---- Companion base layer ---- */
/* !important ensures factory sidebar controls always take effect. */
body {
  font-family: var(--cp-font-sans, system-ui, sans-serif) !important;
  color: var(--cp-fg) !important;
  background: var(--cp-bg) !important;
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--cp-font-sans, inherit) !important;
}
p, li, td, th, label, span, div {
  color: inherit;
}
a:not([class]) { color: var(--cp-primary) !important; }
code, pre, kbd, samp {
  font-family: var(--cp-font-mono, monospace) !important;
}
button, [role="button"] {
  border-radius: var(--cp-radius-md, 0.375rem) !important;
}
input, textarea, select {
  border-radius: var(--cp-radius-md, 0.375rem) !important;
}
::selection {
  background: var(--cp-primary, highlight);
  color: var(--cp-bg, highlighttext);
}
</style>
<script>
// Companion click-to-select: elements with data-option become clickable.
// Clicking posts selection to the factory parent frame.
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-option]');
  if (!el) return;
  var value = el.getAttribute('data-option');
  var label = el.getAttribute('data-label') || value;
  // Visual feedback
  document.querySelectorAll('[data-option]').forEach(function(o) {
    o.style.outline = '';
    o.style.outlineOffset = '';
  });
  el.style.outline = '2px solid var(--cp-primary, #1eb3b8)';
  el.style.outlineOffset = '2px';
  // Notify factory
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'option-select', value: value, label: label }, '*');
  }
});
</script>`;
  return baseStyles;
}

// ========== HTTP Routes ==========

function newestHtml() {
  const files = fs
    .readdirSync(screenDir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(screenDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.name;
}

function servePlayground(res) {
  const playgroundPath = path.join(__dirname, "playground.html");
  if (!fs.existsSync(playgroundPath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("playground.html not found");
    return;
  }
  const content = fs.readFileSync(playgroundPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(content);
}

function serveFactory(res) {
  const factoryPath = path.join(__dirname, "factory.html");
  if (!fs.existsSync(factoryPath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("factory.html not found");
    return;
  }
  const content = fs.readFileSync(factoryPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(content);
}

function servePrototype(res, filePath) {
  if (!projectDir) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("No --project-dir configured");
    return;
  }
  const resolved = path.resolve(projectDir, "companion/pages", filePath);
  if (!resolved.startsWith(path.resolve(projectDir, "companion/pages"))) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(resolved)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Prototype not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(resolved, "utf8");

  const profile = readStyleProfile();
  if (profile) {
    const styleBlock = buildInjectionStyle(profile);
    if (styleBlock) {
      if (content.includes("<head>")) {
        content = content.replace("<head>", "<head>\n" + styleBlock);
      } else {
        content = styleBlock + "\n" + content;
      }
    }
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(content);
}

function serveBrainstorm(res) {
  const file = newestHtml();
  if (!file) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      frameTemplate.replace(
        "{{CONTENT}}",
        '<div class="waiting">Waiting for content...</div>'
      )
    );
    return;
  }
  const content = fs.readFileSync(path.join(screenDir, file), "utf8");
  const isFullDoc = content.trimStart().startsWith("<!DOCTYPE") || content.trimStart().startsWith("<html");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(isFullDoc ? content : frameTemplate.replace("{{CONTENT}}", content));
}

// ========== Slot Scanner ==========

function scanSlots() {
  if (!projectDir) return [];
  const prototypesDir = path.join(projectDir, "companion/pages");
  if (!fs.existsSync(prototypesDir)) return [];

  const slots = new Map();

  function scan(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        scan(path.join(dir, entry.name), prefix ? prefix + "/" + entry.name : entry.name);
      } else if (entry.name.endsWith(".html")) {
        const slotName = prefix || "root";
        const filePath = prefix ? prefix + "/" + entry.name : entry.name;
        const baseName = entry.name.replace(/\.html$/, "");

        // Parse version: name-v2 → "v2", name-v2-bold → "v2-bold", name → "v1"
        const vMatch = baseName.match(/-v(\d+.*)$/);
        const label = vMatch ? "v" + vMatch[1] : "v1";
        const slug = slotName + "--" + baseName;

        if (!slots.has(slotName)) slots.set(slotName, []);
        slots.get(slotName).push({ slug, label, file: filePath });
      }
    }
  }

  scan(prototypesDir, "");

  // Sort iterations within each slot by version number
  const result = [];
  for (const [slot, iterations] of slots) {
    iterations.sort((a, b) => {
      const aNum = parseInt((a.label.match(/\d+/) || ["0"])[0]);
      const bNum = parseInt((b.label.match(/\d+/) || ["0"])[0]);
      return aNum - bNum;
    });
    result.push({ slot, iterations });
  }
  result.sort((a, b) => a.slot.localeCompare(b.slot));
  return result;
}

// ========== Auto-Versioning ==========

function nextVersionPath(page) {
  const pagesDir = path.join(projectDir, "companion/pages", page);
  fs.mkdirSync(pagesDir, { recursive: true });
  const existing = fs.readdirSync(pagesDir).filter(f => f.endsWith(".html"));
  let maxVersion = 0;
  for (const f of existing) {
    const m = f.match(/-v(\d+)/);
    if (m) maxVersion = Math.max(maxVersion, parseInt(m[1]));
  }
  const next = maxVersion + 1;
  return {
    filePath: path.join(pagesDir, `${page}-v${next}.html`),
    relativePath: `${page}/${page}-v${next}.html`,
    version: `v${next}`,
  };
}

// ========== API Routes ==========

const serverState = { target: null, version: null, iterating: false };

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve(null); }
    });
  });
}

function jsonResponse(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function handleDiscover(req, res) {
  if (config) {
    try {
      const items = await config.discover();
      jsonResponse(res, 200, items);
    } catch (err) {
      jsonResponse(res, 500, { error: err.message });
    }
  } else if (projectDir) {
    const prototypesDir = path.join(projectDir, "prototypes");
    if (!fs.existsSync(prototypesDir)) {
      jsonResponse(res, 200, []);
      return;
    }
    const files = fs.readdirSync(prototypesDir).filter(f => f.endsWith(".html"));
    jsonResponse(res, 200, files.map(f => ({
      id: f.replace(/\.html$/, ""),
      label: f.replace(/\.html$/, ""),
      path: f,
    })));
  } else {
    jsonResponse(res, 200, []);
  }
}

async function handleIterate(req, res) {
  if (!config) {
    jsonResponse(res, 400, { error: "No companion.config.js — copy-only mode" });
    return;
  }
  const body = await readBody(req);
  if (!body || !body.prompt || !body.target) {
    jsonResponse(res, 400, { error: "Missing prompt or target" });
    return;
  }

  serverState.iterating = true;
  serverState.target = body.target;

  try {
    const result = await config.iterate(body.prompt, body.target);
    serverState.version = result.newId || result.newPath;
    serverState.iterating = false;
    broadcast({ type: "reload" });
    jsonResponse(res, 200, result);
  } catch (err) {
    serverState.iterating = false;
    jsonResponse(res, 500, { error: err.message });
  }
}

function handleStatus(req, res) {
  jsonResponse(res, 200, {
    ...serverState,
    hasConfig: !!config,
  });
}

async function handleWrite(req, res) {
  if (!projectDir) {
    jsonResponse(res, 400, { error: "No --project-dir configured" });
    return;
  }
  const body = await readBody(req);
  if (!body || !body.page || !body.content) {
    jsonResponse(res, 400, { error: "Missing page or content" });
    return;
  }
  const page = body.page.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!page) {
    jsonResponse(res, 400, { error: "Invalid page name" });
    return;
  }
  const { filePath, relativePath, version } = nextVersionPath(page);
  fs.writeFileSync(filePath, body.content);
  jsonResponse(res, 200, { file: relativePath, version });
}

async function handleCompare(req, res) {
  const body = await readBody(req);
  if (!body || !Array.isArray(body.slugs) || body.slugs.length < 2) {
    jsonResponse(res, 400, { error: "Need slugs array with 2+ items" });
    return;
  }
  // Resolve slugs to file paths using scanSlots
  const slots = scanSlots();
  const allIterations = slots.flatMap(s => s.iterations);
  const resolved = body.slugs.map(slug => {
    const found = allIterations.find(i => i.slug === slug);
    return found ? { slug, file: found.file, label: found.label } : { slug, file: null, label: slug };
  });
  broadcast({ type: "compare", items: resolved });
  jsonResponse(res, 200, { ok: true, items: resolved });
}

// ========== Server ==========

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, "http://localhost");

  if (parsed.pathname === "/api/discover") {
    handleDiscover(req, res);
  } else if (parsed.pathname === "/api/iterate" && req.method === "POST") {
    handleIterate(req, res);
  } else if (parsed.pathname === "/api/status") {
    handleStatus(req, res);
  } else if (parsed.pathname === "/playground") {
    servePlayground(res);
  } else if (parsed.pathname === "/prototype" && parsed.searchParams.get("file")) {
    servePrototype(res, parsed.searchParams.get("file"));
  } else if (parsed.pathname === "/api/slots") {
    jsonResponse(res, 200, scanSlots());
  } else if (parsed.pathname === "/api/write" && req.method === "POST") {
    handleWrite(req, res);
  } else if (parsed.pathname === "/api/compare" && req.method === "POST") {
    handleCompare(req, res);
  } else if (parsed.pathname === "/api/style-profile") {
    const profile = readStyleProfile();
    if (profile === null) {
      jsonResponse(res, 404, { error: "No style profile found" });
    } else {
      jsonResponse(res, 200, profile);
    }
  } else if (parsed.pathname === "/api/scan" && req.method === "POST") {
    if (!projectDir) {
      jsonResponse(res, 400, { error: "No --project-dir configured" });
    } else {
      const { execFile } = require("child_process");
      const scanScript = path.join(__dirname, "cli/scan-styles.js");
      execFile(process.execPath, [scanScript, "--project-dir", projectDir], (err, stdout, stderr) => {
        if (err) {
          jsonResponse(res, 500, { error: err.message, stderr });
        } else {
          // Bust the cache so readStyleProfile() re-reads from disk
          _styleProfileCache = null;
          const newProfile = readStyleProfile();
          if (newProfile === null) {
            jsonResponse(res, 404, { error: "No style profile found after scan" });
          } else {
            jsonResponse(res, 200, newProfile);
          }
        }
      });
    }
  } else if (parsed.pathname === "/factory") {
    serveFactory(res);
  } else {
    serveBrainstorm(res);
  }
});

server.on("upgrade", handleUpgrade);

server.listen(port, () => {
  const info = { port, url: `http://localhost:${port}`, screen_dir: screenDir };
  fs.writeFileSync(path.join(screenDir, ".server-info"), JSON.stringify(info));
  console.log(JSON.stringify(info));
});

process.on("SIGTERM", () => {
  fs.writeFileSync(path.join(screenDir, ".server-stopped"), "");
  process.exit(0);
});
