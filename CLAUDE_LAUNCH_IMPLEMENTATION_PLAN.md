# Launch Runbook / Agent Handoff

Last updated: 2026-06-07
Current implementation branch: `deposit-checkout-estimate-ux`
Local dev URL: `http://localhost:3002`

## Rules

- Preserve the current Codex-designed UI 1:1 unless fixing a launch blocker.
- Work only on the active branch unless explicitly told otherwise.
- Do not modify marketplace branches/worktrees from this branch.
- Do not commit `.env`, `.env.local`, `.next`, logs, screenshots, `node_modules`, generated Prisma output, or temp browser files.
- Do not run production database migrations or real payment transactions without an explicit go-live instruction.

## Local verification

```powershell
cd "C:\Users\imbou\Downloads\Programs\Sniper Duels Auto Shop Site - New Frontend"
npm run test
npx tsc --noEmit --pretty false
npm run build
npm run dev -- --port 3002
```

Smoke URLs:

```text
http://localhost:3002/
http://localhost:3002/shop
http://localhost:3002/gems
http://localhost:3002/dashboard/deposit
```

If a local page renders black/unstyled, stop this project's Next server, delete `.next`, restart on port `3002`, then hard-refresh the browser.

## Coolify / OVH notes

Coolify project: `Sniper Duels Shop`.

Known apps in that project:

- `sniperduels-shop` serves `https://sniperduels.shop` / `https://www.sniperduels.shop` and tracks GitHub branch `main`.
- `sniperduels-shop-designer-preview` is a separate preview app and tracks the marketplace/design branch. Do not repoint or deploy it from this branch.

This branch (`deposit-checkout-estimate-ux`) is safe to push to GitHub. Production Coolify deployment requires either merging this branch to `main` or explicitly changing/creating a Coolify app for this branch. Do not change the Coolify production branch or run production deploys unless the user asks for go-live.

Production build command path is Dockerfile-based:

```text
npm ci
npx prisma generate
npm run build
node server.js
```

Production migration command, when explicitly approved:

```powershell
npm run db:migrate:deploy
```

## E2E-safe launch checks

Before pushing a launch branch:

- TypeScript passes with `npx tsc --noEmit --pretty false`.
- Next production build passes with type validation enabled.
- Vitest command exits successfully.
- Public pages return `200 text/html` locally.
- Protected dashboard/admin APIs reject unauthenticated users safely.
- Bot APIs reject requests without a valid `x-api-key`.
- Webhook endpoints reject invalid/missing signatures or unknown payloads safely.
- `.env.example` includes every env var referenced by code, with placeholders only.

## Git push verification

After committing:

```powershell
git push origin deposit-checkout-estimate-ux
$local = git rev-parse HEAD
$remote = (git ls-remote origin refs/heads/deposit-checkout-estimate-ux).Split()[0]
if ($local -ne $remote) { throw "Push verification failed: local=$local remote=$remote" }
```
