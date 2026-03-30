#!/bin/bash
ssh root@51.81.220.188 "docker exec f4k008k8skwc0sss40gws0wk psql -U sniper_app -d sniper_duels -c \"UPDATE \\\"Deposit\\\" SET status='expired' WHERE status='pending';\""
