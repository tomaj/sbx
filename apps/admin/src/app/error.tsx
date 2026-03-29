'use client'

import { useEffect } from 'react'

export default function Error({
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>
        {error?.digest && (
          <p className="text-xs text-gray-400 font-mono mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}
