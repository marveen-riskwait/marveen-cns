import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AiAPI, PagesAPI, resource, errMsg } from "../api/client";
import { FieldInput, LabelledField } from "../components/FieldInput";
import { BLOCK_ORDER, BLOCK_TYPES, blockSummary, makeBlock } from "../config/blocks";
import { useToast } from "../contexts/ToastContext";

const api = resource("pages");
const WEB_URL = import.meta.env.VITE_WEB_URL || "http://localhost:3000";

let _uidSeq = 0;
const withUid = (block) => ({ ...block, _uid: block._uid || `b${Date.now()}_${_uidSeq++}` });
const stripUids = (blocks) => blocks.map(({ _uid, ...b }) => b);

const META_FIELDS = [
  { name: "title", label: "Titre", type: "text", required: true },
  { name: "slug", label: "Slug (laisser vide = auto)", type: "text" },
  { name: "status", label: "Statut", type: "select",
    options: [["draft", "Brouillon"], ["published", "Publié"], ["scheduled", "Programmé"], ["archived", "Archivé"]] },
  { name: "locale", label: "Langue", type: "text" },
];

const SEO_FIELDS = [
  { name: "meta_title", label: "Titre SEO", type: "text" },
  { name: "meta_description", label: "Description SEO", type: "textarea" },
  { name: "canonical", label: "URL canonique", type: "text" },
  { name: "robots", label: "Robots", type: "text" },
  { name: "og_image", label: "Image de partage (OG)", type: "media" },
];

const EMPTY = {
  title: "", slug: "", status: "draft", locale: "fr", is_home: false,
  published_at: null, seo: {}, blocks: [],
};

// ── datetime-local <-> ISO helpers ──────────────────────────────────
const isoToLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const localToIso = (local) => (local ? new Date(local).toISOString() : null);

