import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { markdown } from '@codemirror/lang-markdown';

const mdHighlighting = HighlightStyle.define([
  { tag: t.heading1, class: 'cm-h1' },
  { tag: t.heading2, class: 'cm-h2' },
  { tag: t.heading3, class: 'cm-h3' },
  { tag: t.heading4, class: 'cm-h4' },
  { tag: t.heading5, class: 'cm-h5' },
  { tag: t.heading6, class: 'cm-h6' },
  { tag: t.strong, class: 'cm-bold' },
  { tag: t.emphasis, class: 'cm-italic' },
  { tag: t.strikethrough, class: 'cm-strikethrough' },
  { tag: t.link, class: 'cm-link-text' },
  { tag: t.url, class: 'cm-url' },
  { tag: t.processingInstruction, class: 'cm-formatting' },
  { tag: t.meta, class: 'cm-formatting' },
  { tag: t.punctuation, class: 'cm-formatting' },
  { tag: t.monospace, class: 'cm-inline-code' },
  { tag: t.quote, class: 'cm-blockquote' },
  { tag: t.list, class: 'cm-list-item' },
]);

export interface EditorAreaRef {
  insertCommand: (action: string) => void;
}

interface EditorAreaProps {
  content: string;
  onChange: (value: string) => void;
  onSlashCommand: () => void;
}

export const EditorArea = forwardRef<EditorAreaRef, EditorAreaProps>(
  ({ content, onChange, onSlashCommand }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const slashPosRef = useRef<number>(-1);

    useImperativeHandle(ref, () => ({
      insertCommand: (action: string) => {
        if (!viewRef.current) return;
        
        let from = viewRef.current.state.selection.main.head;
        let to = from;
        
        if (slashPosRef.current !== -1) {
            const checkFrom = slashPosRef.current - 1;
            if (checkFrom >= 0 && viewRef.current.state.doc.sliceString(checkFrom, slashPosRef.current) === '/') {
                from = checkFrom;
                to = slashPosRef.current;
            }
        }

        let anchor = from + action.length;
        let head = anchor;

        if (action === '**bold**') {
            anchor = from + 2;
            head = from + 6;
        } else if (action === '*italic*') {
            anchor = from + 1;
            head = from + 7;
        } else if (action === '![alt text](image_url)') {
            anchor = from + 2;
            head = from + 10;
        } else if (action === '[link text](url)') {
            anchor = from + 1;
            head = from + 10;
        }
        
        viewRef.current.dispatch({
          changes: { from, to, insert: action },
          selection: { anchor, head }
        });
        viewRef.current.focus();
        slashPosRef.current = -1;
      }
    }));

    useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        onChange(newContent);

        // Check for slash command
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        const lineText = line.text;
        const cursorInLine = pos - line.from;

        if (lineText[cursorInLine - 1] === '/') {
          slashPosRef.current = pos;
          onSlashCommand();
        }
      }
    });

    const customTheme = EditorView.theme({
      '&': {
        backgroundColor: 'var(--md-primary-bg)',
        color: 'var(--md-text-primary)',
        fontSize: '15px',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
        height: '100%',
        outline: 'none',
      },
      '.cm-content': {
        caretColor: 'var(--md-highlight)',
        padding: '24px 0',
        lineHeight: '1.7',
      },
      '.cm-line': {
        padding: '0 4px',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--md-highlight)',
        borderLeftWidth: '2px',
      },
      '.cm-selectionBackground': {
        backgroundColor: 'rgba(112, 119, 161, 0.3) !important',
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(112, 119, 161, 0.3) !important',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(66, 71, 105, 0.3)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--md-primary-bg)',
        color: 'var(--md-accent-muted)',
        border: 'none',
        paddingRight: '8px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'rgba(66, 71, 105, 0.3)',
      },
      // Markdown WYSIWYG styles
      '.cm-h1': {
        fontSize: '2.25em',
        fontWeight: 'bold',
        color: 'var(--md-highlight)',
        display: 'inline-block',
        marginTop: '0.67em',
        marginBottom: '0.33em',
      },
      '.cm-h2': {
        fontSize: '1.75em',
        fontWeight: 'bold',
        color: 'var(--md-highlight)',
        display: 'inline-block',
        marginTop: '0.67em',
        marginBottom: '0.33em',
      },
      '.cm-h3': {
        fontSize: '1.375em',
        fontWeight: 'bold',
        color: 'var(--md-highlight)',
        display: 'inline-block',
        marginTop: '0.67em',
        marginBottom: '0.33em',
      },
      '.cm-h4': { fontSize: '1.15em', fontWeight: 'bold', color: 'var(--md-highlight)' },
      '.cm-h5': { fontSize: '1em', fontWeight: 'bold', color: 'var(--md-highlight)' },
      '.cm-h6': { fontSize: '0.875em', fontWeight: 'bold', color: 'var(--md-text-primary)' },
      '.cm-bold': {
        fontWeight: 'bold',
        color: 'var(--md-highlight)',
      },
      '.cm-italic': {
        fontStyle: 'italic',
        color: 'var(--md-text-primary)',
      },
      '.cm-link-text': {
        color: '#7DD3FC',
        textDecoration: 'underline',
      },
      '.cm-url': {
        color: 'var(--md-accent-muted)',
      },
      '.cm-inline-code': {
        color: '#A5F3FC',
        backgroundColor: 'rgba(66, 71, 105, 0.5)',
        padding: '2px 4px',
        borderRadius: '3px',
      },
      '.cm-blockquote': {
        color: 'var(--md-text-secondary)',
        fontStyle: 'italic',
      },
      '.cm-list-item': {
        color: 'var(--md-highlight)',
      },
      
      // WYSIWYG Magic: Hide formatting characters when not on the active line
      '.cm-line:not(.cm-activeLine) .cm-formatting': {
        display: 'none',
      },
      '.cm-line:not(.cm-activeLine) .cm-url': {
        display: 'none',
      },
      
      '&.cm-focused': {
        outline: 'none',
      },
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        history(),
        syntaxHighlighting(mdHighlighting),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        foldGutter(),
        markdown(),
        customTheme,
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Update content when prop changes (but not from own changes)
  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (content !== currentContent) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
      }
    }
  }, [content]);

  return (
    <div className="h-full w-full overflow-auto">
      <div ref={editorRef} className="h-full min-h-full" />
    </div>
  );
});