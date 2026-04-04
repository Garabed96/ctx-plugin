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

// ========== Tinker Context ==========

const TINKER_DEFAULTS = {
  layout: "single-column", density: "balanced", heroStyle: "minimal",
  navStyle: "top-bar", sectionCount: 4, contentTone: "clinical",
  colorScheme: "dark", viewport: "desktop", spacingScale: 1.0, borderRadius: 8,
};

function readLatestTinkerState() {
  const eventsFile = path.join(screenDir, ".events");
  if (!fs.existsSync(eventsFile)) return null;
  const lines = fs.readFileSync(eventsFile, "utf8").trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const event = JSON.parse(lines[i]);
      if (event.type === "tinker") return event.state;
    } catch { continue; }
  }
  return null;
}

function buildTinkerPrompt(state) {
  if (!state) return "";
  const parts = [];
  if (state.layout !== TINKER_DEFAULTS.layout)
    parts.push(state.layout.replace(/-/g, " ") + " layout");
  if (state.density !== TINKER_DEFAULTS.density)
    parts.push(state.density + " density");
  if (state.heroStyle !== TINKER_DEFAULTS.heroStyle)
    parts.push(state.heroStyle + " hero style");
  if (state.navStyle !== TINKER_DEFAULTS.navStyle)
    parts.push(state.navStyle.replace(/-/g, " ") + " navigation");
  if (state.sectionCount !== TINKER_DEFAULTS.sectionCount)
    parts.push(state.sectionCount + " sections");
  if (state.contentTone !== TINKER_DEFAULTS.contentTone)
    parts.push(state.contentTone + " content tone");
  if (state.colorScheme !== TINKER_DEFAULTS.colorScheme)
    parts.push(state.colorScheme + " color scheme");
  if (state.viewport !== TINKER_DEFAULTS.viewport)
    parts.push("optimized for " + state.viewport + " viewport");
  if (state.spacingScale !== TINKER_DEFAULTS.spacingScale)
    parts.push(state.spacingScale.toFixed(1) + "x spacing");
  if (state.borderRadius !== TINKER_DEFAULTS.borderRadius)
    parts.push(state.borderRadius + "px border radius");
  return parts.length > 0 ? "Use " + parts.join(", ") + "." : "";
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
  const resolved = path.resolve(projectDir, "prototypes", filePath);
  if (!resolved.startsWith(path.resolve(projectDir, "prototypes"))) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(resolved)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Prototype not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(resolved, "utf8");
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
  const prototypesDir = path.join(projectDir, "prototypes");
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

  const tinkerState = readLatestTinkerState();
  const tinkerPrompt = buildTinkerPrompt(tinkerState);
  const mergedPrompt = tinkerPrompt
    ? tinkerPrompt + " " + body.prompt
    : body.prompt;

  serverState.iterating = true;
  serverState.target = body.target;

  try {
    const result = await config.iterate(mergedPrompt, body.target);
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
  } else if (parsed.pathname === "/api/compare" && req.method === "POST") {
    handleCompare(req, res);
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
