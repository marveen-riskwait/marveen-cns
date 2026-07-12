import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

import { AiAPI, errMsg } from "../api/client";
import { useToast } from "../contexts/ToastContext";

const AI_ACTIONS = [
  ["improve", "Améliorer", "bi-stars"],
  ["rewrite", "Réécrire", "bi-arrow-repeat"],
  ["shorten", "Raccourcir", "bi-arrows-collapse"],
  ["lengthen", "Développer", "bi-arrows-expand"],
  ["professional", "Ton professionnel", "bi-briefcase"],
  ["friendly", "Ton chaleureux", "bi-emoji-smile"],
];

// Turn plain AI text (with blank-line paragraphs) into simple HTML.
const textToHtml = (text) =>
  text.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>").trim()}</p>`).join("");

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

function AiMenu({ editor }) {
  const { push } = useToast();
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { AiAPI.status().then((s) => setAvailable(!!s.configured)); }, []);
  if (!available) return null;

  const run = async (action) => {
    setOpen(false);
    const text = editor.getText().trim();
    if (!text) { push("Écrivez d'abord un peu de texte.", "error"); return; }
    setBusy(true);
    try {
      const result = await AiAPI.assist({ action, text });
      editor.commands.setContent(textToHtml(result), true); // emits update -> onChange
      push("Texte mis à jour par l'IA");
    } catch (err) {
      push(errMsg(err, "L'assistant IA a échoué"), "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="btn-group btn-group-sm position-relative">
      <button type="button" className="btn btn-outline-primary" disabled={busy}
              onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)} title="Assistant IA">
        {busy ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-magic" />}
        <span className="ms-1">IA</span>
      </button>
      {open && (
        <div className="card border-0 shadow position-absolute" style={{ top: "100%", left: 0, zIndex: 20, minWidth: 200 }}>
          <div className="list-group list-group-flush">
            {AI_ACTIONS.map(([action, label, icon]) => (
              <button key={action} type="button" className="list-group-item list-group-item-action small"
                      onMouseDown={(e) => e.preventDefault()} onClick={() => run(action)}>
                <i className={`bi ${icon} me-2`} />{label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
        <AiMenu editor={editor} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
