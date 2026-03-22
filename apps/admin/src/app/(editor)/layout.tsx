export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {children}
    </div>
  )
}
