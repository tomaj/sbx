export default function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Content</h1>
    </div>
  )
}
