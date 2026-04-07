'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { useEffect, useState } from 'react';
import type { RichtextFieldDef } from '@/components/block-library/edit-block-modal/types';
import { Toolbar } from './toolbar';

interface Props {
  fieldKey: string;
  def: RichtextFieldDef;
  value: any;
  onChange: (v: any) => void;
}

export function RichtextField({ fieldKey, def, value, onChange }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Superscript,
      Subscript,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content:
      value && typeof value === 'object' && value.type === 'doc'
        ? value
        : { type: 'doc', content: [] },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    const incoming =
      value && typeof value === 'object' && value.type === 'doc'
        ? value
        : { type: 'doc', content: [] };
    const current = editor.getJSON();
    if (JSON.stringify(incoming) !== JSON.stringify(current)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  const wrapperClass = isFullscreen
    ? 'fixed inset-0 z-[100] flex flex-col bg-white dark:bg-gray-900'
    : 'border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800';

  return (
    <div>
      {!isFullscreen && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {def.display_name || fieldKey}
          {def.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {!isFullscreen && def.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{def.description}</p>
      )}

      <div className={wrapperClass}>
        <Toolbar editor={editor} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className={`prose prose-sm dark:prose-invert max-w-none px-4 py-3 focus-within:outline-none text-gray-900 dark:text-gray-100 [&_.ProseMirror]:outline-none [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:dark:border-gray-600 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:dark:border-gray-600 [&_th]:p-2 [&_th]:bg-gray-100 [&_th]:dark:bg-gray-700 ${isFullscreen ? 'flex-1 overflow-auto min-h-0 [&_.ProseMirror]:min-h-full' : 'min-h-[140px] [&_.ProseMirror]:min-h-[120px]'} ${def.custom_class ?? ''}`}
        />
      </div>

      {def.max_length !== undefined && <RichtextCounter editor={editor} max={def.max_length} />}
    </div>
  );
}

function RichtextCounter({ editor, max }: { editor: ReturnType<typeof useEditor>; max: number }) {
  const length = editor?.getText().length ?? 0;
  const over = length > max;
  return (
    <p className={`text-xs mt-1 text-right ${over ? 'text-red-500' : 'text-gray-400'}`}>
      {length} / {max}
    </p>
  );
}
