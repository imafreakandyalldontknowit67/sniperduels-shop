# Project Instructions

This project uses an orchestrator system with multiple Claude Code agents working on separate branches.

## Rules for agents
- Only modify files relevant to your task
- Do not modify package.json unless your task requires new dependencies
- Do not reformat or refactor code outside your task scope
- Write clean, minimal changes
- If your task depends on another task's work, note it in your commit message
## Launch handoff
- Before launch work, read `CLAUDE_LAUNCH_IMPLEMENTATION_PLAN.md`.
- Codex completed the design pass; preserve the current UI 1:1 unless fixing a launch blocker.
- Claude should focus on build/runtime, env, database, auth, payments, orders, bot, admin, vendor, security, analytics, deployment, and rollback.
