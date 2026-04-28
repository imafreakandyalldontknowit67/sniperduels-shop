import { prisma } from './prisma'

interface LogErrorArgs {
  where: string
  userId?: string | null
  error: unknown
  context?: Record<string, unknown>
}

// Persist a structured error to the ErrorLog table. Never throws — logging
// failure must not cascade into the calling handler.
export async function logError({ where, userId, error, context }: LogErrorArgs): Promise<void> {
  try {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}${error.stack ? '\n' + error.stack.split('\n').slice(0, 6).join('\n') : ''}`
        : String(error)

    await prisma.errorLog.create({
      data: {
        source: 'site',
        where,
        userId: userId ?? null,
        message: message.slice(0, 2000),
        context: context ? JSON.stringify(context).slice(0, 4000) : null,
      },
    })
  } catch (logErr) {
    console.error('[ErrorLog] Failed to persist error:', logErr)
  }
}
