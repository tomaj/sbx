'use client'

import { HelpCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  text: string
  className?: string
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (visible && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2 + window.scrollX,
      })
    }
  }, [visible])

  return (
    <span
      ref={ref}
      className={cn('inline-flex items-center', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
      {visible &&
        createPortal(
          <div
            className="fixed z-[9999] w-64 px-3 py-2 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded-lg shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ top: coords.top, left: coords.left }}
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
          </div>,
          document.body
        )}
    </span>
  )
}
