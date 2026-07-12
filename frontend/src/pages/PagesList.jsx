import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { resource, errMsg } from "../api/client";
import { useToast } from "../contexts/ToastContext";

const PER_PAGE = 20;
const STATUS_BADGE = {
  published: "text-bg-success", draft: "text-bg-secondary",
  scheduled: "text-bg-info", archived: "text-bg-dark",
};

const api = resource("pages");

export function PagesList() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: PER_PAGE };
      if (search) params.q = search;
      const data = await api.list(params);
      setItems(data.items || []);
      setMeta(data.meta || null);
    } catch (err) {
      push(errMsg(err, "Chargement impossible"), "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, push]);

  useEffect(() => { load(); }, [load]);

  const del = async (row) => {
    if (!window.confirm(`Supprimer la page « ${row.title} » ?`)) return;
    try {
      await api.remove(row.id);
      push("Déplacée dans la corbeille");
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      push(errMsg(err, "Suppression impossible"), "error");
    }
  };

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h1 className="h4 mb-0">Pages</h1>
        <button className="btn btn-primary btn-sm" onClick={() => navigate("/admin/pages/new")}>
          <i className="bi bi-plus-lg me-1" /> Nouvelle page
        </button>
      </div>

      <form className="input-group input-group-sm mb-3" style={{ maxWidth: 320 }} onSubmit={submitSearch}>
        <input className="form-control" placeholder="Rechercher…" value={q}
               onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-outline-secondary" type="submit"><i className="bi bi-search" /></button>
      </form>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Titre</th><th>Slug</th><th>Statut</th><th>Accueil</th>
                <th>Blocs</th><th className="text-end" style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center text-secondary py-5">
                  <span className="spinner-border spinner-border-sm me-2" /> Chargement…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-secondary py-5">Aucune page.</td></tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/admin/pages/${row.id}`} className="fw-medium text-decoration-none">
                        {row.title}
                      </Link>
                    </td>
                    <td className="text-secondary"><code>/{row.slug}</code></td>
                    <td><span className={`badge ${STATUS_BADGE[row.status] || "text-bg-secondary"}`}>{row.status}</span></td>
                    <td>{row.is_home
                      ? <i className="bi bi-house-fill text-success" />
                      : <i className="bi bi-dash text-secondary opacity-50" />}</td>
                    <td className="text-secondary">{(row.blocks || []).length}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link className="btn btn-outline-secondary" to={`/admin/pages/${row.id}`} title="Éditer">
                          <i className="bi bi-pencil" />
                        </Link>
                        <button className="btn btn-outline-danger" onClick={() => del(row)} title="Supprimer">
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {meta && meta.pages > 1 && (
        <nav className="d-flex align-items-center justify-content-between mt-3">
          <span className="text-secondary small">{meta.total} page(s) · page {meta.page}/{meta.pages}</span>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled={!meta.has_prev}
                    onClick={() => setPage((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
            <button className="btn btn-outline-secondary" disabled={!meta.has_next}
                    onClick={() => setPage((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
          </div>
        </nav>
      )}
    </div>
  );
}
