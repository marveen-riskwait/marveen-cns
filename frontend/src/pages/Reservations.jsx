import { useCallback, useEffect, useState } from "react";

import { resource, errMsg } from "../api/client";
import { useToast } from "../contexts/ToastContext";

const PER_PAGE = 20;
const api = resource("reservations");

const STATUS = {
  paid: ["Payée", "text-bg-success"],
  pending: ["En attente", "text-bg-warning"],
  cancelled: ["Annulée", "text-bg-secondary"],
  expired: ["Expirée", "text-bg-dark"],
};
const STATUS_OPTIONS = [["pending", "En attente"], ["paid", "Payée"], ["cancelled", "Annulée"], ["expired", "Expirée"]];

export function Reservations() {
  const { push } = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: PER_PAGE };
      if (status) params.status = status;
      if (search) params.q = search;
      const data = await api.list(params);
      setItems(data.items || []);
      setMeta(data.meta || null);
    } catch (err) {
      push(errMsg(err, "Chargement impossible"), "error");
    } finally { setLoading(false); }
  }, [page, status, search, push]);

  useEffect(() => { load(); }, [load]);

  const setRowStatus = async (row, value) => {
    try { await api.update(row.id, { status: value }); push("Statut mis à jour"); load(); }
    catch (err) { push(errMsg(err, "Mise à jour impossible"), "error"); }
  };
  const submitSearch = (e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h1 className="h4 mb-0"><i className="bi bi-calendar-check me-2 text-secondary" />Réservations</h1>
        <select className="form-select form-select-sm" style={{ maxWidth: 200 }}
                value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <form className="input-group input-group-sm mb-3" style={{ maxWidth: 320 }} onSubmit={submitSearch}>
        <input className="form-control" placeholder="Client, email, vélo…" value={q}
               onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-outline-secondary" type="submit"><i className="bi bi-search" /></button>
      </form>

      <div className="card border-0 shadow-sm"><div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light"><tr>
            <th>Client</th><th>Article</th><th>Dates</th><th>Montant</th><th>Statut</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center text-secondary py-5">
                <span className="spinner-border spinner-border-sm me-2" /> Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="5" className="text-center text-secondary py-5">Aucune réservation.</td></tr>
            ) : items.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="fw-medium">{r.customer_name}</div>
                  <div className="text-secondary small">{r.customer_email}{r.customer_phone ? ` · ${r.customer_phone}` : ""}</div>
                </td>
                <td>{r.item_name}<span className="text-secondary small"> · {r.days} j</span></td>
                <td className="text-secondary small">{r.start_date} → {r.end_date}</td>
                <td className="fw-medium">{r.amount} €</td>
                <td>
                  <select className={"form-select form-select-sm badge-select " + (STATUS[r.status]?.[1] || "")}
                          style={{ maxWidth: 140 }} value={r.status}
                          onChange={(e) => setRowStatus(r, e.target.value)}>
                    {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>

      {meta && meta.pages > 1 && (
        <nav className="d-flex align-items-center justify-content-between mt-3">
          <span className="text-secondary small">{meta.total} réservation(s) · page {meta.page}/{meta.pages}</span>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled={!meta.has_prev} onClick={() => setPage((p) => p - 1)}><i className="bi bi-chevron-left" /></button>
            <button className="btn btn-outline-secondary" disabled={!meta.has_next} onClick={() => setPage((p) => p + 1)}><i className="bi bi-chevron-right" /></button>
          </div>
        </nav>
      )}
    </div>
  );
}
