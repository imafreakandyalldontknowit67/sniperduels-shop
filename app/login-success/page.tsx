'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Intermediate page that sets the session cookie via a same-origin fetch.
// Safari ITP strips Set-Cookie from redirect responses in cross-origin chains
// (Roblox OAuth -> our domain), so we land here first, set the cookie via
// a normal POST, then redirect to home.
export default function LoginSuccess() {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <p className="text-white text-lg">Logging you in...</p>
    </div>
  )
}
