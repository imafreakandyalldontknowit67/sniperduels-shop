/**
 * Dev-only: simulate the bot completing a deposit.
 *
 * Given a userId + a list of items by catalog name, this:
 *   - Creates (or reuses) an ItemDepositSession in 'pending' status.
 *   - Flips it to 'completed' with the given items.
 *   - Creates VaultItem rows for each item with synthetic fingerprints.
 *
 * Lets you exercise the site-side listing/buying flow without running the bot.
 *
 * Usage:
 *   npx tsx scripts/dev-simulate-deposit.ts \
 *       --user smoke-seller \
 *       --item "AWP | FRANKENAWP GREEN" \
 *       --item "INTERVENTION | BLACK VALK"
 *
 * Use --create-user to insert a dummy user if userId doesn't exist.
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import { prisma } from '../lib/prisma'

interface Args { userId: string; createUser: boolean; items: string[] }

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const args: Args = { userId: '', createUser: false, items: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--user') args.userId = argv[++i]
    else if (a === '--create-user') args.createUser = true
    else if (a === '--item') args.items.push(argv[++i])
  }
  if (!args.userId || args.items.length === 0) {
    console.error('usage: --user <id> [--create-user] --item "WEAPON | SKIN" [--item ...]')
    process.exit(2)
  }
  return args
}

async function main() {
  const { userId, createUser, items } = parseArgs()

  let user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    if (!createUser) {
      console.error(`user ${userId} not found. Pass --create-user to insert a dummy.`)
      process.exit(2)
    }
    user = await prisma.user.create({
      data: {
        id: userId,
        name: userId,
        displayName: userId,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      },
    })
    console.log(`created user ${userId}`)
  }

  // Resolve catalog rows
  const upperNames = items.map(n => n.toUpperCase())
  const catalog = await prisma.itemCatalog.findMany({
    where: { name: { in: upperNames } },
  })
  const catalogByName = new Map(catalog.map(c => [c.name, c]))
  const missing = upperNames.filter(n => !catalogByName.has(n))
  if (missing.length) {
    console.error('missing from catalog:', missing.join(', '))
    console.error('seed first: npx tsx scripts/seed-item-catalog.ts')
    process.exit(2)
  }

  const session = await prisma.itemDepositSession.create({
    data: {
      userId,
      mode: 'auto_detect',
      status: 'completed',
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      detectedItems: items.map(n => ({ catalogName: n.toUpperCase() })) as any,
    },
  })

  const createdIds: string[] = []
  for (const itName of upperNames) {
    const cat = catalogByName.get(itName)!
    const v = await prisma.vaultItem.create({
      data: {
        ownerId: userId,
        catalogId: cat.id,
        // Synthetic fingerprint — bot would fill real values from OCR
        fingerprint: {
          rarity: 'EPIC',
          condition: 'MINT CONDITION',
          fragtrakr: false,
          kills: 0,
        },
        status: 'deposited',
      },
    })
    createdIds.push(v.id)
  }

  console.log(`session: ${session.id}`)
  console.log(`vault items created (${createdIds.length}):`)
  for (const id of createdIds) console.log(`  ${id}`)
  console.log(`\nVisit http://localhost:3000/vault to see them.`)

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e); await prisma.$disconnect(); process.exit(1)
})
