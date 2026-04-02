import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()
  try {
    // Vendor listings
    const listings = await client.query(`
      SELECT vl.*, u.name as vendor_name
      FROM "VendorListing" vl
      JOIN "User" u ON u.id = vl."vendorId"
    `)

    for (const l of listings.rows) {
      console.log(`\nVENDOR: ${l.vendor_name} (${l.vendorId})`)
      console.log(`  Stock on site: ${l.stockK}k`)
      console.log(`  Price: $${l.pricePerK}/k`)

      // Deposits
      const deposits = await client.query(
        `SELECT * FROM "VendorDeposit" WHERE "vendorId" = $1 ORDER BY "createdAt" DESC`,
        [l.vendorId]
      )
      let totalDeposited = 0
      console.log(`  Deposits:`)
      for (const d of deposits.rows) {
        console.log(`    ${d.amountK}k - ${d.status} (${d.createdAt})`)
        if (d.status === 'completed') totalDeposited += d.amountK
      }
      console.log(`  Total deposited: ${totalDeposited}k`)

      // Vendor earnings (sales)
      const earnings = await client.query(
        `SELECT ve.*, o.quantity FROM "VendorEarning" ve JOIN "Order" o ON o.id = ve."orderId" WHERE ve."vendorId" = $1 ORDER BY ve."createdAt" DESC`,
        [l.vendorId]
      )
      console.log(`  Sales:`)
      let totalSoldK = 0
      for (const e of earnings.rows) {
        console.log(`    ${e.quantity}k - $${e.saleAmount} (orderId: ${e.orderId})`)
        totalSoldK += e.quantity
      }
      console.log(`  Total gems sold: ${totalSoldK}k`)
      console.log(`  ----`)
      console.log(`  Expected stock: ${totalDeposited}k deposited - ${totalSoldK}k sold = ${totalDeposited - totalSoldK}k`)
      console.log(`  Site shows: ${l.stockK}k`)
      const diff = Number(l.stockK) - (totalDeposited - totalSoldK)
      if (diff !== 0) {
        console.log(`  *** DISCREPANCY: ${diff > 0 ? '+' : ''}${diff}k ***`)
      } else {
        console.log(`  ✓ Stock matches`)
      }
    }

    // Platform stock
    const gemStock = await client.query(`SELECT * FROM "GemStock" LIMIT 1`)
    console.log(`\nPLATFORM STOCK on site: ${gemStock.rows[0]?.balanceInK ?? 0}k`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
