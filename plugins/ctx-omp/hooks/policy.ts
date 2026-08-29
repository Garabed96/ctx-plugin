const PULLS_ROUTE = /^\/?repos\/[^/\s]+\/[^/\s]+\/pulls\/?(?:[?#].*)?$/i;

function tokens(command: string): string[] | undefined {
  if (!command.trim() || /[;&|`$()\n]/.test(command)) return undefined;
  const result = command.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  return result?.map((part) => part.replace(/^['"]|['"]$/g, ""));
}
function firstCommand(parts: readonly string[]): { command: string; args: string[] } | undefined {
  let index = 0;
  while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[index] ?? "")) index += 1;
  if (parts[index] === "command") index += 1;
  if (parts[index] === "env") {
    index += 1;
    while (/^[A-Za-z_][A-Za-z0-9_]*=/.test(parts[index] ?? "")) index += 1;
  }
  const command = parts[index];
  if (!command) return undefined;
  return { command, args: parts.slice(index + 1) };
}
function pullRoute(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "api.github.com" && PULLS_ROUTE.test(url.pathname);
  } catch { return PULLS_ROUTE.test(value); }
}

/** Deliberately limited to model-issued top-level bash command forms in the design. */
export function blockedShippingCommand(command: string): string | undefined {
  const parts = tokens(command);
  if (!parts) return undefined;
  const parsed = firstCommand(parts);
  if (!parsed) return undefined;
  if (parsed.command === "gh" && parsed.args[0] === "pr" && parsed.args[1] === "create") return "Direct PR creation is blocked; use ship_preflight, ship_prepare, ctx_remote_approval, then ship_publish.";
  if (parsed.command === "gh" && parsed.args[0] === "api" && parsed.args.slice(1).some(pullRoute)) return "Direct GitHub pull-request creation is blocked; use the CTX bridge flow.";
  if (parsed.command === "curl" && parsed.args.some(pullRoute)) return "Direct GitHub pull-request creation is blocked; use the CTX bridge flow.";
  return undefined;
}
export function isSkillRead(value: unknown): boolean { return typeof value === "string" && /^skill:\/\/ctx-[a-z0-9-]+(?:\/|$)/.test(value); }
export function needsTestCoverageNudge(output: string): boolean {
  return /(?:\btests?\b.*\bpass(?:ed|ing)?\b|\bpass(?:ed|ing)?\b.*\btests?\b)/i.test(output) && !/\b(?:service|integration|end[- ]to[- ]end|e2e)\b/i.test(output);
}
export function altitudeNudge(input: string): string | undefined {
  if (input.length > 1_500 && /\b(?:exactly|must|never)\b/i.test(input)) return "Consider stating the outcome and constraints, then let the implementation discover local details.";
  if (input.length < 80 && /\b(?:build|fix|implement)\b/i.test(input)) return "A little more success criteria will make the next implementation turn safer.";
  return undefined;
}
