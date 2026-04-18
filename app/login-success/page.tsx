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

    // Read return_to cookie to redirect back to where the user was before login
    const returnTo = document.cookie.split('; ').find(c => c.startsWith('return_to='))
    const returnPath = returnTo ? decodeURIComponent(returnTo.split('=').slice(1).join('=')) : '/'
    // Clear the cookie
    document.cookie = 'return_to=;path=/;max-age=0'

    fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => {
        if (res.ok) {
          window.location.href = returnPath
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
