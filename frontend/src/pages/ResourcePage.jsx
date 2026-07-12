import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { resource, errMsg } from "../api/client";
import { RESOURCES } from "../config/resources";
import { ResourceForm } from "../components/ResourceForm";
import { useToast } from "../contexts/ToastContext";
import { Placeholder } from "./Placeholder";

const PER_PAGE = 20;

// Render one table cell according to its declared column type.
function renderCell(col, row) {
  const value = row[col.key];
  switch (col.type) {
    case "bool":
      return value ? (
        <i className="bi bi-check-circle-fill text-success" />
      ) : (
        <i className="bi bi-dash-circle text-secondary opacity-50" />
      );
    case "badge":
      return value ? <span className="badge text-bg-secondary">{value}</span> : "—";
    case "datetime":
      return value ? new Date(value).toLocaleString("fr-FR") : "—";
    default:
      return value == null || value === "" ? "—" : String(value);
  }
}

function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <nav className="d-flex align-items-center justify-content-between mt-3">
      <span className="text-secondary small">
        {meta.total} élément{meta.total > 1 ? "s" : ""} · page {meta.page}/{meta.pages}
      </span>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-secondary" disabled={!meta.has_prev}
                onClick={() => onPage(meta.page - 1)}>
          <i className="bi bi-chevron-left" />
        </button>
        <button className="btn btn-outline-secondary" disabled={!meta.has_next}
                onClick={() => onPage(meta.page + 1)}>
          <i className="bi bi-chevron-right" />
        </button>
      </div>
    </nav>
  );
}

function ResourceScreen({ resourceKey, descriptor }) {
  const { push } = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { item } | { item: null } | null

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [filters, setFilters] = useState({});

  const api = useMemo(() => resource(descriptor.api), [descriptor.api]);

  const query = useMemo(() => {
    const p = { page, per_page: PER_PAGE };
    if (search) p.q = search;
    if (sort) p.sort = sort;
    for (const [k, v] of Object.entries(filters)) {
      if (v !== "" && v != null) p[k] = v;
    }
    return p;
  }, [page, search, sort, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.list(query);
      setItems(data.items || []);
      setMeta(data.meta || null);
    } catch (err) {
      setError(errMsg(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, [api, query]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever the resource itself changes.
  useEffect(() => {
    setPage(1); setQ(""); setSearch(""); setSort(""); setFilters({});
  }, [resourceKey]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  };

  const toggleSort = (key) => {
    setPage(1);
    setSort((cur) => (cur === key ? `-${key}` : cur === `-${key}` ? "" : key));
  };

  const sortIcon = (key) =>
    sort === key ? "bi-sort-down-alt" : sort === `-${key}` ? "bi-sort-up-alt" : "bi-filter";

  const del = async (row) => {
    const label = row.title || row.name || row.question || row.author_name || `#${row.id}`;
    if (!window.confirm(`Supprimer « ${label} » ?`)) return;
    try {
      await api.remove(row.id);
      push("Supprimé");
      // Step back a page if we just emptied the current one.
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      push(errMsg(err, "Suppression impossible"), "error");
    }
  };

  const onSaved = () => { setEditing(null); load(); };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h1 className="h4 mb-0">{descriptor.label}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ item: null })}>
          <i className="bi bi-plus-lg me-1" /> Nouveau
        </button>
      </div>

      <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
        {descriptor.searchable && (
          <form className="input-group input-group-sm" style={{ maxWidth: 320 }} onSubmit={submitSearch}>
            <input className="form-control" placeholder="Rechercher…" value={q}
                   onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-outline-secondary" type="submit">
              <i className="bi bi-search" />
            </button>
          </form>
        )}
        {(descriptor.filters || []).map((f) => (
          <select key={f.name} className="form-select form-select-sm" style={{ maxWidth: 200 }}
                  value={filters[f.name] ?? ""}
                  onChange={(e) => { setPage(1); setFilters((s) => ({ ...s, [f.name]: e.target.value })); }}>
            <option value="">{f.label} — tous</option>
            {f.type === "bool"
              ? [["true", "Oui"], ["false", "Non"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)
              : (f.options || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                {descriptor.columns.map((c) => (
                  <th key={c.key} role="button" className="user-select-none"
                      onClick={() => toggleSort(c.key)}>
                    {c.label}{" "}
                    <i className={`bi ${sortIcon(c.key)} small text-secondary`} />
                  </th>
                ))}
                <th className="text-end" style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={descriptor.columns.length + 1} className="text-center text-secondary py-5">
                    <span className="spinner-border spinner-border-sm me-2" /> Chargement…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={descriptor.columns.length + 1} className="text-center text-secondary py-5">
                    Aucun élément.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    {descriptor.columns.map((c) => (
                      <td key={c.key}>{renderCell(c, row)}</td>
                    ))}
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary"
                                onClick={() => setEditing({ item: row })} title="Modifier">
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn btn-outline-danger"
                                onClick={() => del(row)} title="Supprimer">
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

      <Pagination meta={meta} onPage={setPage} />

      {editing && (
        <ResourceForm descriptor={descriptor} item={editing.item}
                      onClose={() => setEditing(null)} onSaved={onSaved} />
      )}
    </div>
  );
}

// Route entry: resolves :resource to a descriptor and mounts the generic screen.
// `key` on the screen forces a clean remount when switching modules.
export function ResourcePage() {
  const { resource: resourceKey } = useParams();
  const descriptor = RESOURCES[resourceKey];
  if (!descriptor) return <Placeholder />;
  return <ResourceScreen key={resourceKey} resourceKey={resourceKey} descriptor={descriptor} />;
}
