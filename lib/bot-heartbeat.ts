// In-memory bot heartbeat timestamp (resets on deploy, which is fine)
let lastHeartbeat: number = 0
let botGemBalance: number | null = null

export function getBotLastHeartbeat(): number {
  return lastHeartbeat
}

export function getBotGemBalance(): number | null {
  return botGemBalance
}

export function setBotHeartbeat(gemBalance?: number): void {
  lastHeartbeat = Date.now()
  if (gemBalance != null) botGemBalance = gemBalance
}
