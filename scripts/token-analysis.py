#!/usr/bin/env python3

"""
Claude Code token usage analyzer.
Analyzes ~/.claude/projects/ JSONL files for token usage patterns.
"""

import json
import sys
import argparse
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timedelta, timezone


def extract_text_content(content):
    """Extract text from message content (string or list)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(item.get("text", ""))
                elif item.get("type") == "tool_result":
                    pass
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts).strip()
    return ""


def is_human_prompt(msg_obj):
    """Check if this is a human-originated prompt (not tool result)."""
    content = msg_obj.get("message", {}).get("content", "")
    if isinstance(content, list):
        types = [i.get("type") for i in content if isinstance(i, dict)]
        if types and all(t == "tool_result" for t in types):
            return False
    return True


def parse_session(jsonl_path, is_subagent=False):
    """Parse a single JSONL session file."""
    usage_total = defaultdict(int)
    prompts = []
    agent_id = None
    session_id = None
    timestamp_start = None
    subagent_sessions = []

    try:
        with open(jsonl_path) as f:
            lines = f.readlines()
    except Exception:
        return None

    for line in lines:
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        msg_type = obj.get("type")
        ts = obj.get("timestamp")

        if ts and not timestamp_start:
            timestamp_start = ts

        if not agent_id:
            agent_id = obj.get("agentId")

        if not session_id:
            session_id = obj.get("sessionId")

        if msg_type == "assistant":
            usage = obj.get("message", {}).get("usage", {})
            usage_total["input_tokens"] += usage.get("input_tokens", 0)
            usage_total["cache_creation_input_tokens"] += usage.get("cache_creation_input_tokens", 0)
            usage_total["cache_read_input_tokens"] += usage.get("cache_read_input_tokens", 0)
            usage_total["output_tokens"] += usage.get("output_tokens", 0)

        elif msg_type == "user":
            user_type = obj.get("userType", "")
            is_sidechain = obj.get("isSidechain", False)
            content = obj.get("message", {}).get("content", "")
            text = extract_text_content(content)

            if text and not is_sidechain and is_human_prompt(obj) and user_type != "tool":
                prompts.append({
                    "text": text,
                    "timestamp": obj.get("timestamp"),
                    "entrypoint": obj.get("entrypoint", ""),
                })

    # Check for subagent sessions
    session_dir = jsonl_path.parent / jsonl_path.stem
    if session_dir.is_dir():
        subagents_dir = session_dir / "subagents"
        if subagents_dir.is_dir():
            for sub_file in subagents_dir.glob("*.jsonl"):
                sub_data = parse_session(sub_file, is_subagent=True)
                if sub_data:
                    sub_data["subagent_file"] = str(sub_file.name)
                    subagent_sessions.append(sub_data)

    total_tokens = (
        usage_total["input_tokens"]
        + usage_total["cache_creation_input_tokens"]
        + usage_total["cache_read_input_tokens"]
        + usage_total["output_tokens"]
    )

    return {
        "file": str(jsonl_path),
        "session_id": session_id or jsonl_path.stem,
        "agent_id": agent_id,
        "is_subagent": is_subagent,
        "timestamp_start": timestamp_start,
        "usage": dict(usage_total),
        "total_tokens": total_tokens,
        "prompts": prompts,
        "subagent_sessions": subagent_sessions,
    }


def get_project_name(project_dir_name):
    """Convert directory name to readable project name."""
    # Strip -Users-<username>- prefix dynamically
    parts = project_dir_name.lstrip("-").split("-")
    # Skip Users-<username> (first two segments after lstrip)
    if len(parts) > 2 and parts[0] == "Users":
        return "-".join(parts[2:])
    return project_dir_name


def get_cutoff(args):
    """Return a UTC-aware datetime cutoff, or None for all time."""
    if args.since_date:
        return datetime.fromisoformat(args.since_date).replace(tzinfo=timezone.utc)
    if args.since_days:
        return datetime.now(timezone.utc) - timedelta(days=args.since_days)
    return None


def session_in_range(session, cutoff):
    if not cutoff or not session["timestamp_start"]:
        return True
    ts_str = session["timestamp_start"]
    try:
        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return ts >= cutoff
    except ValueError:
        return True


def session_has_ctx_skills(session):
    """Check if any prompt in the session invoked a /ctx-* skill."""
    for prompt in session["prompts"]:
        text = prompt["text"].strip()
        if text.startswith("/ctx-") or " /ctx-" in text:
            return True
    return False


def analyze_all(args):
    """Analyze all projects and sessions."""
    projects = defaultdict(list)
    cutoff = get_cutoff(args)
    projects_dir = Path(args.projects_dir)

    for project_dir in sorted(projects_dir.iterdir()):
        if not project_dir.is_dir():
            continue

        if args.project and project_dir.name != args.project:
            continue

        project_name = get_project_name(project_dir.name)
        sessions = []
        for jsonl_file in sorted(project_dir.glob("*.jsonl")):
            session = parse_session(jsonl_file)
            if session and session["total_tokens"] > 0 and session_in_range(session, cutoff):
                sessions.append(session)

        if args.filter_skills:
            sessions = [s for s in sessions if session_has_ctx_skills(s)]

        for session in sessions:
            projects[project_name].append(session)

    return projects


def format_tokens(n):
    """Format token count with commas."""
    return f"{n:,}"


def summarize_projects(projects):
    """Build per-project summary."""
    summaries = []
    for project_name, sessions in projects.items():
        total = defaultdict(int)
        all_subagent_tokens = 0
        subagent_count = 0

        for session in sessions:
            for k, v in session["usage"].items():
                total[k] += v
            for sub in session["subagent_sessions"]:
                all_subagent_tokens += sub["total_tokens"]
                subagent_count += 1

        grand_total = sum(total.values())

        summaries.append({
            "project": project_name,
            "sessions": len(sessions),
            "usage": dict(total),
            "total_tokens": grand_total,
            "subagent_tokens": all_subagent_tokens,
            "subagent_count": subagent_count,
        })

    summaries.sort(key=lambda x: x["total_tokens"], reverse=True)
    return summaries


def find_costly_sessions(projects, top_n=20):
    """Find the most token-heavy sessions across all projects."""
    all_sessions = []
    for project_name, sessions in projects.items():
        for session in sessions:
            all_sessions.append((project_name, session))
    all_sessions.sort(key=lambda x: x[1]["total_tokens"], reverse=True)
    return all_sessions[:top_n]


def find_costly_subagents(projects, top_n=20):
    """Find the most token-heavy subagent sessions."""
    all_subs = []
    for project_name, sessions in projects.items():
        for session in sessions:
            for sub in session["subagent_sessions"]:
                all_subs.append((project_name, session["session_id"], sub))
    all_subs.sort(key=lambda x: x[2]["total_tokens"], reverse=True)
    return all_subs[:top_n]


def write_report(projects, summaries, args):
    """Write the main token report markdown file."""
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "token_report.md"

    costly_sessions = find_costly_sessions(projects, top_n=20)
    costly_subagents = find_costly_subagents(projects, top_n=20)

    grand_total_tokens = sum(s["total_tokens"] for s in summaries)
    grand_total_sessions = sum(s["sessions"] for s in summaries)

    with open(report_path, "w") as f:
        f.write("# Claude Code Token Usage Report\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        # Summary stats
        f.write("## Overall Summary\n\n")
        f.write(f"- **Total tokens:** {format_tokens(grand_total_tokens)}\n")
        f.write(f"- **Total sessions:** {grand_total_sessions}\n")
        f.write(f"- **Total projects:** {len(summaries)}\n\n")

        # Per-project table
        f.write("## Per-Project Breakdown\n\n")
        f.write("| Project | Sessions | Total Tokens | Input | Cache Create | Cache Read | Output | Subagent Tokens |\n")
        f.write("|---------|----------|-------------|-------|-------------|------------|--------|----------------|\n")
        for s in summaries:
            u = s["usage"]
            f.write(
                f"| {s['project']} "
                f"| {s['sessions']} "
                f"| {format_tokens(s['total_tokens'])} "
                f"| {format_tokens(u.get('input_tokens', 0))} "
                f"| {format_tokens(u.get('cache_creation_input_tokens', 0))} "
                f"| {format_tokens(u.get('cache_read_input_tokens', 0))} "
                f"| {format_tokens(u.get('output_tokens', 0))} "
                f"| {format_tokens(s['subagent_tokens'])} |\n"
            )

        f.write("\n")

        # Top costly sessions
        f.write("## Top 20 Most Token-Heavy Sessions\n\n")
        f.write("| Rank | Project | Session ID | Total Tokens | Started |\n")
        f.write("|------|---------|------------|-------------|--------|\n")
        for i, (project_name, session) in enumerate(costly_sessions, 1):
            ts = session["timestamp_start"] or "unknown"
            session_id_short = session["session_id"][:16] if session["session_id"] else "unknown"
            f.write(
                f"| {i} "
                f"| {project_name} "
                f"| {session_id_short}... "
                f"| {format_tokens(session['total_tokens'])} "
                f"| {ts[:19]} |\n"
            )

        f.write("\n")

        # Top costly subagents
        if costly_subagents:
            f.write("## Top 20 Most Token-Heavy Subagent Sessions\n\n")
            f.write("| Rank | Project | Parent Session | Subagent File | Total Tokens |\n")
            f.write("|------|---------|----------------|--------------|-------------|\n")
            for i, (project_name, parent_session_id, sub) in enumerate(costly_subagents, 1):
                parent_short = parent_session_id[:16] if parent_session_id else "unknown"
                f.write(
                    f"| {i} "
                    f"| {project_name} "
                    f"| {parent_short}... "
                    f"| {sub.get('subagent_file', 'unknown')} "
                    f"| {format_tokens(sub['total_tokens'])} |\n"
                )
            f.write("\n")

    print(f"Report written to: {report_path}")
    return report_path


def write_prompts_by_project(projects, args):
    """Write per-project prompt files."""
    output_dir = Path(args.output_dir)
    prompts_dir = output_dir / "prompts"
    prompts_dir.mkdir(parents=True, exist_ok=True)

    for project_name, sessions in projects.items():
        # Make a safe filename from the project name
        safe_name = project_name.replace("/", "_").replace(" ", "_")
        prompt_path = prompts_dir / f"{safe_name}.md"

        with open(prompt_path, "w") as f:
            f.write(f"# Prompts: {project_name}\n\n")
            for session in sessions:
                session_id = session["session_id"]
                ts = session["timestamp_start"] or "unknown"
                f.write(f"## Session {session_id[:16]}... ({ts[:19]})\n\n")
                f.write(f"**Total tokens:** {format_tokens(session['total_tokens'])}\n\n")

                if session["prompts"]:
                    for prompt in session["prompts"]:
                        pts = prompt.get("timestamp", "")[:19] or "unknown"
                        entrypoint = prompt.get("entrypoint", "")
                        f.write(f"### Prompt ({pts})\n\n")
                        if entrypoint:
                            f.write(f"_Entrypoint: {entrypoint}_\n\n")
                        text = prompt["text"]
                        # Truncate very long prompts
                        if len(text) > 2000:
                            text = text[:2000] + "\n\n... (truncated)"
                        f.write(f"```\n{text}\n```\n\n")
                else:
                    f.write("_No human prompts found in this session._\n\n")

    print(f"Prompts written to: {prompts_dir}")
    return prompts_dir


def print_summary(summaries, projects):
    """Print a human-readable summary to stdout."""
    grand_total = sum(s["total_tokens"] for s in summaries)
    grand_sessions = sum(s["sessions"] for s in summaries)

    print(f"\n{'='*60}")
    print(f"CLAUDE CODE TOKEN USAGE SUMMARY")
    print(f"{'='*60}")
    print(f"Total tokens:   {format_tokens(grand_total)}")
    print(f"Total sessions: {grand_sessions}")
    print(f"Total projects: {len(summaries)}")
    print(f"{'='*60}\n")

    print(f"{'Project':<45} {'Sessions':>8} {'Total Tokens':>14}")
    print(f"{'-'*45} {'-'*8} {'-'*14}")

    for s in summaries[:20]:
        name = s["project"]
        if len(name) > 44:
            name = name[:41] + "..."
        print(f"{name:<45} {s['sessions']:>8} {format_tokens(s['total_tokens']):>14}")

    if len(summaries) > 20:
        print(f"  ... and {len(summaries) - 20} more projects")

    print()


def main():
    parser = argparse.ArgumentParser(description="Claude Code token usage analyzer")
    parser.add_argument("--output-dir", default="./token-analysis-output",
                        help="Directory for reports (default: ./token-analysis-output)")
    parser.add_argument("--projects-dir", default=str(Path.home() / ".claude" / "projects"),
                        help="Claude projects directory (default: ~/.claude/projects/)")
    parser.add_argument("--project", default=None,
                        help="Filter to a specific project by directory name")
    parser.add_argument("--filter-skills", action="store_true",
                        help="Only include sessions where /ctx-* skills were invoked")
    since_group = parser.add_mutually_exclusive_group()
    since_group.add_argument("--since-days", type=int, default=None,
                             help="Only include sessions from last N days")
    since_group.add_argument("--since-date", default=None,
                             help="Only include sessions since date (YYYY-MM-DD)")
    args = parser.parse_args()

    print("Scanning projects...")
    projects = analyze_all(args)

    if not projects:
        print("No sessions found matching the given filters.")
        sys.exit(0)

    summaries = summarize_projects(projects)
    print_summary(summaries, projects)

    write_report(projects, summaries, args)
    write_prompts_by_project(projects, args)

    print("\nDone.")


if __name__ == "__main__":
    main()
