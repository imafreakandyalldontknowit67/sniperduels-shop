import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('51.81.220.188', username='root', password='Bingle9!', timeout=30)

def run_psql(sql):
    cmd = 'docker exec -i f4k008k8skwc0sss40gws0wk psql -U sniper_app -d sniper_duels -A -F"|" -P pager=off'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    stdin.write(sql)
    stdin.channel.shutdown_write()
    return stdout.read().decode('utf-8', errors='replace'), stderr.read().decode('utf-8', errors='replace')

# Both accts
for label, uid in [('1zksz', '6166131208'), ('Malinche79', '6034385983')]:
    sql = f"""
SELECT
  '{label}' AS acct,
  (SELECT "walletBalance" FROM "User" WHERE id='{uid}') AS actual_wallet,
  -- breakdown by format
  SUM(CASE WHEN type='vendor_earning' AND description LIKE 'Vendor sale: %k gems' THEN amount ELSE 0 END) AS old_fmt_earnings,
  SUM(CASE WHEN type='vendor_earning' AND description LIKE 'Vendor sale: net %' THEN amount ELSE 0 END) AS new_fmt_earnings,
  SUM(CASE WHEN type='admin_adjust' THEN amount ELSE 0 END) AS admin_adjusts,
  SUM(CASE WHEN type NOT IN ('vendor_earning','admin_adjust') THEN amount ELSE 0 END) AS other,
  COUNT(*) AS rows
FROM "TransactionLedger"
WHERE "userId" = '{uid}';
"""
    out, err = run_psql(sql)
    print(out)

# Now check: assuming new-format entries credited wallet and old-format did NOT,
# expected_balance = new_fmt + admin_adjusts (+ other) ?
print()
print("=== VendorEarning table (canonical) vs ledger ===")
for label, uid in [('1zksz', '6166131208'), ('Malinche79', '6034385983')]:
    sql = f"""
SELECT '{label}' AS acct,
  (SELECT COUNT(*) FROM "VendorEarning" WHERE "vendorId"='{uid}') AS ve_count,
  (SELECT COALESCE(SUM("netAmount"),0) FROM "VendorEarning" WHERE "vendorId"='{uid}') AS ve_net_total,
  (SELECT COALESCE(SUM("saleAmount"),0) FROM "VendorEarning" WHERE "vendorId"='{uid}') AS ve_gross_total,
  (SELECT COALESCE(SUM(amount),0) FROM "VendorPayout" WHERE "vendorId"='{uid}' AND status='completed') AS vp_paid
;
"""
    out, _ = run_psql(sql)
    print(out)

client.close()
