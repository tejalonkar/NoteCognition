import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

declare global {
  interface Window {
    editormd: any;
    jQuery: any;
    $: any;
  }
}

export interface EditorAreaRef {
  insertCommand: (action: string) => void;
}

interface EditorAreaProps {
  content: string;
  onChange: (value: string) => void;
  viewMode?: 'editor' | 'preview' | 'split';
}

export const EditorArea = forwardRef<EditorAreaRef, EditorAreaProps>(
  ({ content, onChange, viewMode = 'editor' }, ref) => {
    const editorId = 'editormd-container';
    const editorInstance = useRef<any>(null);
    const contentRef = useRef(content);
    const isInternalChange = useRef(false);

    useImperativeHandle(ref, () => ({
      insertCommand: (action: string) => {
        if (editorInstance.current && editorInstance.current.cm) {
          const cm = editorInstance.current.cm;
          cm.replaceSelection(action);
          cm.focus();
        }
      }
    }));

    useEffect(() => {
      const initEditor = () => {
        if (!window.editormd) {
          console.error('Editor.md is not loaded. Make sure it is included in index.html');
          return;
        }

        editorInstance.current = window.editormd(editorId, {
          width: "100%",
          height: "100%",
          path: "/editormd/lib/",
          theme: "dark",
          previewTheme: "dark",
          editorTheme: "pastel-on-dark",
          markdown: content,
          codeFold: true,
          language: "en",
          saveHTMLToTextarea: true,
          searchReplace: true,
          htmlDecode: "style,script,iframe|on*",
          emoji: true,
          taskList: true,
          tocm: true,
          tex: true,
          flowChart: true,
          sequenceDiagram: true,
          imageUpload: true,
          imageFormats: ["jpg", "jpeg", "gif", "png", "bmp", "webp"],
          imageUploadURL: "./php/upload.php",
          onload: function() {
            if (viewMode === 'editor') {
                this.unwatch();
            } else if (viewMode === 'split') {
                this.watch();
            } else if (viewMode === 'preview') {
                this.watch().previewing();
            }
          },
          onchange: function() {
            const currentVal = this.getMarkdown();
            if (currentVal !== contentRef.current) {
               isInternalChange.current = true;
               contentRef.current = currentVal;
               onChange(currentVal);
               
               setTimeout(() => {
                 isInternalChange.current = false;
               }, 0);
            }
          }
        });
      };


      // Delay slightly to ensure jQuery and editormd are ready if loaded via script tags
      const timer = setTimeout(initEditor, 500);

      return () => {
        clearTimeout(timer);
        if (editorInstance.current) {
          // editor.md doesn't have a clean destroy but we can remove the container content
          const container = document.getElementById(editorId);
          if (container) container.innerHTML = "";
        }
      };
    }, []);

    // Sync viewMode
    useEffect(() => {
      if (editorInstance.current && editorInstance.current.state?.loaded) {
        if (viewMode === 'editor') {
            editorInstance.current.unwatch();
        } else if (viewMode === 'split') {
            editorInstance.current.watch();
        } else if (viewMode === 'preview') {
            editorInstance.current.watch().previewing();
        }
      }
    }, [viewMode]);

    // Update content when prop changes from outside
    useEffect(() => {
      if (editorInstance.current && editorInstance.current.state?.loaded && content !== contentRef.current) {
        if (!isInternalChange.current) {
            contentRef.current = content;
            editorInstance.current.setMarkdown(content);
        }
      }
    }, [content]);

    return (
      <div className="h-full w-full relative">
        <style dangerouslySetInnerHTML={{ __html: `
            .editormd {
                border: none !important;
                background: transparent !important;
            }
            .editormd-toolbar {
                background: rgba(30, 32, 48, 0.8) !important;
                border-bottom: 1px solid var(--md-border) !important;
            }
            .editormd-menu > li > a {
                color: var(--md-text-secondary) !important;
            }
            .editormd-menu > li > a:hover {
                color: var(--md-highlight) !important;
            }
            .CodeMirror {
                background: transparent !important;
                color: var(--md-text-primary) !important;
                font-family: 'JetBrains Mono', monospace !important;
            }
            .editormd-preview {
                background: var(--md-primary-bg) !important;
                color: var(--md-text-primary) !important;
            }
            .editormd-preview-container {
                background: var(--md-primary-bg) !important;
                color: var(--md-text-primary) !important;
                padding: 40px !important;
            }
            /* Dark theme overrides for Markdown preview */
            .editormd-preview-container h1, .editormd-preview-container h2, .editormd-preview-container h3 {
                border-bottom-color: var(--md-border) !important;
                color: var(--md-highlight) !important;
            }
            .editormd-preview-container blockquote {
                color: var(--md-text-secondary) !important;
                border-left-color: var(--md-highlight) !important;
            }
            /* Scrollbar */
            .editormd-preview::-webkit-scrollbar,
            .CodeMirror-vscrollbar::-webkit-scrollbar {
                width: 8px;
            }
            .editormd-preview::-webkit-scrollbar-thumb,
            .CodeMirror-vscrollbar::-webkit-scrollbar-thumb {
                background: var(--md-border);
                border-radius: 4px;
            }
        `}} />
        <div id={editorId} className="h-full w-full" />
      </div>
    );
  }
);