'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('');

  function add() {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setInput('');
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] text-sm bg-transparent focus:outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
      />
    </div>
  );
}
