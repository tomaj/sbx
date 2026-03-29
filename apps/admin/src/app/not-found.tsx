export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-gray-200 dark:text-gray-800 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-block px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  )
}
