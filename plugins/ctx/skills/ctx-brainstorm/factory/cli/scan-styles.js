#!/usr/bin/env node
/**
 * scan-styles.js — Style Scanner for Factory
 *
 * Usage: node scan-styles.js --project-dir /path/to/project
 *
 * Scans a project for:
 *   1. Tailwind config (theme.extend values)
 *   2. CSS custom properties from :root blocks
 *   3. package.json for component libraries + frameworks
 *
 * Outputs: <project-dir>/factory/style-profile.json
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// ========== CLI Argument Parsing ==========

const args = process.argv.slice(2);
const projectDirArg = args.find((_, i) => args[i - 1] === "--project-dir");

if (!projectDirArg) {
  process.stderr.write("Usage: node scan-styles.js --project-dir /path/to/project\n");
  process.exit(1);
}

const projectDir = path.resolve(projectDirArg);

if (!fs.existsSync(projectDir)) {
  process.stderr.write(`Error: project-dir does not exist: ${projectDir}\n`);
  process.exit(1);
}

// ========== Utilities ==========

function log(msg) {
  process.stderr.write(msg + "\n");
}

/**
 * Recursively glob files matching a pattern from a base directory.
 * Pattern supports: {a,b} alternation, * wildcard, ** recursive wildcard
 */
function glob(baseDir, patterns) {
  const results = [];

  function matchPattern(relPath, pattern) {
    // Convert glob pattern to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, (c) => {
        // Keep {} for alternation handling below, escape others
        if (c === "{" || c === "}") return c;
        return "\\" + c;
      })
      // Handle {a,b,c} alternation
      .replace(/\{([^}]+)\}/g, (_, group) => "(?:" + group.split(",").join("|") + ")")
      // Handle ** recursive wildcard
      .replace(/\*\*/g, "§STARSTAR§")
      // Handle * single segment wildcard
      .replace(/\*/g, "[^/]*")
      // Restore **
      .replace(/§STARSTAR§/g, ".*");
    return new RegExp("^" + escaped + "$").test(relPath);
  }

  function walk(dir, rel) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const entryRel = rel ? rel + "/" + entry.name : entry.name;
      const entryAbs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel);
      } else if (entry.isFile()) {
        for (const pattern of patterns) {
          if (matchPattern(entryRel, pattern)) {
            results.push(entryAbs);
            break;
          }
        }
      }
    }
  }

  walk(baseDir, "");
  return results;
}

// ========== Tailwind Config Scanner ==========

