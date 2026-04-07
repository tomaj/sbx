'use client';

import type { Editor } from '@tiptap/react';
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
import { ToolbarBtn } from './toolbar-button';
import { ColorPicker } from './color-picker';
import { HEADING_OPTIONS, HIGHLIGHT_COLORS, TEXT_COLORS } from './constants';

function Divider() {
  return <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5 self-center" />;
}

interface ToolbarProps {
  editor: Editor;
  isFullscreen: boolean;
  setIsFullscreen: (fn: (v: boolean) => boolean) => void;
}

export function Toolbar({ editor, isFullscreen, setIsFullscreen }: ToolbarProps) {
  const currentHeading =
    HEADING_OPTIONS.find((h) =>
      h.value === 0 ? editor.isActive('paragraph') : editor.isActive('heading', { level: h.value }),
    ) ?? HEADING_OPTIONS[0];

  function setHeading(level: number) {
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor
        .chain()
        .focus()
        .toggleHeading({ level: level as any })
        .run();
    }
  }

  function setLink() {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function setAnchor() {
    const current = editor.getAttributes('anchor')?.id ?? '';
    const id = window.prompt('Anchor ID', current);
    if (id === null) return;
    if (id === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: `#${id}` })
      .run();
  }

  function insertImage() {
    const url = window.prompt('Image URL', 'https://');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const activeTextColor = editor.getAttributes('textStyle')?.color ?? null;
  const activeHighlight = editor.getAttributes('highlight')?.color ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {/* Heading dropdown */}
        <select
          title="Text style"
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
    </>
  );
}
