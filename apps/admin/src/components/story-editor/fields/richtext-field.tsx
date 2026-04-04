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
import { useEffect, useRef, useState } from 'react';
import type { RichtextFieldDef } from '@/components/block-library/edit-block-modal/types';
import {
  Bold,
  Italic,
  Strikethrough,
  UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Undo,
  Redo,
  Eraser,
  Quote,
  Code,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Highlighter,
  Palette,
  Image as ImageIcon,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  Anchor,
} from 'lucide-react';

interface Props {
  fieldKey: string;
  def: RichtextFieldDef;
  value: any;
  onChange: (v: any) => void;
}

const HEADING_OPTIONS = [
  { label: 'Text', value: 0 },
  { label: 'H1', value: 1 },
  { label: 'H2', value: 2 },
  { label: 'H3', value: 3 },
  { label: 'H4', value: 4 },
  { label: 'H5', value: 5 },
  { label: 'H6', value: 6 },
];

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', color: '#fef08a' },
  { label: 'Green', color: '#bbf7d0' },
  { label: 'Blue', color: '#bfdbfe' },
  { label: 'Pink', color: '#fbcfe8' },
  { label: 'Orange', color: '#fed7aa' },
];

const TEXT_COLORS = [
  { label: 'Default', color: null },
  { label: 'Red', color: '#ef4444' },
  { label: 'Orange', color: '#f97316' },
  { label: 'Amber', color: '#f59e0b' },
  { label: 'Green', color: '#22c55e' },
  { label: 'Blue', color: '#3b82f6' },
  { label: 'Purple', color: '#a855f7' },
  { label: 'Pink', color: '#ec4899' },
  { label: 'Gray', color: '#6b7280' },
];

// Simple tooltip wrapper
function Tooltip({ label, children }: { label: string; children: React.ReactElement }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  function show() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.top + window.scrollY - 6, left: r.left + r.width / 2 + window.scrollX });
    }
    setVisible(true);
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="fixed z-[9999] px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full whitespace-nowrap"
          style={{ top: pos.top, left: pos.left }}
        >
          {label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={title}>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onClick();
        }}
        disabled={disabled}
        className={`p-1.5 rounded transition-colors ${active ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} disabled:opacity-40`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 self-center" />;
}

