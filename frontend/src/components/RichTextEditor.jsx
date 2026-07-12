import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

// Controlled WYSIWYG editor producing HTML. Used by FieldInput for "richtext"
// fields (e.g. the text block). The parent owns the HTML string.
function Btn({ active, onClick, title, children }) {
  return (
    <button type="button" title={title}
            className={"btn btn-sm " + (active ? "btn-secondary" : "btn-outline-secondary")}
            onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "mv-richtext form-control" } },
  });

  // Sync in external changes (e.g. loading a page, restoring a revision).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Lien (URL) :", prev || "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="mv-richtext-wrap">
      <div className="btn-toolbar gap-1 mb-1">
        <div className="btn-group btn-group-sm">
          <Btn title="Gras" active={editor.isActive("bold")}
               onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></Btn>
          <Btn title="Italique" active={editor.isActive("italic")}
               onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Btn>
        </div>
        <div className="btn-group btn-group-sm">
          <Btn title="Titre 2" active={editor.isActive("heading", { level: 2 })}
               onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
          <Btn title="Titre 3" active={editor.isActive("heading", { level: 3 })}
               onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
        </div>
        <div className="btn-group btn-group-sm">
          <Btn title="Liste à puces" active={editor.isActive("bulletList")}
               onClick={() => editor.chain().focus().toggleBulletList().run()}><i className="bi bi-list-ul" /></Btn>
          <Btn title="Liste numérotée" active={editor.isActive("orderedList")}
               onClick={() => editor.chain().focus().toggleOrderedList().run()}><i className="bi bi-list-ol" /></Btn>
          <Btn title="Citation" active={editor.isActive("blockquote")}
               onClick={() => editor.chain().focus().toggleBlockquote().run()}><i className="bi bi-quote" /></Btn>
        </div>
        <div className="btn-group btn-group-sm">
          <Btn title="Lien" active={editor.isActive("link")} onClick={setLink}><i className="bi bi-link-45deg" /></Btn>
          <Btn title="Effacer le format"
               onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><i className="bi bi-eraser" /></Btn>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
