import type { FieldType } from './types'

interface FieldIconProps {
  type: FieldType
  size?: number
}

export function FieldIcon({ type, size = 28 }: FieldIconProps) {
  const s = size

  switch (type) {
    case 'bloks':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#f0fdf4" />
          <rect x="6" y="6" width="7" height="7" rx="1.5" fill="#16a34a" />
          <rect x="15" y="6" width="7" height="7" rx="1.5" fill="#16a34a" opacity="0.5" />
          <rect x="6" y="15" width="7" height="7" rx="1.5" fill="#16a34a" opacity="0.5" />
          <rect x="15" y="15" width="7" height="7" rx="1.5" fill="#16a34a" opacity="0.3" />
        </svg>
      )

    case 'text':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#dcfce7" />
          <text x="14" y="20" textAnchor="middle" fontSize="16" fontWeight="700" fill="#15803d" fontFamily="serif">T</text>
        </svg>
      )

    case 'textarea':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#dbeafe" />
          <rect x="7" y="8" width="14" height="2" rx="1" fill="#1d4ed8" />
          <rect x="7" y="13" width="14" height="2" rx="1" fill="#1d4ed8" />
          <rect x="7" y="18" width="10" height="2" rx="1" fill="#1d4ed8" />
        </svg>
      )

    case 'richtext':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#ffedd5" />
          <text x="14" y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill="#c2410c" fontFamily="monospace">{'{ }'}</text>
        </svg>
      )

    case 'markdown':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#ffedd5" />
          <text x="14" y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill="#c2410c" fontFamily="monospace">{'<>'}</text>
        </svg>
      )

    case 'number':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#fee2e2" />
          <text x="14" y="20" textAnchor="middle" fontSize="15" fontWeight="700" fill="#b91c1c" fontFamily="monospace">#</text>
        </svg>
      )

    case 'datetime':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#ede9fe" />
          <rect x="7" y="9" width="14" height="12" rx="2" stroke="#7c3aed" strokeWidth="1.5" fill="none" />
          <rect x="10" y="7" width="2" height="4" rx="1" fill="#7c3aed" />
          <rect x="16" y="7" width="2" height="4" rx="1" fill="#7c3aed" />
          <rect x="7" y="13" width="14" height="1.5" fill="#7c3aed" />
        </svg>
      )

    case 'boolean':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#ede9fe" />
          <rect x="7" y="11" width="14" height="6" rx="3" fill="#7c3aed" />
          <circle cx="18" cy="14" r="3" fill="white" />
        </svg>
      )

    case 'option':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#f1f5f9" />
          <rect x="7" y="13" width="14" height="2" rx="1" fill="#64748b" />
        </svg>
      )

    case 'options':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#f1f5f9" />
          <rect x="7" y="8" width="2" height="2" rx="0.5" fill="#64748b" />
          <rect x="11" y="8" width="10" height="2" rx="1" fill="#64748b" />
          <rect x="7" y="13" width="2" height="2" rx="0.5" fill="#64748b" />
          <rect x="11" y="13" width="10" height="2" rx="1" fill="#64748b" />
          <rect x="7" y="18" width="2" height="2" rx="0.5" fill="#64748b" />
          <rect x="11" y="18" width="8" height="2" rx="1" fill="#64748b" />
        </svg>
      )

    case 'multilink':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#ede9fe" />
          <path d="M10 14l4-4 4 4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M18 14l-4 4-4-4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )

    case 'asset':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#dcfce7" />
          <rect x="8" y="6" width="12" height="16" rx="2" stroke="#15803d" strokeWidth="1.5" fill="none" />
          <path d="M12 10h4M12 13h4M12 16h2" stroke="#15803d" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )

    case 'multiasset':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#dbeafe" />
          <rect x="10" y="6" width="10" height="13" rx="2" stroke="#1d4ed8" strokeWidth="1.5" fill="none" />
          <rect x="8" y="9" width="10" height="13" rx="2" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
        </svg>
      )

    case 'link':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#fef9c3" />
          <path d="M12 16a3 3 0 0 1 0-4l2-2a3 3 0 0 1 4 4l-1 1" stroke="#a16207" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M16 12a3 3 0 0 1 0 4l-2 2a3 3 0 0 1-4-4l1-1" stroke="#a16207" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      )

    case 'table':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#ffedd5" />
          <rect x="7" y="7" width="14" height="14" rx="2" stroke="#c2410c" strokeWidth="1.5" fill="none" />
          <line x1="7" y1="11" x2="21" y2="11" stroke="#c2410c" strokeWidth="1.2" />
          <line x1="14" y1="7" x2="14" y2="21" stroke="#c2410c" strokeWidth="1.2" />
        </svg>
      )

    case 'section':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#fee2e2" />
          <path d="M7 12a2 2 0 0 1 2-2h2l2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8z" stroke="#b91c1c" strokeWidth="1.5" fill="none" />
        </svg>
      )

    case 'custom':
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#ccfbf1" />
          <path d="M10 14c0-1.1.9-2 2-2h.5c.8 0 1.5-.7 1.5-1.5S13.3 9 12.5 9H12M18 14c0 1.1-.9 2-2 2h-.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5H16" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="10" cy="14" r="1.5" fill="#0f766e" />
          <circle cx="18" cy="14" r="1.5" fill="#0f766e" />
        </svg>
      )

    default:
      return (
        <svg width={s} height={s} viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#f1f5f9" />
          <rect x="8" y="12" width="12" height="4" rx="2" fill="#94a3b8" />
        </svg>
      )
  }
}

// Small inline icon for field rows (20px)
export function FieldIconSmall({ type }: { type: FieldType }) {
  return <FieldIcon type={type} size={24} />
}