const TAILWIND_CONFIG_NAMES = [
  "tailwind.config.js",
  "tailwind.config.ts",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

function findTailwindConfig(dir) {
  // Check project root first
  for (const name of TAILWIND_CONFIG_NAMES) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  // Check monorepo app dirs (apps/*)
  const appsDir = path.join(dir, "apps");
  if (fs.existsSync(appsDir)) {
    try {
      for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        for (const name of TAILWIND_CONFIG_NAMES) {
          const full = path.join(appsDir, entry.name, name);
          if (fs.existsSync(full)) return full;
        }
      }
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * Try to evaluate a tailwind config via subprocess and extract theme.extend.
 * Returns { theme, extend } or null on failure.
 */
function evalTailwindConfigSubprocess(configPath) {
  const isTs = configPath.endsWith(".ts");

  // Build the evaluation script
  const evalScript = `
    try {
      let cfg = require(${JSON.stringify(configPath)});
      if (cfg && cfg.default) cfg = cfg.default;
      const out = {
        theme: cfg.theme || {},
        extend: (cfg.theme && cfg.theme.extend) || {}
      };
      process.stdout.write(JSON.stringify(out));
    } catch(e) {
      process.stderr.write('EVAL_ERROR: ' + e.message);
      process.exit(1);
    }
  `;

  // Determine runner
  const runners = isTs ? ["tsx", "node"] : ["node"];

  for (const runner of runners) {
    const result = spawnSync(runner, ["-e", evalScript], {
      cwd: path.dirname(configPath),
      timeout: 10000,
      encoding: "utf8",
    });

    if (result.status === 0 && result.stdout) {
      try {
        return JSON.parse(result.stdout);
      } catch {
        continue;
      }
    }

    // If tsx not found or failed, continue to next runner
    if (result.error && result.error.code === "ENOENT") continue;
  }

  return null;
}

/**
 * Regex-based fallback extraction of theme object from raw config text.
 * Handles simple key: "value" and key: ['value'] patterns.
 */
function extractThemeByRegex(configText) {
  const theme = {};

  // Extract colors block
  const colorsMatch = configText.match(/colors\s*:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (colorsMatch) {
    theme.colors = parseSimpleObjectLiteral(colorsMatch[1]);
  }

  // Extract fontFamily block
  const fontMatch = configText.match(/fontFamily\s*:\s*\{([^}]+)\}/s);
  if (fontMatch) {
    theme.fontFamily = parseSimpleObjectLiteral(fontMatch[1]);
  }

  // Extract borderRadius block
  const radiusMatch = configText.match(/borderRadius\s*:\s*\{([^}]+)\}/s);
  if (radiusMatch) {
    theme.borderRadius = parseSimpleObjectLiteral(radiusMatch[1]);
  }

  // Extract spacing block
  const spacingMatch = configText.match(/spacing\s*:\s*\{([^}]+)\}/s);
  if (spacingMatch) {
    theme.spacing = parseSimpleObjectLiteral(spacingMatch[1]);
  }

  return theme;
}

/**
 * Very simple object literal parser for `key: 'value'` or `key: ['a', 'b']` patterns.
 */
function parseSimpleObjectLiteral(text) {
  const result = {};
  // Match key: 'value' or key: "value"
  const singlePairs = text.matchAll(/(\w[\w-]*)\s*:\s*['"]([^'"]+)['"]/g);
  for (const [, key, value] of singlePairs) {
    result[key] = value;
  }
  // Match key: ['v1', 'v2'] or key: ["v1", "v2"]
  const arrayPairs = text.matchAll(/(\w[\w-]*)\s*:\s*\[([^\]]+)\]/g);
  for (const [, key, arr] of arrayPairs) {
    const items = arr.match(/['"]([^'"]+)['"]/g) || [];
    result[key] = items.map((s) => s.replace(/['"]/g, ""));
  }
  return result;
}

/**
 * Flatten nested color objects.
 * e.g., { primary: { DEFAULT: '#000', dark: '#111' } } → { primary: '#000', 'primary-dark': '#111' }
 */
function flattenColors(obj, prefix = "") {
  const result = {};
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return result;
  }
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? prefix + "-" + key : key;
    if (typeof val === "string") {
      // Use DEFAULT as the base key name
      const outKey = key === "DEFAULT" ? prefix : fullKey;
      if (outKey) result[outKey] = val;
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      Object.assign(result, flattenColors(val, fullKey));
    }
  }
  return result;
}

/**
 * Extract style tokens from a resolved tailwind theme.
 */
function extractFromTailwindTheme(themeData) {
  const { theme = {}, extend = {} } = themeData;

  // Merge base theme + extend (extend takes priority)
  const merged = {};
  for (const key of new Set([...Object.keys(theme), ...Object.keys(extend)])) {
    if (key === "extend") continue;
    merged[key] = deepMerge(theme[key] || {}, extend[key] || {});
  }

  const result = {};

  // Colors
  if (merged.colors) {
    result.colors = flattenColors(merged.colors);
  }

  // Font families — join arrays to string
  if (merged.fontFamily) {
    result.fontFamily = {};
    for (const [key, val] of Object.entries(merged.fontFamily)) {
      result.fontFamily[key] = Array.isArray(val) ? val.join(", ") : String(val);
    }
  }

  // Border radius
  if (merged.borderRadius) {
    result.borderRadius = {};
    for (const [key, val] of Object.entries(merged.borderRadius)) {
      if (typeof val === "string") result.borderRadius[key] = val;
    }
  }

  // Spacing
  if (merged.spacing) {
    result.spacing = {};
    for (const [key, val] of Object.entries(merged.spacing)) {
      if (typeof val === "string") result.spacing[key] = val;
    }
  }

  return result;
}

function scanTailwind(dir) {
  const configPath = findTailwindConfig(dir);
  if (!configPath) return { found: false, tokens: {} };

  log(`  Found tailwind config: ${path.relative(dir, configPath)}`);

  // Try subprocess evaluation first
  let themeData = evalTailwindConfigSubprocess(configPath);

  // Fallback: regex extraction from raw file
  if (!themeData) {
    log("  Subprocess evaluation failed — using regex fallback");
    try {
      const rawText = fs.readFileSync(configPath, "utf8");
      const extracted = extractThemeByRegex(rawText);
      themeData = { theme: {}, extend: extracted };
    } catch {
      themeData = { theme: {}, extend: {} };
    }
  }

  const tokens = extractFromTailwindTheme(themeData);
  return { found: true, configName: path.basename(configPath), tokens };
}

// ========== CSS Variable Scanner ==========

/**
 * Known CSS variable name → profile key mappings.
 */
const CSS_VAR_MAP = {
  // Colors
  "--primary": { section: "colors", key: "primary" },
  "--primary-foreground": { section: "colors", key: "primary-foreground" },
  "--secondary": { section: "colors", key: "secondary" },
  "--secondary-foreground": { section: "colors", key: "secondary-foreground" },
  "--accent": { section: "colors", key: "accent" },
  "--accent-foreground": { section: "colors", key: "accent-foreground" },
  "--background": { section: "colors", key: "background" },
  "--foreground": { section: "colors", key: "foreground" },
  "--muted": { section: "colors", key: "muted" },
  "--muted-foreground": { section: "colors", key: "muted-foreground" },
  "--destructive": { section: "colors", key: "destructive" },
  "--destructive-foreground": { section: "colors", key: "destructive-foreground" },
  "--card": { section: "colors", key: "card" },
  "--card-foreground": { section: "colors", key: "card-foreground" },
  "--popover": { section: "colors", key: "popover" },
  "--popover-foreground": { section: "colors", key: "popover-foreground" },
  "--border": { section: "colors", key: "border" },
  "--input": { section: "colors", key: "input" },
  "--ring": { section: "colors", key: "ring" },
  // Typography
  "--font-sans": { section: "typography", key: "sans" },
  "--font-mono": { section: "typography", key: "mono" },
  "--font-serif": { section: "typography", key: "serif" },
  "--font-size-base": { section: "typography", key: "baseSize" },
  "--font-base": { section: "typography", key: "baseSize" },
  // Spacing / radius
  "--radius": { section: "spacing", key: "radius.md" },
  "--radius-sm": { section: "spacing", key: "radius.sm" },
  "--radius-md": { section: "spacing", key: "radius.md" },
  "--radius-lg": { section: "spacing", key: "radius.lg" },
  "--radius-full": { section: "spacing", key: "radius.full" },
  "--spacing": { section: "spacing", key: "unit" },
  "--spacing-unit": { section: "spacing", key: "unit" },
  // Tailwind v4 @theme conventions (--color-*, --font-*)
  "--color-primary": { section: "colors", key: "primary" },
  "--color-primary-foreground": { section: "colors", key: "primary-foreground" },
  "--color-secondary": { section: "colors", key: "secondary" },
  "--color-secondary-foreground": { section: "colors", key: "secondary-foreground" },
  "--color-accent": { section: "colors", key: "accent" },
  "--color-accent-foreground": { section: "colors", key: "accent-foreground" },
  "--color-background": { section: "colors", key: "background" },
  "--color-foreground": { section: "colors", key: "foreground" },
  "--color-muted": { section: "colors", key: "muted" },
  "--color-muted-foreground": { section: "colors", key: "muted-foreground" },
  "--color-destructive": { section: "colors", key: "destructive" },
  "--color-destructive-foreground": { section: "colors", key: "destructive-foreground" },
  "--color-card": { section: "colors", key: "card" },
  "--color-card-foreground": { section: "colors", key: "card-foreground" },
  "--color-popover": { section: "colors", key: "popover" },
  "--color-popover-foreground": { section: "colors", key: "popover-foreground" },
  "--color-border": { section: "colors", key: "border" },
  "--color-input": { section: "colors", key: "input" },
  "--color-ring": { section: "colors", key: "ring" },
  "--font-display": { section: "typography", key: "display" },
  "--font-sans": { section: "typography", key: "sans" },
  "--font-mono": { section: "typography", key: "mono" },
};

/**
 * Parse hsl(value) or hsl(h s% l%) channel values to a best-effort hex.
 * shadcn/ui uses `--primary: 221.2 83.2% 53.3%` (space-separated, no hsl() wrapper).
 */
function hslToHex(h, s, l) {
  h = parseFloat(h) % 360;
  s = parseFloat(s) / 100;
  l = parseFloat(l) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function normalizeColorValue(raw) {
  const val = raw.trim();

  // Already a hex value
  if (/^#[0-9a-fA-F]{3,8}$/.test(val)) return val;

  // hsl(h, s%, l%) or hsl(h s% l%) — with hsl() wrapper
  const hslWrapped = val.match(/^hsl\(\s*([0-9.]+)\s*[,\s]\s*([0-9.]+)%\s*[,\s]\s*([0-9.]+)%\s*\)$/);
  if (hslWrapped) {
    return hslToHex(hslWrapped[1], hslWrapped[2], hslWrapped[3]);
  }

  // shadcn format: bare `h s% l%` (space-separated, no wrapper)
  const hslBare = val.match(/^([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%$/);
  if (hslBare) {
    return hslToHex(hslBare[1], hslBare[2], hslBare[3]);
  }

  // rgb() — return as-is, too complex to normalize reliably
  if (val.startsWith("rgb")) return val;

  // Named color or other — return raw
  return val;
}

/**
 * Extract :root CSS custom properties from a CSS file's text.
 * Returns Map of varName → rawValue
 */
function extractRootVars(cssText) {
  const vars = new Map();

  // Find all :root { ... } blocks (simple lazy match — works for flat blocks)
  const rootBlocks = cssText.matchAll(/:root\s*\{([\s\S]+?)\}/g);
  for (const [, block] of rootBlocks) {
    const pairs = block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g);
    for (const [, name, value] of pairs) {
      vars.set(name.trim(), value.trim());
    }
  }

  // Find @theme { ... } blocks (Tailwind v4) — uses brace-depth parser
  // because @theme can contain nested @keyframes with their own braces
  const themeStarts = cssText.matchAll(/@theme\s*\{/g);
  for (const match of themeStarts) {
    const startIdx = match.index + match[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < cssText.length && depth > 0) {
      if (cssText[i] === "{") depth++;
      else if (cssText[i] === "}") depth--;
      i++;
    }
    const block = cssText.slice(startIdx, i - 1);
    // Only extract top-level --name: value; pairs (skip nested @keyframes content)
    // Split by lines to avoid matching inside nested blocks
    let innerDepth = 0;
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.includes("{")) innerDepth += (trimmed.match(/\{/g) || []).length;
      if (trimmed.includes("}")) innerDepth -= (trimmed.match(/\}/g) || []).length;
      if (innerDepth === 0) {
        const pairMatch = trimmed.match(/^(--[\w-]+)\s*:\s*([^;]+);/);
        if (pairMatch) {
          vars.set(pairMatch[1].trim(), pairMatch[2].trim());
        }
      }
    }
  }

  return vars;
}

function scanCssVars(dir) {
  // Deduplicate by finding all css files in the relevant dirs
  // Also check monorepo app dirs (apps/*/src, apps/*/app, apps/*/styles)
  const cssFiles = new Set();
  const searchRoots = [dir];
  const appsDir = path.join(dir, "apps");
  if (fs.existsSync(appsDir)) {
    try {
      for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
        if (entry.isDirectory()) searchRoots.push(path.join(appsDir, entry.name));
      }
    } catch { /* ignore */ }
  }
  for (const root of searchRoots) {
    for (const subDir of ["src", "app", "styles"]) {
      const full = path.join(root, subDir);
      if (fs.existsSync(full)) {
        const found = glob(full, ["**/*.css"]);
        for (const f of found) cssFiles.add(f);
      }
    }
  }

  if (cssFiles.size === 0) return { found: false, tokens: {}, files: [] };

  const allVars = new Map();
  const foundFiles = [];

  for (const cssFile of cssFiles) {
    let text;
    try {
      text = fs.readFileSync(cssFile, "utf8");
    } catch {
      continue;
    }

    const vars = extractRootVars(text);
    if (vars.size === 0) continue;

    foundFiles.push(path.relative(dir, cssFile));
    for (const [name, val] of vars) {
      allVars.set(name, val);
    }
  }

  if (allVars.size === 0) return { found: false, tokens: {}, files: [] };

  // Map vars to profile sections
  const colors = {};
  const typography = {};
  const spacing = { radius: {} };
  const custom = {};

  for (const [name, rawVal] of allVars) {
    const mapping = CSS_VAR_MAP[name];
    if (mapping) {
      const { section, key } = mapping;
      if (section === "colors") {
        colors[key] = normalizeColorValue(rawVal);
      } else if (section === "typography") {
        typography[key] = rawVal;
      } else if (section === "spacing") {
        if (key.startsWith("radius.")) {
          const subKey = key.split(".")[1];
          spacing.radius[subKey] = rawVal;
        } else {
          spacing[key] = rawVal;
        }
      }
    } else {
      // Preserve unmapped vars in custom
      custom[name] = rawVal;
    }
  }

  // Clean up empty radius object
  if (Object.keys(spacing.radius).length === 0) delete spacing.radius;

  return {
    found: true,
    files: foundFiles,
    tokens: { colors, typography, spacing, custom },
  };
}

// ========== Package.json Scanner ==========

const COMPONENT_LIBRARIES = [
  { match: (deps) => deps["@shadcn/ui"] || deps["shadcn"], label: "shadcn/ui" },
  { match: (deps) => Object.keys(deps).some((k) => k.startsWith("@radix-ui/")), label: "radix-ui" },
  { match: (deps) => deps["@headlessui/react"] || deps["@headlessui/vue"], label: "headlessui" },
];

const FRAMEWORKS = [
  { match: (deps) => deps["next"], label: "next" },
  { match: (deps) => deps["vite"] || deps["@vitejs/plugin-react"], label: "vite" },
  { match: (deps) => Object.keys(deps).some((k) => k.startsWith("@remix-run/")), label: "remix" },
  { match: (deps) => deps["nuxt"], label: "nuxt" },
  { match: (deps) => deps["@sveltejs/kit"] || deps["svelte"], label: "svelte" },
  { match: (deps) => deps["astro"], label: "astro" },
];

function scanPackageJson(dir) {
  // Collect deps from root + monorepo app dirs
  const pkgPaths = [path.join(dir, "package.json")];
  const appsDir = path.join(dir, "apps");
  if (fs.existsSync(appsDir)) {
    try {
      for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const appPkg = path.join(appsDir, entry.name, "package.json");
          if (fs.existsSync(appPkg)) pkgPaths.push(appPkg);
        }
      }
    } catch { /* ignore */ }
  }

  const allDeps = {};
  let anyFound = false;
  for (const pkgPath of pkgPaths) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      anyFound = true;
      Object.assign(allDeps, pkg.dependencies || {}, pkg.devDependencies || {}, pkg.peerDependencies || {});
    } catch { continue; }
  }

  if (!anyFound) return { found: false, components: {} };

  let library = null;
  for (const def of COMPONENT_LIBRARIES) {
    if (def.match(allDeps)) {
      library = def.label;
      break;
    }
  }

  let framework = null;
  for (const def of FRAMEWORKS) {
    if (def.match(allDeps)) {
      framework = def.label;
      break;
    }
  }

  return {
    found: true,
    components: {
      ...(library ? { library } : {}),
      ...(framework ? { framework } : {}),
    },
  };
}

