import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { resource, errMsg } from "../api/client";
import { FieldInput, LabelledField } from "../components/FieldInput";
import { BLOCK_ORDER, BLOCK_TYPES, blockSummary, makeBlock } from "../config/blocks";
import { useToast } from "../contexts/ToastContext";

const api = resource("pages");

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

// ── One block card ──────────────────────────────────────────────────
function BlockCard({ index, block, count, onChange, onMove, onRemove }) {
  const [open, setOpen] = useState(true);
  const def = BLOCK_TYPES[block.type];
  const setData = (name, value) => onChange({ ...block, data: { ...block.data, [name]: value } });

  return (
    <div className="card border-0 shadow-sm mb-2">
      <div className="card-header bg-transparent d-flex align-items-center gap-2">
        <i className={`bi ${def.icon} text-secondary`} />
        <button type="button" className="btn btn-link p-0 text-start flex-grow-1 text-decoration-none"
                onClick={() => setOpen((o) => !o)}>
          <span className="fw-medium">{def.label}</span>
          {!open && <span className="text-secondary small ms-2 text-truncate">— {blockSummary(block)}</span>}
        </button>
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

export function PageBuilder() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { push } = useToast();

  const [page, setPage] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("content");

  useEffect(() => {
    if (isNew) { setPage(EMPTY); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    api.get(id)
      .then((data) => { if (alive) setPage({ ...EMPTY, ...data, seo: data.seo || {}, blocks: data.blocks || [] }); })
      .catch((err) => push(errMsg(err, "Page introuvable"), "error"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, isNew, push]);

  const setField = (name, value) => setPage((p) => ({ ...p, [name]: value }));
  const setSeo = (name, value) => setPage((p) => ({ ...p, seo: { ...p.seo, [name]: value } }));

  const addBlock = (type) => setPage((p) => ({ ...p, blocks: [...p.blocks, makeBlock(type)] }));
  const updateBlock = (i, block) =>
    setPage((p) => ({ ...p, blocks: p.blocks.map((b, j) => (j === i ? block : b)) }));
  const removeBlock = (i) => setPage((p) => ({ ...p, blocks: p.blocks.filter((_, j) => j !== i) }));
  const moveBlock = (i, d) => setPage((p) => {
    const j = i + d;
    if (j < 0 || j >= p.blocks.length) return p;
    const next = [...p.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    return { ...p, blocks: next };
  });

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        title: page.title, slug: page.slug, status: page.status,
        locale: page.locale || "fr", is_home: !!page.is_home,
        published_at: localToIso(isoToLocal(page.published_at)),
        seo: page.seo, blocks: page.blocks,
      };
      if (isNew) {
        const created = await api.create(payload);
        push("Page créée");
        navigate(`/admin/pages/${created.id}`, { replace: true });
      } else {
        await api.update(id, payload);
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
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !page.title}>
          <i className="bi bi-check-lg me-1" /> {busy ? "…" : "Enregistrer"}
        </button>
      </div>

      <ul className="nav nav-tabs mb-3">
        {[["content", "Contenu"], ["settings", "Réglages"], ["seo", "SEO"]].map(([k, l]) => (
          <li className="nav-item" key={k}>
            <button className={`nav-link ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
          </li>
        ))}
      </ul>

      {tab === "content" && (
        <div>
          {page.blocks.length === 0 && (
            <div className="text-center text-secondary py-4">Aucun bloc. Ajoutez-en un ci-dessous.</div>
          )}
          {page.blocks.map((block, i) => (
            <BlockCard key={i} index={i} block={block} count={page.blocks.length}
                       onChange={(b) => updateBlock(i, b)} onMove={moveBlock} onRemove={removeBlock} />
          ))}
          <AddBlock onAdd={addBlock} />
        </div>
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
          {SEO_FIELDS.map((f) => (
            <LabelledField key={f.name} f={f} value={page.seo?.[f.name]}
                           onChange={(v) => setSeo(f.name, v)} />
          ))}
        </div></div>
      )}
    </div>
  );
}