// ── One sortable block card ─────────────────────────────────────────
function BlockCard({ block, index, count, onChange, onMove, onRemove }) {
  const [open, setOpen] = useState(true);
  const def = BLOCK_TYPES[block.type];
  const active = block.active !== false;
  const setData = (name, value) => onChange({ ...block, data: { ...block.data, [name]: value } });
  const toggleActive = () => onChange({ ...block, active: !active });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block._uid });
  const style = { transform: CSS.Transform.toString(transform), transition,
                  opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style}
         className={"card border-0 shadow-sm mb-2" + (active ? "" : " opacity-50")}>
      <div className="card-header bg-transparent d-flex align-items-center gap-2">
        <button type="button" className="btn btn-sm btn-link text-secondary p-0 mv-drag"
                title="Glisser pour réordonner" {...attributes} {...listeners}>
          <i className="bi bi-grip-vertical" />
        </button>
        <i className={`bi ${def.icon} text-secondary`} />
        <button type="button" className="btn btn-link p-0 text-start flex-grow-1 text-decoration-none"
                onClick={() => setOpen((o) => !o)}>
          <span className="fw-medium">{def.label}</span>
          {!active && <span className="badge text-bg-secondary ms-2">masqué</span>}
          {!open && <span className="text-secondary small ms-2 text-truncate">— {blockSummary(block)}</span>}
        </button>
        <div className="form-check form-switch mb-0 me-1" title="Actif / masqué">
          <input className="form-check-input" type="checkbox" checked={active} onChange={toggleActive} />
        </div>
        <div className="btn-group btn-group-sm">
          <button type="button" className="btn btn-outline-secondary" disabled={index === 0}
                  onClick={() => onMove(index, -1)} title="Monter"><i className="bi bi-arrow-up" /></button>
          <button type="button" className="btn btn-outline-secondary" disabled={index === count - 1}
                  onClick={() => onMove(index, 1)} title="Descendre"><i className="bi bi-arrow-down" /></button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setOpen((o) => !o)}
                  title={open ? "Replier" : "Déplier"}><i className={`bi bi-chevron-${open ? "up" : "down"}`} /></button>
          <button type="button" className="btn btn-outline-danger"
                  onClick={() => onRemove(index)} title="Supprimer"><i className="bi bi-trash" /></button>
        </div>
      </div>
      {open && (
        <div className="card-body">
          {def.fields.map((f) => (
            <LabelledField key={f.name} f={f} value={block.data?.[f.name]}
                           onChange={(v) => setData(f.name, v)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add-block palette ───────────────────────────────────────────────
function AddBlock({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-center my-3 position-relative">
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setOpen((o) => !o)}>
        <i className="bi bi-plus-lg me-1" /> Ajouter un bloc
      </button>
      {open && (
        <div className="card border-0 shadow mt-2 mx-auto" style={{ maxWidth: 520 }}>
          <div className="card-body d-flex flex-wrap gap-2 justify-content-center">
            {BLOCK_ORDER.map((type) => (
              <button key={type} type="button" className="btn btn-light border text-center"
                      style={{ width: 110 }}
                      onClick={() => { onAdd(type); setOpen(false); }}>
                <i className={`bi ${BLOCK_TYPES[type].icon} d-block fs-5 mb-1`} />
                <span className="small">{BLOCK_TYPES[type].label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Revision history panel ──────────────────────────────────────────
function HistoryPanel({ pageId, onRestored }) {
  const { push } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = () => {
    setLoading(true);
    PagesAPI.revisions(pageId, { per_page: 50 })
      .then((d) => setItems(d.items || []))
      .catch((err) => push(errMsg(err, "Historique indisponible"), "error"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [pageId]);  // eslint-disable-line react-hooks/exhaustive-deps

  const restore = async (rev) => {
    if (!window.confirm(`Restaurer la version #${rev.number} ?`)) return;
    setBusy(rev.id);
    try {
      await PagesAPI.restoreRevision(pageId, rev.id);
      push(`Version #${rev.number} restaurée`);
      onRestored();
      load();
    } catch (err) {
      push(errMsg(err, "Restauration impossible"), "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-secondary py-4"><span className="spinner-border spinner-border-sm me-2" />Chargement…</div>;
  if (items.length === 0) return <div className="text-secondary py-4">Aucune version enregistrée pour le moment.</div>;

  return (
    <div className="card border-0 shadow-sm"><div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light"><tr>
          <th>Version</th><th>Auteur</th><th>Date</th><th>Titre</th>
          <th className="text-end">Actions</th>
        </tr></thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>#{r.number}</td>
              <td className="text-secondary">{r.author_name || "—"}</td>
              <td className="text-secondary small">{new Date(r.snapshot_at || r.created_at).toLocaleString("fr-FR")}</td>
              <td>{r.title}</td>
              <td className="text-end">
                <button className="btn btn-outline-secondary btn-sm" disabled={busy === r.id}
                        onClick={() => restore(r)}>
                  <i className="bi bi-arrow-counterclockwise me-1" />Restaurer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div></div>
  );
}

export function PageBuilder() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { push } = useToast();

  const [page, setPage] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("content");
  const [saveState, setSaveState] = useState("saved"); // saved | dirty | saving | error
  const [previewOn, setPreviewOn] = useState(false);
  const [previewToken, setPreviewToken] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [aiOn, setAiOn] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const hydratedRef = useRef(false);
  const timerRef = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const reload = () => {
    hydratedRef.current = false;
    api.get(id).then((data) => {
      setPage({ ...EMPTY, ...data, seo: data.seo || {}, blocks: (data.blocks || []).map(withUid) });
      setTimeout(() => { hydratedRef.current = true; }, 0);
    });
  };

  // Mint a preview token when the preview pane opens.
  useEffect(() => {
    if (previewOn && !previewToken && !isNew) {
      PagesAPI.previewToken(id).then((d) => setPreviewToken(d.token)).catch(() => {});
    }
  }, [previewOn, previewToken, isNew, id]);

  // Refresh the preview iframe after each successful save.
  useEffect(() => {
    if (previewOn && saveState === "saved") setPreviewKey((k) => k + 1);
  }, [saveState, previewOn]);

  useEffect(() => {
    if (isNew) { hydratedRef.current = true; setPage(EMPTY); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    hydratedRef.current = false;
    api.get(id)
      .then((data) => {
        if (!alive) return;
        setPage({ ...EMPTY, ...data, seo: data.seo || {},
                  blocks: (data.blocks || []).map(withUid) });
        // Skip the autosave that this state change would otherwise trigger.
        setTimeout(() => { hydratedRef.current = true; }, 0);
      })
      .catch((err) => push(errMsg(err, "Page introuvable"), "error"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, isNew, push]);

  const buildPayload = (p) => ({
    title: p.title, slug: p.slug, status: p.status,
    locale: p.locale || "fr", is_home: !!p.is_home,
    published_at: localToIso(isoToLocal(p.published_at)),
    seo: p.seo, blocks: stripUids(p.blocks),
  });

  // Debounced auto-save for existing pages.
  useEffect(() => {
    if (isNew || !hydratedRef.current) return;
    setSaveState("dirty");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await api.update(id, buildPayload(page));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 1200);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => { AiAPI.status().then((s) => setAiOn(!!s.configured)); }, []);

  const setField = (name, value) => setPage((p) => ({ ...p, [name]: value }));
  const setSeo = (name, value) => setPage((p) => ({ ...p, seo: { ...p.seo, [name]: value } }));

  const blocksText = () => page.blocks
    .map((b) => Object.values(b.data || {}).filter((v) => typeof v === "string").join(" "))
    .join(" ").replace(/<[^>]*>/g, " ").slice(0, 2000);

  const genSeoDescription = async () => {
    setAiBusy(true);
    try {
      const result = await AiAPI.seoDescription({ title: page.title, content: blocksText() });
      setSeo("meta_description", result);
      push("Description SEO générée");
    } catch (err) {
      push(errMsg(err, "Génération impossible"), "error");
    } finally { setAiBusy(false); }
  };

  const addBlock = (type) => setPage((p) => ({ ...p, blocks: [...p.blocks, withUid(makeBlock(type))] }));
  const updateBlock = (i, block) =>
    setPage((p) => ({ ...p, blocks: p.blocks.map((b, j) => (j === i ? block : b)) }));
  const removeBlock = (i) => setPage((p) => ({ ...p, blocks: p.blocks.filter((_, j) => j !== i) }));
  const moveBlock = (i, d) => setPage((p) => {
    const j = i + d;
    if (j < 0 || j >= p.blocks.length) return p;
    return { ...p, blocks: arrayMove(p.blocks, i, j) };
  });
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setPage((p) => {
      const from = p.blocks.findIndex((b) => b._uid === active.id);
      const to = p.blocks.findIndex((b) => b._uid === over.id);
      return from < 0 || to < 0 ? p : { ...p, blocks: arrayMove(p.blocks, from, to) };
    });
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = buildPayload(page);
      if (isNew) {
        const created = await api.create(payload);
        push("Page créée");
        navigate(`/admin/pages/${created.id}`, { replace: true });
      } else {
        await api.update(id, payload);
        setSaveState("saved");
        push("Page enregistrée");
      }
    } catch (err) {
      const data = err?.response?.data;
      const blockErr = data?.errors?.blocks;
      push(blockErr ? "Un bloc est incomplet — vérifiez les champs requis."
                    : errMsg(err, "Enregistrement impossible"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center text-secondary py-5">
      <span className="spinner-border spinner-border-sm me-2" /> Chargement…</div>;
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/admin/pages")}>
            <i className="bi bi-arrow-left" />
          </button>
          <h1 className="h4 mb-0">{isNew ? "Nouvelle page" : page.title || "Page"}</h1>
        </div>
        <div className="d-flex align-items-center gap-2">
          {!isNew && (
            <span className="small text-secondary" aria-live="polite">
              {saveState === "saving" && <><span className="spinner-border spinner-border-sm me-1" />Enregistrement…</>}
              {saveState === "saved" && <><i className="bi bi-check-circle text-success me-1" />Enregistré</>}
              {saveState === "dirty" && <><i className="bi bi-pencil me-1" />Modifié…</>}
              {saveState === "error" && <span className="text-danger"><i className="bi bi-exclamation-triangle me-1" />Échec</span>}
            </span>
          )}
          {!isNew && (
            <button className={"btn btn-sm " + (previewOn ? "btn-secondary" : "btn-outline-secondary")}
                    onClick={() => setPreviewOn((v) => !v)} title="Aperçu en direct">
              <i className="bi bi-layout-split me-1" />Aperçu
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !page.title}>
            <i className="bi bi-check-lg me-1" /> {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        {[["content", "Contenu"], ["settings", "Réglages"], ["seo", "SEO"],
          ...(isNew ? [] : [["history", "Historique"]])].map(([k, l]) => (
          <li className="nav-item" key={k}>
            <button className={`nav-link ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
          </li>
        ))}
      </ul>

      <div className={"mv-editor-layout" + (previewOn ? " mv-editor-layout--split" : "")}>
      <div className="mv-editor-main">
      {tab === "content" && (
        <div>
          {page.blocks.length === 0 && (
            <div className="text-center text-secondary py-4">Aucun bloc. Ajoutez-en un ci-dessous.</div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={page.blocks.map((b) => b._uid)}
                             strategy={verticalListSortingStrategy}>
              {page.blocks.map((block, i) => (
                <BlockCard key={block._uid} index={i} block={block} count={page.blocks.length}
                           onChange={(b) => updateBlock(i, b)} onMove={moveBlock} onRemove={removeBlock} />
              ))}
            </SortableContext>
          </DndContext>
          <AddBlock onAdd={addBlock} />
        </div>
      )}

      {tab === "history" && !isNew && (
        <HistoryPanel pageId={id} onRestored={reload} />
      )}

      {tab === "settings" && (
        <div className="card border-0 shadow-sm"><div className="card-body" style={{ maxWidth: 640 }}>
          {META_FIELDS.map((f) => (
            <LabelledField key={f.name} f={f} value={page[f.name]}
                           onChange={(v) => setField(f.name, v)} />
          ))}
          <LabelledField f={{ name: "is_home", label: "Page d'accueil", type: "bool" }}
                         value={page.is_home} onChange={(v) => setField("is_home", v)} />
          {(page.status === "scheduled" || page.status === "published") && (
            <div className="mb-3">
              <label className="form-label small">Date de publication</label>
              <FieldInput f={{ name: "published_at", type: "datetime" }}
                          value={isoToLocal(page.published_at)}
                          onChange={(v) => setField("published_at", localToIso(v))} />
            </div>
          )}
        </div></div>
      )}

      {tab === "seo" && (
        <div className="card border-0 shadow-sm"><div className="card-body" style={{ maxWidth: 640 }}>
          {aiOn && (
            <button type="button" className="btn btn-outline-primary btn-sm mb-3"
                    onClick={genSeoDescription} disabled={aiBusy || !page.title}>
              {aiBusy ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-magic me-1" />}
              Générer la description SEO
            </button>
          )}
          {SEO_FIELDS.map((f) => (
            <LabelledField key={f.name} f={f} value={page.seo?.[f.name]}
                           onChange={(v) => setSeo(f.name, v)} />
          ))}
        </div></div>
      )}
      </div>

      {previewOn && !isNew && (
        <aside className="mv-editor-preview">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="small fw-medium text-secondary"><i className="bi bi-eye me-1" />Aperçu en direct</span>
            <div className="btn-group btn-group-sm">
              <button className="btn btn-outline-secondary" onClick={() => setPreviewKey((k) => k + 1)} title="Rafraîchir">
                <i className="bi bi-arrow-clockwise" />
              </button>
              {previewToken && (
                <a className="btn btn-outline-secondary" title="Ouvrir dans un onglet" target="_blank" rel="noreferrer"
                   href={`${WEB_URL}/preview?token=${previewToken}`}><i className="bi bi-box-arrow-up-right" /></a>
              )}
            </div>
          </div>
          {previewToken ? (
            <iframe key={previewKey} title="Aperçu"
                    src={`${WEB_URL}/preview?token=${previewToken}&_=${previewKey}`}
                    className="mv-preview-frame" />
          ) : (
            <div className="text-secondary small p-3">Préparation de l’aperçu…</div>
          )}
        </aside>
      )}
      </div>
    </div>
  );
}
