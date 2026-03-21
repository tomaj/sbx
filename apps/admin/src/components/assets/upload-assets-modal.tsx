'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface UploadFile {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface UploadAssetsModalProps {
  spaceId: string
  folderId?: number | null
  onClose: () => void
  onUploaded: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

export function UploadAssetsModal({ spaceId, folderId, onClose, onUploaded }: UploadAssetsModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    setFiles(prev => [
      ...prev,
      ...arr.map(f => ({ file: f, status: 'pending' as const })),
    ])
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleUpload() {
    if (files.length === 0) return
    setUploading(true)

    const fd = new FormData()
    files.forEach(f => fd.append('files', f.file))
    if (folderId != null) fd.append('folder_id', String(folderId))

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })))

    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/assets/upload`, {
        method: 'POST',
        body: fd,
      })
      if (res.ok) {
        setFiles(prev => prev.map(f => ({ ...f, status: 'done' })))
        setTimeout(() => {
          onUploaded()
          onClose()
        }, 800)
      } else {
        const err = await res.json().catch(() => ({}))
        setFiles(prev => prev.map(f => ({ ...f, status: 'error', error: err.message ?? 'Upload failed' })))
      }
    } catch {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', error: 'Network error' })))
    } finally {
      setUploading(false)
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const doneCount = files.filter(f => f.status === 'done').length

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Files</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="px-6 pt-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-teal-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">Upload multiple files at once, max 100 MB each</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files?.length) addFiles(e.target.files) }}
            />
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 py-3 flex flex-col gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <File className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{f.file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(f.file.size)}</p>
                </div>
                {f.status === 'pending' && (
                  <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-gray-600 shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {f.status === 'uploading' && <Loader2 className="w-4 h-4 text-teal-500 animate-spin shrink-0" />}
                {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                {f.status === 'error' && (
                  <span title={f.error}>
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-400">
            {files.length === 0 ? 'No files selected' : `${files.length} file${files.length !== 1 ? 's' : ''} selected`}
            {doneCount > 0 ? ` · ${doneCount} uploaded` : ''}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading || pendingCount === 0}
              className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              Upload {files.length > 0 ? `(${files.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
