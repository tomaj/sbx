'use client';

import { HelpCircle } from 'lucide-react';

interface Props {
  label: string;
  required?: boolean;
  description?: string | null;
}

export function FieldLabel({ label, required, description }: Props) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      {description && (
        <div className="relative group">
          <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-60 text-xs bg-gray-900 text-white rounded-md px-2.5 py-2 shadow-lg z-50 pointer-events-none">
            {description}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}
