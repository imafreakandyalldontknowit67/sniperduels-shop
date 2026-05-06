'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Pipe a one-off message into the server's stdout so browser-side auth steps
// show up in container logs.
function reportToServer(stage: string, extra: Record<string, unknown> = {}) {
  try {
    void fetch('/api/auth/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, ...extra }),
      keepalive: true,
    })
  } catch { /* ignore */ }
}

function LoginHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    console.log('[LoginSuccess] entered', { hasToken: !!token, tokenLen: token?.length })
    reportToServer('login_success_entered', { hasToken: !!token, tokenLen: token?.length || 0 })
    if (!token) {
      reportToServer('login_success_no_token')
      window.location.href = '/?error=no_token'
      return
    }

    const returnTo = document.cookie.split('; ').find(c => c.startsWith('return_to='))
    const returnPath = returnTo ? decodeURIComponent(returnTo.split('=').slice(1).join('=')) : '/'
    document.cookie = 'return_to=;path=/;max-age=0'

    console.log('[LoginSuccess] calling set-session')
    reportToServer('set_session_call', { returnPath })
    fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const bodyText = await res.text().catch(() => '')
        console.log('[LoginSuccess] set-session result', res.status, bodyText)
        reportToServer('set_session_result', { status: res.status, body: bodyText.slice(0, 200) })
        if (res.ok) {
          window.location.href = returnPath
        } else {
          window.location.href = '/?error=session_failed'
        }
      })
      .catch(err => {
        console.error('[LoginSuccess] set-session network error', err)
        reportToServer('set_session_network_error', { err: String(err) })
        window.location.href = '/?error=session_failed'
      })
  }, [searchParams])

  return <p className="text-white text-lg">Logging you in...</p>
}

// useSearchParams() requires a Suspense boundary for static generation
export default function LoginSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Suspense fallback={<p className="text-white text-lg">Logging you in...</p>}>
        <LoginHandler />
      </Suspense>
    </div>
  )
}
