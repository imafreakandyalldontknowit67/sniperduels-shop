'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ background: '#0a0a0b', margin: 0 }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#e1ad2d', marginBottom: '1rem', textTransform: 'uppercase' }}>
              Error
            </h1>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
              Something Went Wrong
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '2rem', textTransform: 'uppercase' }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 2rem',
                background: '#e1ad2d',
                color: '#0a0a0b',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
