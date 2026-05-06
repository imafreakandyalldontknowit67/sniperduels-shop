#!/usr/bin/env python3
"""Add localAmount/localCurrency/fxRate to Deposit for non-USD provenance.

Idempotent — uses DO blocks that catch duplicate_column. Safe to run twice.
"""
import sys
import paramiko

HOST = "51.81.220.188"
USER = "root"
PASS = "Bingle9!"
PG_CONTAINER = "f4k008k8skwc0sss40gws0wk"

SQL = r"""
BEGIN;

DO $$ BEGIN
  ALTER TABLE "Deposit" ADD COLUMN "localAmount" DECIMAL(12,2);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Deposit" ADD COLUMN "localCurrency" VARCHAR(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Deposit" ADD COLUMN "fxRate" DECIMAL(12,6);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

COMMIT;

\echo '--- POST-MIGRATION SCHEMA CHECK ---'
SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale
  FROM information_schema.columns
  WHERE table_name = 'Deposit' AND column_name IN ('localAmount', 'localCurrency', 'fxRate')
  ORDER BY column_name;
"""


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False, timeout=30)
    cmd = f'docker exec -i {PG_CONTAINER} psql -U sniper_app -d sniper_duels -v ON_ERROR_STOP=1'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    stdin.write(SQL)
    stdin.channel.shutdown_write()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if out:
        sys.stdout.write(out)
    if err:
        sys.stderr.write(err)
    client.close()
    sys.exit(rc)


if __name__ == "__main__":
    main()