// ========== Merge Logic ==========

/**
 * Deep merge two objects. Source values override target.
 */
function deepMerge(target, source) {
  const result = Object.assign({}, target);
  for (const [key, val] of Object.entries(source)) {
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      result[key] !== null
    ) {
      result[key] = deepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function buildProfile(tailwindResult, cssResult, pkgResult) {
  const sources = [];

  // Collect source names
  if (tailwindResult.found) sources.push(tailwindResult.configName);
  if (cssResult.found) sources.push(...cssResult.files);
  if (pkgResult.found) sources.push("package.json");

  // Start with tailwind as base
  let colors = {};
  let typography = {};
  let spacing = { radius: {} };

  if (tailwindResult.found && tailwindResult.tokens) {
    const tw = tailwindResult.tokens;
    if (tw.colors) Object.assign(colors, tw.colors);
    if (tw.fontFamily) {
      for (const [key, val] of Object.entries(tw.fontFamily)) {
        typography[key] = val;
      }
    }
    if (tw.borderRadius) {
      for (const [key, val] of Object.entries(tw.borderRadius)) {
        // Map common radius keys
        if (key === "sm") spacing.radius.sm = val;
        else if (key === "md" || key === "DEFAULT") spacing.radius.md = val;
        else if (key === "lg") spacing.radius.lg = val;
        else if (key === "full") spacing.radius.full = val;
      }
    }
    if (tw.spacing) {
      // Look for a base unit (commonly '1' = 4px in tailwind)
      if (tw.spacing["1"]) spacing.unit = tw.spacing["1"];
    }
  }

  // CSS vars override matching keys
  if (cssResult.found && cssResult.tokens) {
    const css = cssResult.tokens;
    if (css.colors && Object.keys(css.colors).length > 0) {
      Object.assign(colors, css.colors);
    }
    if (css.typography && Object.keys(css.typography).length > 0) {
      Object.assign(typography, css.typography);
    }
    if (css.spacing) {
      if (css.spacing.unit) spacing.unit = css.spacing.unit;
      if (css.spacing.radius && Object.keys(css.spacing.radius).length > 0) {
        Object.assign(spacing.radius, css.spacing.radius);
      }
    }
  }

  // Clean up empty radius
  if (Object.keys(spacing.radius).length === 0) delete spacing.radius;
  if (Object.keys(spacing).length === 0) spacing = undefined;

  const profile = {
    meta: {
      scannedAt: new Date().toISOString(),
      sources,
    },
    colors: Object.keys(colors).length > 0 ? colors : {},
    typography: Object.keys(typography).length > 0 ? typography : {},
    spacing: spacing || {},
    components: pkgResult.found ? pkgResult.components : {},
    custom: cssResult.found && cssResult.tokens.custom ? cssResult.tokens.custom : {},
  };

  return profile;
}

// ========== Main ==========

function main() {
  log(`Scanning project: ${projectDir}`);
  log("");

  // 1. Scan tailwind config
  log("[1/3] Scanning tailwind config...");
  const tailwindResult = scanTailwind(projectDir);
  if (!tailwindResult.found) {
    log("  No tailwind config found");
  }

  // 2. Scan CSS vars
  log("[2/3] Scanning CSS custom properties...");
  const cssResult = scanCssVars(projectDir);
  if (!cssResult.found) {
    log("  No CSS vars found in :root blocks");
  } else {
    log(`  Found vars in: ${cssResult.files.join(", ")}`);
  }

  // 3. Scan package.json
  log("[3/3] Scanning package.json...");
  const pkgResult = scanPackageJson(projectDir);
  if (!pkgResult.found) {
    log("  No package.json found");
  } else {
    const { library, framework } = pkgResult.components;
    log(`  Library: ${library || "none"}, Framework: ${framework || "none"}`);
  }

  // 4. Merge
  log("");
  log("Merging sources...");
  const profile = buildProfile(tailwindResult, cssResult, pkgResult);

  // 5. Write output
  const outputDir = path.join(projectDir, "factory");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "style-profile.json");
  fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2) + "\n");

  // 6. Print summary
  log("");
  log("Summary:");
  log(`  Sources found:  ${profile.meta.sources.length}`);
  log(`  Colors:         ${Object.keys(profile.colors).length} tokens`);
  log(`  Typography:     ${Object.keys(profile.typography).length} tokens`);
  log(`  Spacing:        ${Object.keys(profile.spacing).length} tokens`);
  log(`  Components:     ${JSON.stringify(profile.components)}`);
  log(`  Custom vars:    ${Object.keys(profile.custom).length}`);
  log("");
  log(`Output: ${outputPath}`);
}

main();
