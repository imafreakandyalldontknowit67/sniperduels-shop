'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      window.location.href = '/?error=no_token'
      return
    }

    fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => {
        if (res.ok) {
          window.location.href = '/'
        } else {
          window.location.href = '/?error=session_failed'
        }
      })
      .catch(() => {
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
