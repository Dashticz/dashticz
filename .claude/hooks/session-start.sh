#!/bin/bash
set -euo pipefail

# Restore the user's global Claude Code git conventions if this session's
# container doesn't have them yet (e.g. after a fresh/reset container).
# Only creates the file when missing, so it never clobbers preferences the
# user has since added to it directly.

CLAUDE_MD="$HOME/.claude/CLAUDE.md"

if [ -f "$CLAUDE_MD" ]; then
  exit 0
fi

mkdir -p "$HOME/.claude"

cat > "$CLAUDE_MD" << 'EOF'
# Git conventions (all repos)

- Commit messages: include `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`, but never include a `Claude-Session:` line or any other Claude session/link reference.
- Pull request descriptions: end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)` only — never include a session link.
- Branch names: when creating a new branch for work, prefix it with `fixes/` (e.g. `fixes/short-description`) instead of `claude/...`.
- Direct pushes to remote branches are pre-approved; no need to ask for confirmation before pushing.
EOF
