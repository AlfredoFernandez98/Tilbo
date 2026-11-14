#!/usr/bin/env bash
# Kører ved hver Claude Code session-start. Output bliver kontekst for Claude.
# Henter det nyeste fra origin og viser, hvad andre sessioner/branches arbejder på.
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

echo "## Session-start ($(date '+%Y-%m-%d %H:%M'))"

# 1. Hent det nyeste. Pull kun hvis det er sikkert (main, ren arbejdsmappe, fast-forward).
git fetch --prune --quiet 2>/dev/null || echo "- git fetch fejlede (offline?)"
branch=$(git branch --show-current)
if [ "$branch" = "main" ] && [ -z "$(git status --porcelain)" ]; then
  git pull --ff-only --quiet 2>/dev/null && echo "- main opdateret: $(git log -1 --format='%h %s')" \
    || echo "- git pull --ff-only fejlede, tjek manuelt"
else
  behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "?")
  echo "- På branch '$branch' (ikke pullet). $behind commits bag origin/main"
fi

# 2. Andre worktrees og deres ændrede filer (parallelle agenter arbejder her).
echo "### Worktrees og ændrede filer"
git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
  b=$(git -C "$wt" branch --show-current)
  files=$(git -C "$wt" status --porcelain | awk '{print $2}' | tr '\n' ' ')
  echo "- $wt [$b]: ${files:-ingen ændringer}"
done

# 3. Andre Claude-sessioner i dette repo (inkl. denne).
root=$(pwd)
count=0
for pid in $(ps -axo pid=,comm= | awk '$2=="claude"{print $1}'); do # pgrep missede processer
  cwd=$(lsof -a -d cwd -p "$pid" -Fn 2>/dev/null | sed -n 's/^n//p')
  case "$cwd" in "$root"*) count=$((count + 1)) ;; esac
done
echo "### Claude-sessioner i repoet: $count (inkl. denne)"

# 4. Åbne PR'er og hvilke filer de rører (kræver gh login, ellers springes over).
if prs=$(gh pr list --json number,title,headRefName,files \
  --template '{{range .}}- #{{.number}} {{.title}} [{{.headRefName}}]: {{range .files}}{{.path}} {{end}}{{"\n"}}{{end}}' 2>/dev/null); then
  echo "### Åbne PR'er"
  echo "${prs:-- ingen}"
fi

echo "### Regel"
echo "Rør ikke filer der står ovenfor under en anden worktree/PR. Er der flere sessioner, så arbejd i egen worktree (EnterWorktree)."
