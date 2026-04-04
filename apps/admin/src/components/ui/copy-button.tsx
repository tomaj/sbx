'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  title?: string;
  className?: string;
}

/**
 * Button that copies `text` to clipboard and shows a checkmark for 1.5 s.
 *
 * Usage:
 *   <CopyButton text={token.token} />
 *   <CopyButton text={apiKey} title="Copy API key" className="..." />
 */
export function CopyButton({ text, title = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : title}
      className={`flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
