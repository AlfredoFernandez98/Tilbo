#!/usr/bin/env bash
# Runs at every Claude Code session start. The output becomes context for Claude.
# Fetches the latest from origin and shows what other sessions/branches are working on.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

echo "## Session-start ($(date '+%Y-%m-%d %H:%M'))"

# 1. Get the latest. Pull only when it is safe (main, clean working tree, fast-forward).
git fetch --prune --quiet 2>/dev/null || echo "- git fetch failed (offline?)"
branch=$(git branch --show-current)
if [ "$branch" = "main" ] && [ -z "$(git status --porcelain)" ]; then
  git pull --ff-only --quiet 2>/dev/null && echo "- main updated: $(git log -1 --format='%h %s')" \
    || echo "- git pull --ff-only failed, check by hand"
else
  behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "?")
  echo "- On branch '$branch' (not pulled). $behind commits behind origin/main"
fi

# 2. Other worktrees and their changed files (parallel agents work there).
echo "### Worktrees and changed files"
git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
  b=$(git -C "$wt" branch --show-current)
  files=$(git -C "$wt" status --porcelain | awk '{print $2}' | tr '\n' ' ')
  echo "- $wt [$b]: ${files:-no changes}"
done

# 3. Other Claude sessions in this repo (including this one).
root=$(pwd)
count=0
for pid in $(ps -axo pid=,comm= | awk '$2=="claude"{print $1}'); do # pgrep missed processes
  cwd=$(lsof -a -d cwd -p "$pid" -Fn 2>/dev/null | sed -n 's/^n//p')
  case "$cwd" in "$root"*) count=$((count + 1)) ;; esac
done
echo "### Claude sessions in the repo: $count (including this one)"

# 4. Open PRs and the files they touch (needs gh login, skipped otherwise).
if prs=$(gh pr list --json number,title,headRefName,files \
  --template '{{range .}}- #{{.number}} {{.title}} [{{.headRefName}}]: {{range .files}}{{.path}} {{end}}{{"\n"}}{{end}}' 2>/dev/null); then
  echo "### Open PRs"
  echo "${prs:-- none}"
fi

echo "### Rule"
echo "Do not touch files listed above under another worktree/PR. If there are several sessions, work in your own worktree (EnterWorktree)."
