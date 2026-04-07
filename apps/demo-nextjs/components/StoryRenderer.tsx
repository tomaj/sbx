'use client';

import { storyblokEditable } from '@storyblok/react';

interface BlockProps {
  blok: Record<string, any>;
  depth?: number;
}

// Renders rich text content (simplified)
function RichTextContent({ content }: { content: any }) {
  if (!content) return null;
  if (typeof content === 'string') return <span>{content}</span>;
  if (content.type === 'doc' && content.content) {
    return (
      <div className="richtext">
        {content.content.map((node: any, i: number) => (
          <RichTextNode key={i} node={node} />
        ))}
      </div>
    );
  }
  return null;
}

function RichTextNode({ node }: { node: any }) {
  if (!node) return null;
  if (node.type === 'paragraph') {
    return (
      <p style={{ marginBottom: '0.75rem' }}>
        {node.content?.map((child: any, i: number) => (
          <RichTextNode key={i} node={child} />
        ))}
      </p>
    );
  }
  if (node.type === 'heading') {
    const Tag = `h${node.attrs?.level ?? 2}` as unknown as React.ElementType;
    return (
      <Tag style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>
        {node.content?.map((child: any, i: number) => (
          <RichTextNode key={i} node={child} />
        ))}
      </Tag>
    );
  }
  if (node.type === 'text') {
    let text: React.ReactNode = node.text;
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = <strong>{text}</strong>;
        if (mark.type === 'italic') text = <em>{text}</em>;
        if (mark.type === 'link') text = <a href={mark.attrs?.href}>{text}</a>;
      }
    }
    return <>{text}</>;
  }
  if (node.type === 'bullet_list') {
    return (
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
        {node.content?.map((child: any, i: number) => (
          <RichTextNode key={i} node={child} />
        ))}
      </ul>
    );
  }
  if (node.type === 'list_item') {
    return (
      <li>
        {node.content?.map((child: any, i: number) => (
          <RichTextNode key={i} node={child} />
        ))}
      </li>
    );
  }
  return null;
}

// Generic block renderer — handles any block type
function Block({ blok, depth = 0 }: BlockProps) {
  if (!blok?.component) return null;

  const editableAttrs = storyblokEditable(blok);

  // Specific renderers for common block types
  switch (blok.component) {
    case 'page':
      return (
        <div {...editableAttrs} data-component="page">
          {(blok.body ?? blok.content ?? []).map((child: any) => (
            <Block key={child._uid} blok={child} depth={depth + 1} />
          ))}
        </div>
      );

    default:
      return <GenericBlock blok={blok} depth={depth} editableAttrs={editableAttrs} />;
  }
}

// Generic fallback renderer
function GenericBlock({
  blok,
  depth,
  editableAttrs,
}: {
  blok: Record<string, any>;
  depth: number;
  editableAttrs: Record<string, any>;
}) {
  const bgColor = depth % 2 === 0 ? '#f9fafb' : '#fff';

  return (
    <div
      {...editableAttrs}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1rem',
        margin: '0.75rem',
        background: bgColor,
        cursor: 'pointer',
      }}
    >
      {/* Component header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <span
          style={{
            background: '#0ea5e9',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.1rem 0.4rem',
            borderRadius: '9999px',
            letterSpacing: '0.05em',
          }}
        >
          {blok.component}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace' }}>
          {blok._uid?.slice(0, 8)}
        </span>
      </div>

      {/* Render fields */}
      {Object.entries(blok).map(([key, val]) => {
        if (key.startsWith('_') || key === 'component') return null;

        // Nested blocks array
        if (Array.isArray(val) && val.length > 0 && val[0]?._uid) {
          return (
            <div key={key} style={{ marginTop: '0.5rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: 600,
                  marginBottom: '0.25rem',
                }}
              >
                {key}
              </div>
              {val.map((child: any) => (
                <Block key={child._uid} blok={child} depth={depth + 1} />
              ))}
            </div>
          );
        }

        // Rich text
        if (val && typeof val === 'object' && val.type === 'doc') {
          return (
            <div key={key} style={{ marginTop: '0.5rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: 600,
                  marginBottom: '0.25rem',
                }}
              >
                {key}
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                <RichTextContent content={val} />
              </div>
            </div>
          );
        }

        // Asset
        if (val && typeof val === 'object' && val.filename) {
          return (
            <div key={key} style={{ marginTop: '0.5rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: 600,
                  marginBottom: '0.25rem',
                }}
              >
                {key}
              </div>
              <img
                src={val.filename}
                alt={val.alt ?? key}
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4, objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          );
        }

        // String/number primitives
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          if (String(val).length > 200) {
            return (
              <div key={key} style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>{key}</div>
                <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: 2 }}>
                  {String(val).slice(0, 200)}…
                </div>
              </div>
            );
          }
          if (!String(val)) return null;
          return (
            <div
              key={key}
              style={{
                marginTop: '0.25rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: 600,
                  flexShrink: 0,
                  minWidth: '6rem',
                }}
              >
                {key}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#111' }}>{String(val)}</span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

interface StoryRendererProps {
  story: {
    content: Record<string, any>;
    name: string;
    full_slug: string;
  };
}

export function StoryRenderer({ story }: StoryRendererProps) {
  const content = story.content;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Story header */}
      <div
        style={{
          padding: '1.5rem 1.5rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111' }}>{story.name}</h1>
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>
          {story.full_slug}
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '0.75rem' }}>
        <Block blok={content} />
      </div>
    </div>
  );
}
