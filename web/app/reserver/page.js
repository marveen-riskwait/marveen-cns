"use client";

import { useEffect, useMemo, useState } from "react";

// Public booking form: pick a bike + dates + contact, then pay via Stripe.
// API calls are same-origin (rewritten to the backend — see next.config.js).
export default function ReserverPage() {
  const [bikes, setBikes] = useState([]);
  const [form, setForm] = useState({
    item_id: "", start_date: "", end_date: "",
    customer_name: "", customer_email: "", customer_phone: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/public/content/velo?per_page=100")
      .then((r) => r.json())
      .then((j) => setBikes(j.items || []))
      .catch(() => setBikes([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const bike = bikes.find((b) => String(b.id) === String(form.item_id));
  const price = bike?.data?.prix_jour;
  const days = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const d = (new Date(form.end_date) - new Date(form.start_date)) / 86400000;
    return d > 0 ? Math.round(d) : 0;
  }, [form.start_date, form.end_date]);
  const total = price && days ? price * days : 0;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Réservation impossible");
      window.location.href = json.data.checkout_url; // -> Stripe (or demo success)
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <section className="blk container" style={{ maxWidth: 640 }}>
      <h1>Réserver un vélo</h1>
      <p style={{ color: "var(--muted)" }}>Choisissez votre vélo et vos dates, puis payez en ligne en toute sécurité.</p>

      <form onSubmit={submit} className="resa-form">
        <label>Vélo
          <select required value={form.item_id} onChange={(e) => set("item_id", e.target.value)}>
            <option value="">— Choisir —</option>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}{b.data?.prix_jour ? ` — ${b.data.prix_jour} €/jour` : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="resa-row">
          <label>Du
            <input type="date" required value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </label>
          <label>Au
            <input type="date" required value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </label>
        </div>

        <label>Nom complet
          <input type="text" required value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
        </label>
        <label>Email
          <input type="email" required value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} />
        </label>
        <label>Téléphone (optionnel)
          <input type="tel" value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
        </label>

        {total > 0 && (
          <div className="resa-total">
            Total : <strong>{total} €</strong> <span>({days} jour{days > 1 ? "s" : ""} × {price} €)</span>
          </div>
        )}
        {error && <div className="resa-error">{error}</div>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Redirection…" : "Payer et réserver"}
        </button>
      </form>
    </section>
  );
}
