---
name: context-worktree
description: >
  Use when the user wants to work on something in parallel — creates an isolated git
  worktree with env symlinks and dependency install so it's immediately runnable.
  Triggers: "worktree", "new worktree", "isolated branch", "parallel branch".
allowed-tools: Bash, Read, Glob
user-invocable: true
---

# /worktree — Create an Isolated Git Worktree

## Skill Files

- `SKILL.md` — this file

## What this does

Sets up a fully functional git worktree as a sibling directory, with env files symlinked and dependencies installed so the worktree is immediately runnable.

## Workflow

### 1. Gather inputs

Ask the user if not provided:

- **Name**: a short identifier (e.g., `fix-email-bug`, `new-search-ui`)
- **Base branch**: which branch to branch from. Default: `main`
- **Branch prefix**: `feat/`, `fix/`, `hotfix/`, or none. Default: `feat/`

### 2. Resolve paths

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
PROJECT_NAME=$(basename "$REPO_ROOT")
PARENT_DIR=$(dirname "$REPO_ROOT")
WORKTREE_DIR="$PARENT_DIR/$PROJECT_NAME-<name>"
```

The worktree lands as a sibling to the main project. For example, if the project is at `~/Projects/myapp`, the worktree goes to `~/Projects/myapp-fix-email-bug`.

### 3. Create the worktree

```bash
git fetch origin <base-branch>
git worktree add -b <prefix><name> "$WORKTREE_DIR" origin/<base-branch>
```

If the branch already exists, skip `-b` and just attach:

```bash
git worktree add "$WORKTREE_DIR" <prefix><name>
```

### 4. Symlink env files

Find and symlink all gitignored env files from the repo root:

```bash
# Symlink root-level env files
for f in "$REPO_ROOT"/.env.local "$REPO_ROOT"/.env.local.*; do
  [ -f "$f" ] && ln -s "$f" "$WORKTREE_DIR/$(basename "$f")"
done
```

**Monorepo check**: If the project has sub-apps that need their own env files (e.g., `apps/web/.env.local`), check if the main repo has symlinks pointing to root env files and recreate them:

```bash
# Find env symlinks in the main repo and recreate them in the worktree
find "$REPO_ROOT" -name ".env.local" -type l | while read -r link; do
  REL_PATH="${link#$REPO_ROOT/}"
  TARGET=$(readlink "$link")
  ln -s "$TARGET" "$WORKTREE_DIR/$REL_PATH" 2>/dev/null
done
```

### 5. Install dependencies

Detect the package manager and install:

```bash
cd "$WORKTREE_DIR"
if [ -f "pnpm-lock.yaml" ]; then pnpm install
elif [ -f "yarn.lock" ]; then yarn install
elif [ -f "package-lock.json" ]; then npm install
elif [ -f "Pipfile.lock" ]; then pipenv install
elif [ -f "requirements.txt" ]; then pip install -r requirements.txt
fi
```

Skip if the user says they won't need to run a dev server.

### 6. Confirm and prompt to relaunch

```
Worktree ready:
  Path:   <WORKTREE_DIR>
  Branch: <prefix><name>
  Base:   <base-branch>
  .env:   symlinked
  deps:   installed

  Claude Code is anchored to this directory — to work in the
  new worktree, quit and relaunch:
    cd <WORKTREE_DIR> && claude

Want me to stop here so you can relaunch from the worktree?
```

Always ask — don't silently continue in the old directory.

## Cleanup reminder

```bash
git worktree remove <path>        # clean removal
git worktree remove --force <path> # if changes were discarded
git branch -d <branch-name>       # delete branch if no longer needed
git worktree list                  # see all active worktrees
```

## Edge cases

- **Worktree already exists**: tell the user and ask if they want a different name or reuse it
- **Branch already exists**: ask if they want to attach or pick a new name
- **Dirty working directory**: fine — worktrees are independent, no warning needed

## Gotchas

- **`claude --continue` doesn't work across directories.** When switching to a worktree, `cd` there and start a NEW session.
- **Env symlinks in monorepos**: Git worktrees don't copy gitignored symlinks. The skill must recreate them.
