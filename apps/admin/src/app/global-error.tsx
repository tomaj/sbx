'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f1f5f9' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            An unexpected error occurred. Please try again or contact support if the issue persists.
          </p>
          {error?.digest && (
            <p style={{ color: '#475569', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{ padding: '0.5rem 1.25rem', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: '0.5rem 1.25rem', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', display: 'inline-block' }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
