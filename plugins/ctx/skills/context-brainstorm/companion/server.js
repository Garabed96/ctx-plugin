#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const screenDir =
  args.find((_, i) => args[i - 1] === "--dir") || process.env.SCREEN_DIR;
const port = parseInt(args.find((_, i) => args[i - 1] === "--port") || "52341");

if (!screenDir) {
  console.error("Usage: server.js --dir <screen_dir> [--port <port>]");
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

const server = http.createServer((req, res) => {
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
});

server.listen(port, () => {
  const info = { port, url: `http://localhost:${port}`, screen_dir: screenDir };
  fs.writeFileSync(path.join(screenDir, ".server-info"), JSON.stringify(info));
  console.log(JSON.stringify(info));
});

// Auto-refresh: watch for new files, connected clients poll via meta refresh
process.on("SIGTERM", () => {
  fs.writeFileSync(path.join(screenDir, ".server-stopped"), "");
  process.exit(0);
});
