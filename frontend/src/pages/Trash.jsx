import { useCallback, useEffect, useState } from "react";

import { resource, errMsg } from "../api/client";
import { useToast } from "../contexts/ToastContext";

// Modules that support soft-delete (generic CRUD blueprint + pages/media).
const TRASHABLE = [
  ["pages", "Pages"], ["blog", "Blog"], ["news", "Actualités"],
  ["categories", "Catégories"], ["faq", "FAQ"], ["testimonials", "Témoignages"],
  ["events", "Événements"], ["documents", "Documents"], ["media", "Médias"],
  ["partners", "Partenaires"], ["brands", "Marques"], ["team", "Équipe"],
  ["menus", "Menus"],
];

const labelOf = (row) =>
  row.title || row.name || row.question || row.author_name || row.original_filename || `#${row.id}`;

export function Trash() {
  const { push } = useToast();
  const [module, setModule] = useState("pages");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const api = resource(module);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await resource(module).trash({ per_page: 100 });
      setItems(data.items || []);
    } catch (err) {
      push(errMsg(err, "Chargement impossible"), "error");
      setItems([]);
    } finally { setLoading(false); }
  }, [module, push]);

  useEffect(() => { load(); }, [load]);

  const restore = async (row) => {
    try { await api.restore(row.id); push("Restauré"); load(); }
    catch (err) { push(errMsg(err, "Restauration impossible"), "error"); }
  };
  const purge = async (row) => {
    if (!window.confirm(`Supprimer définitivement « ${labelOf(row)} » ? Cette action est irréversible.`)) return;
    try { await api.purge(row.id); push("Supprimé définitivement"); load(); }
    catch (err) { push(errMsg(err, "Suppression impossible"), "error"); }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h1 className="h4 mb-0"><i className="bi bi-trash me-2 text-secondary" />Corbeille</h1>
        <select className="form-select form-select-sm" style={{ maxWidth: 220 }}
                value={module} onChange={(e) => setModule(e.target.value)}>
          {TRASHABLE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card border-0 shadow-sm"><div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light"><tr>
            <th>Élément</th><th>Supprimé le</th>
            <th className="text-end" style={{ width: 220 }}>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" className="text-center text-secondary py-5">
                <span className="spinner-border spinner-border-sm me-2" /> Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="3" className="text-center text-secondary py-5">Corbeille vide pour ce module.</td></tr>
            ) : items.map((row) => (
              <tr key={row.id}>
                <td className="fw-medium">{labelOf(row)}</td>
                <td className="text-secondary small">
                  {row.deleted_at ? new Date(row.deleted_at).toLocaleString("fr-FR") : "—"}</td>
                <td className="text-end">
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-success" onClick={() => restore(row)}>
                      <i className="bi bi-arrow-counterclockwise me-1" />Restaurer
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => purge(row)}>
                      <i className="bi bi-x-octagon me-1" />Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
