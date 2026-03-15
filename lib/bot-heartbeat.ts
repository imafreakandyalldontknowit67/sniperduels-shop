// In-memory bot heartbeat timestamp (resets on deploy, which is fine)
let lastHeartbeat: number = 0

export function getBotLastHeartbeat(): number {
  return lastHeartbeat
}

export function setBotHeartbeat(): void {
  lastHeartbeat = Date.now()
}