function ColorPicker({
  label,
  colors,
  onSelect,
  activeColor,
  icon,
}: {
  label: string;
  colors: { label: string; color: string | null }[];
  onSelect: (color: string | null) => void;
  activeColor?: string | null;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <Tooltip label={label}>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
          }}
          className={`p-1.5 rounded transition-colors ${activeColor ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          {icon}
        </button>
      </Tooltip>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 flex flex-wrap gap-1"
          style={{ minWidth: 120 }}
        >
          {colors.map((c) => (
            <Tooltip key={c.label} label={c.label}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(c.color);
                  setOpen(false);
                }}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:scale-110 transition-transform"
                style={{ backgroundColor: c.color ?? 'transparent' }}
              >
                {!c.color && <span className="text-xs text-gray-500">∅</span>}
              </button>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
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

  const currentHeading =
    HEADING_OPTIONS.find((h) =>
      h.value === 0 ? editor.isActive('paragraph') : editor.isActive('heading', { level: h.value }),
    ) ?? HEADING_OPTIONS[0];

  function setHeading(level: number) {
    if (level === 0) {
      editor!.chain().focus().setParagraph().run();
    } else {
      editor!
        .chain()
        .focus()
        .toggleHeading({ level: level as any })
        .run();
    }
  }

  function setLink() {
    const previous = editor!.getAttributes('link').href;
    const url = window.prompt('URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function setAnchor() {
    const current = editor!.getAttributes('anchor')?.id ?? '';
    const id = window.prompt('Anchor ID', current);
    if (id === null) return;
    // Set anchor as an id attribute on the current node via HTML attribute
    // We store it as a link with special anchor href
    if (id === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor!
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: `#${id}` })
      .run();
  }

  function insertImage() {
    const url = window.prompt('Image URL', 'https://');
    if (!url) return;
    editor!.chain().focus().setImage({ src: url }).run();
  }

  function insertTable() {
    editor!.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const activeTextColor = editor.getAttributes('textStyle')?.color ?? null;
  const activeHighlight = editor.getAttributes('highlight')?.color ?? null;

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
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {/* Heading dropdown */}
          <Tooltip label="Text style">
            <select
              value={currentHeading.value}
              onChange={(e) => setHeading(Number(e.target.value))}
              className="text-xs px-1.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 mr-1"
            >
              {HEADING_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </Tooltip>

          <Divider />

          {/* Lists */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered list"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block"
          >
            <Code2 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal rule"
          >
            <Minus className="w-4 h-4" />
          </ToolbarBtn>

          <Divider />

          {/* Link & Anchor & Image */}
          <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Add link">
            <LinkIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={setAnchor} title="Add anchor">
            <Anchor className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={insertImage} title="Insert image">
            <ImageIcon className="w-4 h-4" />
          </ToolbarBtn>

          <Divider />

          {/* Table */}
          <ToolbarBtn onClick={insertTable} active={editor.isActive('table')} title="Insert table">
            <TableIcon className="w-4 h-4" />
          </ToolbarBtn>

          <Divider />

          {/* Text alignment */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align left"
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align center"
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align right"
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            active={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </ToolbarBtn>

          <Divider />

          {/* Inline marks */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={editor.isActive('superscript')}
            title="Superscript"
          >
            <SuperscriptIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={editor.isActive('subscript')}
            title="Subscript"
          >
            <SubscriptIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          >
            <Code className="w-4 h-4" />
          </ToolbarBtn>

          {/* Text color */}
          <ColorPicker
            label="Text color"
            colors={TEXT_COLORS}
            activeColor={activeTextColor}
            onSelect={(color) => {
              if (color) {
                editor.chain().focus().setColor(color).run();
              } else {
                editor.chain().focus().unsetColor().run();
              }
            }}
            icon={
              <Palette
                className="w-4 h-4"
                style={activeTextColor ? { color: activeTextColor } : undefined}
              />
            }
          />

          {/* Highlight color */}
          <ColorPicker
            label="Highlight"
            colors={HIGHLIGHT_COLORS}
            activeColor={activeHighlight}
            onSelect={(color) => {
              if (color) {
                editor.chain().focus().setHighlight({ color }).run();
              } else {
                editor.chain().focus().unsetHighlight().run();
              }
            }}
            icon={
              <Highlighter
                className="w-4 h-4"
                style={activeHighlight ? { color: activeHighlight } : undefined}
              />
            }
          />

          <ToolbarBtn
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            title="Clear formatting"
          >
            <Eraser className="w-4 h-4" />
          </ToolbarBtn>

          <Divider />

          {/* History */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo (Ctrl+Z)"
            disabled={!editor.can().undo()}
          >
            <Undo className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo (Ctrl+Shift+Z)"
            disabled={!editor.can().redo()}
          >
            <Redo className="w-4 h-4" />
          </ToolbarBtn>

          <Divider />

          {/* Fullscreen */}
          <ToolbarBtn
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </ToolbarBtn>
        </div>

        {/* Table controls (shown when inside a table) */}
        {editor.isActive('table') && (
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-950/30 text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-medium mr-1">Table:</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().addColumnBefore().run();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
            >
              + Col before
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().addColumnAfter().run();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
            >
              + Col after
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().deleteColumn().run();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
            >
              − Col
            </button>
            <span className="text-blue-400 mx-0.5">|</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().addRowBefore().run();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
            >
              + Row before
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().addRowAfter().run();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
            >
              + Row after
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().deleteRow().run();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300"
            >
              − Row
            </button>
            <span className="text-blue-400 mx-0.5">|</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().deleteTable().run();
              }}
              className="px-1.5 py-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
            >
              Delete table
            </button>
          </div>
        )}

        {/* Editor content */}
        <EditorContent
          editor={editor}
          className={`prose prose-sm dark:prose-invert max-w-none px-4 py-3 focus-within:outline-none text-gray-900 dark:text-gray-100 [&_.ProseMirror]:outline-none [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:dark:border-gray-600 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:dark:border-gray-600 [&_th]:p-2 [&_th]:bg-gray-100 [&_th]:dark:bg-gray-700 ${isFullscreen ? 'flex-1 overflow-auto min-h-0 [&_.ProseMirror]:min-h-full' : 'min-h-[140px] [&_.ProseMirror]:min-h-[120px]'}`}
        />
      </div>
    </div>
  );
}
