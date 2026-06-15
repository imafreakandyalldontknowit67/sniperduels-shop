/**
 * One-time remediation: merge Discord-bot orphan rows (`User.id = discord_<id>`)
 * into the matching real Roblox-OAuth user row (same name), healing the
 * duplicate-account issue (stranded balances + "Discord not linked" on site).
 *
 * Reuses the ledger-safe `mergeUserAccounts` from lib/storage.ts.
 *
 * Dry-run by default. To execute:
 *   DATABASE_URL="postgres://..." npx tsx scripts/merge-duplicate-discord-users.ts --apply
 * (tsx does not auto-load .env.local, so pass DATABASE_URL inline.)
 */
import { prisma } from '../lib/prisma'
import { mergeUserAccounts } from '../lib/storage'

const APPLY = process.argv.includes('--apply')

type Pair = {
  orphan_id: string
  name: string
  orphan_balance: string | number
  orphan_discord: string | null
  canonical_id: string
  canonical_balance: string | number
  canonical_discord: string | null
}

async function main() {
  const pairs = await prisma.$queryRawUnsafe<Pair[]>(`
    SELECT b.id AS orphan_id, b.name AS name,
           b."walletBalance" AS orphan_balance, b."discordId" AS orphan_discord,
           r.id AS canonical_id,
           r."walletBalance" AS canonical_balance, r."discordId" AS canonical_discord
    FROM "User" b
    JOIN "User" r ON lower(r.name) = lower(b.name) AND r.id NOT LIKE 'discord_%'
    WHERE b.id LIKE 'discord_%'
    ORDER BY b."walletBalance" DESC
  `)

  // Guard against ambiguous matches (one orphan name -> multiple Roblox rows).
  const byOrphan = new Map<string, Pair[]>()
  for (const p of pairs) {
    const arr = byOrphan.get(p.orphan_id) || []
    arr.push(p)
    byOrphan.set(p.orphan_id, arr)
  }

  console.log(`\n${APPLY ? 'APPLY' : 'DRY-RUN'} — ${byOrphan.size} orphan(s) with a matching Roblox row\n`)

  let merged = 0
  let totalMoved = 0
  const skippedAmbiguous: string[] = []
  const failures: string[] = []

  for (const [orphanId, matches] of byOrphan) {
    if (matches.length > 1) {
      skippedAmbiguous.push(`${orphanId} (${matches[0].name}) -> ${matches.length} candidates: ${matches.map(m => m.canonical_id).join(', ')}`)
      console.log(`  SKIP (ambiguous) ${orphanId} "${matches[0].name}" -> ${matches.length} Roblox rows`)
      continue
    }
    const p = matches[0]
    const bal = Number(p.orphan_balance)
    const line = `${orphanId} "${p.name}" $${bal.toFixed(2)} -> ${p.canonical_id} (roblox bal $${Number(p.canonical_balance).toFixed(2)}, discord ${p.canonical_discord ? 'set' : 'none'})`

    if (!APPLY) {
      console.log(`  WOULD MERGE  ${line}`)
      totalMoved += bal
      merged++
      continue
    }

    const res = await mergeUserAccounts(orphanId, p.canonical_id)
    if (res.ok) {
      merged++
      totalMoved += res.movedBalance
      console.log(`  MERGED       ${line} | moved $${res.movedBalance.toFixed(2)} | reassigned ${JSON.stringify(res.reassigned)}${res.skipped.length ? ' | skipped ' + JSON.stringify(res.skipped) : ''}`)
    } else {
      failures.push(`${orphanId}: ${res.error}`)
      console.log(`  FAILED       ${line} | ${res.error}`)
    }
  }

  console.log(`\n── summary ──`)
  console.log(`${APPLY ? 'merged' : 'would merge'}: ${merged}`)
  console.log(`${APPLY ? 'balance moved' : 'balance to move'}: $${totalMoved.toFixed(2)}`)
  if (skippedAmbiguous.length) console.log(`skipped (ambiguous, needs manual review): ${skippedAmbiguous.length}\n  ${skippedAmbiguous.join('\n  ')}`)
  if (failures.length) console.log(`failures: ${failures.length}\n  ${failures.join('\n  ')}`)
  if (!APPLY) console.log(`\nRe-run with --apply to execute.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
