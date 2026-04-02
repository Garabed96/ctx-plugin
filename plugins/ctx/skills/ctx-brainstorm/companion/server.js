#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

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

function servePrototype(res, filePath) {
  if (!projectDir) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("No --project-dir configured");
    return;
  }
  // Prevent path traversal
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

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === "/playground") {
    servePlayground(res);
  } else if (parsed.pathname === "/prototype" && parsed.query.file) {
    servePrototype(res, parsed.query.file);
  } else {
    serveBrainstorm(res);
  }
});

server.listen(port, () => {
  const info = { port, url: `http://localhost:${port}`, screen_dir: screenDir };
  fs.writeFileSync(path.join(screenDir, ".server-info"), JSON.stringify(info));
  console.log(JSON.stringify(info));
});

process.on("SIGTERM", () => {
  fs.writeFileSync(path.join(screenDir, ".server-stopped"), "");
  process.exit(0);
});
