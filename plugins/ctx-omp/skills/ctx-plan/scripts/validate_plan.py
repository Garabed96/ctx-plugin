#!/usr/bin/env python3
"""Validate the structural execution contract of a ctx-plan document."""

from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path


REQUIRED_SECTIONS = (
    "Requirements and Boundaries",
    "Execution Summary",
    "Execution Graph",
    "Task Specifications",
    "Review Batches",
    "Scheduling Policy",
    "Final Verification",
    "Handoff",
)

REQUIRED_TASK_LABELS = (
    "**Chain:**",
    "**Depends on:**",
    "**Unlocks:**",
    "**Parallel-safe with:**",
    "**Review batch:**",
    "**Ownership:**",
    "- Exclusive:",
    "- Shared:",
    "- Expected new files:",
    "- Acquire:",
    "- Hold:",
    "- Release:",
    "**Interfaces:**",
    "- Produces:",
    "- Consumes:",
    "**Files:**",
    "**Steps:**",
    "**Targeted verification:**",
    "**Completion criteria:**",
    "**Commit:**",
    "**Context:**",
)

TASK_HEADING = re.compile(r"^### Task (T\d+): .+ `\[(LOW|MED|HIGH)\]`\s*$", re.MULTILINE)
GRAPH_ROW = re.compile(r"^\|\s*(T\d+)\s*\|", re.MULTILINE)
TASK_REF = re.compile(r"\bT\d+\b")
BATCH_HEADING = re.compile(r"^### (B\d+):", re.MULTILINE)
BACKTICK_PATH = re.compile(r"`([^`]+)`")


def field_value(block: str, label: str) -> str:
    match = re.search(rf"^{re.escape(label)}\s*(.+)$", block, re.MULTILINE)
    return match.group(1).strip() if match else ""


def task_blocks(text: str) -> list[tuple[str, str]]:
    matches = list(TASK_HEADING.finditer(text))
    review_start = text.find("\n## Review Batches")
    blocks: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        if review_start > match.start():
            end = min(end, review_start)
        blocks.append((match.group(1), text[match.start():end]))
    return blocks


def detect_cycle(dependencies: dict[str, set[str]]) -> bool:
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(task_id: str) -> bool:
        if task_id in visiting:
            return True
        if task_id in visited:
            return False
        visiting.add(task_id)
        for dependency in dependencies[task_id]:
            if dependency in dependencies and visit(dependency):
                return True
        visiting.remove(task_id)
        visited.add(task_id)
        return False

    return any(visit(task_id) for task_id in dependencies)


def depends_on(task_id: str, dependency_id: str, dependencies: dict[str, set[str]]) -> bool:
    pending = list(dependencies.get(task_id, set()))
    seen: set[str] = set()
    while pending:
        current = pending.pop()
        if current == dependency_id:
            return True
        if current in seen:
            continue
        seen.add(current)
        pending.extend(dependencies.get(current, set()))
    return False


def validate(text: str) -> list[str]:
    errors: list[str] = []

    for section in REQUIRED_SECTIONS:
        if not re.search(rf"^## {re.escape(section)}\s*$", text, re.MULTILINE):
            errors.append(f"missing section: {section}")

    total_match = re.search(r"^\*\*Total tasks:\*\*\s*(\d+)\b", text, re.MULTILINE)
    blocks = task_blocks(text)
    task_ids = [task_id for task_id, _ in blocks]
    task_set = set(task_ids)

    if not total_match:
        errors.append("missing numeric **Total tasks:** header")
    elif int(total_match.group(1)) != len(blocks):
        errors.append(
            f"Total tasks says {total_match.group(1)} but found {len(blocks)} complete task headings"
        )

    if len(task_ids) != len(task_set):
        errors.append("task IDs must be unique")

    expected_ids = [f"T{index}" for index in range(1, len(task_ids) + 1)]
    if task_ids and task_ids != expected_ids:
        errors.append(f"task IDs must be ordered and contiguous: expected {', '.join(expected_ids)}")

    graph_ids = set(GRAPH_ROW.findall(text))
    if graph_ids != task_set:
        errors.append(
            "execution graph task IDs do not match task specifications: "
            f"graph={sorted(graph_ids)} tasks={sorted(task_set)}"
        )

    batch_ids = set(BATCH_HEADING.findall(text))
    dependencies: dict[str, set[str]] = {}
    parallel_tasks: dict[str, set[str]] = {}
    ownership: dict[str, list[str]] = defaultdict(list)

    for task_id, block in blocks:
        for label in REQUIRED_TASK_LABELS:
            if label not in block:
                errors.append(f"{task_id} missing field: {label}")

        dependency_value = field_value(block, "**Depends on:**")
        dependency_refs = set(TASK_REF.findall(dependency_value))
        dependencies[task_id] = dependency_refs
        unknown_dependencies = dependency_refs - task_set
        if unknown_dependencies:
            errors.append(f"{task_id} has unknown dependencies: {sorted(unknown_dependencies)}")
        if task_id in dependency_refs:
            errors.append(f"{task_id} cannot depend on itself")

        parallel_refs = set(TASK_REF.findall(field_value(block, "**Parallel-safe with:**")))
        parallel_tasks[task_id] = parallel_refs
        unknown_parallel = parallel_refs - task_set
        if unknown_parallel:
            errors.append(f"{task_id} has unknown parallel-safe tasks: {sorted(unknown_parallel)}")
        if task_id in parallel_refs:
            errors.append(f"{task_id} cannot be parallel-safe with itself")

        batch_value = field_value(block, "**Review batch:**")
        referenced_batches = set(re.findall(r"\bB\d+\b", batch_value))
        if len(referenced_batches) != 1:
            errors.append(f"{task_id} must reference exactly one review batch")
        elif not referenced_batches <= batch_ids:
            errors.append(f"{task_id} references an undefined review batch: {batch_value}")

        for ownership_label in ("- Exclusive:", "- Shared:"):
            value = field_value(block, ownership_label)
            if value.lower() == "none":
                continue
            for path in BACKTICK_PATH.findall(value):
                ownership[path].append(task_id)

    has_cycle = bool(dependencies and detect_cycle(dependencies))
    if has_cycle:
        errors.append("dependency graph contains a cycle")

    if not has_cycle:
        for task_id, parallel_refs in parallel_tasks.items():
            for other_id in parallel_refs:
                if task_id not in parallel_tasks.get(other_id, set()):
                    errors.append(f"parallel-safe declaration must be symmetric: {task_id}, {other_id}")
                if depends_on(task_id, other_id, dependencies) or depends_on(
                    other_id, task_id, dependencies
                ):
                    errors.append(f"dependent tasks cannot be parallel-safe: {task_id}, {other_id}")

    for path, owners in ownership.items():
        if len(owners) < 2:
            continue
        for index, left in enumerate(owners):
            for right in owners[index + 1 :]:
                if not depends_on(left, right, dependencies) and not depends_on(
                    right, left, dependencies
                ):
                    errors.append(
                        f"ownership overlap for `{path}` lacks a serialization path: {left}, {right}"
                    )

    return errors


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_plan.py <plan.md>", file=sys.stderr)
        return 2

    plan_path = Path(sys.argv[1])
    if not plan_path.is_file():
        print(f"error: plan not found: {plan_path}", file=sys.stderr)
        return 2

    errors = validate(plan_path.read_text(encoding="utf-8"))
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(f"valid ctx plan: {plan_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
