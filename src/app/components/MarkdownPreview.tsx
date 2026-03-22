import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div
      className="h-full overflow-auto px-12 py-8"
      style={{
        backgroundColor: 'var(--md-primary-bg)',
      }}
    >
      <div
        className="max-w-3xl mx-auto prose prose-invert"
        style={{
          color: 'var(--md-text-primary)',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1
                className="mb-6 mt-8 pb-2"
                style={{
                  color: 'var(--md-highlight)',
                  fontSize: '2.25rem',
                  fontWeight: '700',
                  borderBottom: '2px solid var(--md-border)',
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2
                className="mb-4 mt-8"
                style={{
                  color: 'var(--md-highlight)',
                  fontSize: '1.75rem',
                  fontWeight: '600',
                }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                className="mb-3 mt-6"
                style={{
                  color: 'var(--md-highlight)',
                  fontSize: '1.375rem',
                  fontWeight: '600',
                }}
              >
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p
                className="mb-4 leading-relaxed"
                style={{
                  color: 'var(--md-text-primary)',
                  fontSize: '1rem',
                  lineHeight: '1.8',
                }}
              >
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul
                className="mb-4 ml-6 space-y-2"
                style={{
                  listStyleType: 'disc',
                  color: 'var(--md-text-primary)',
                }}
              >
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol
                className="mb-4 ml-6 space-y-2"
                style={{
                  listStyleType: 'decimal',
                  color: 'var(--md-text-primary)',
                }}
              >
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li
                className="leading-relaxed"
                style={{
                  color: 'var(--md-text-primary)',
                  paddingLeft: '0.5rem',
                }}
              >
                {children}
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote
                className="my-6 pl-4 py-2"
                style={{
                  borderLeft: '4px solid var(--md-highlight)',
                  backgroundColor: 'rgba(66, 71, 105, 0.3)',
                  color: 'var(--md-text-secondary)',
                  fontStyle: 'italic',
                  borderRadius: '0 4px 4px 0',
                }}
              >
                {children}
              </blockquote>
            ),
            code: ({ inline, children }) =>
              inline ? (
                <code
                  className="px-2 py-0.5 rounded text-sm"
                  style={{
                    backgroundColor: 'rgba(66, 71, 105, 0.5)',
                    color: '#A5F3FC',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  }}
                >
                  {children}
                </code>
              ) : (
                <code
                  className="block px-4 py-3 rounded-lg text-sm overflow-x-auto my-4"
                  style={{
                    backgroundColor: 'var(--md-secondary-surface)',
                    color: 'var(--md-text-primary)',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineHeight: '1.6',
                  }}
                >
                  {children}
                </code>
              ),
            pre: ({ children }) => (
              <pre className="my-4 rounded-lg overflow-hidden">{children}</pre>
            ),
            hr: () => (
              <hr
                className="my-8"
                style={{
                  border: 'none',
                  borderTop: '2px solid var(--md-border)',
                }}
              />
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                className="underline hover:no-underline transition-all"
                style={{
                  color: '#7DD3FC',
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong
                style={{
                  color: 'var(--md-highlight)',
                  fontWeight: '600',
                }}
              >
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em
                style={{
                  color: 'var(--md-text-primary)',
                  fontStyle: 'italic',
                }}
              >
                {children}
              </em>
            ),
          }}
        >
          {content || '*Start typing to see preview...*'}
        </ReactMarkdown>
      </div>
    </div>
  );
}
