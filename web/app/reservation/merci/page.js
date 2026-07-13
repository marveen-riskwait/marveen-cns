"use client";

import { useEffect, useState } from "react";

// Payment result page. Stripe redirects here with ?session_id=… In demo mode
// (&demo=1) we confirm the payment ourselves, since there's no real webhook.
export default function MerciPage({ searchParams }) {
  const sessionId = searchParams?.session_id;
  const demo = searchParams?.demo === "1";
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    if (!sessionId) { setState({ loading: false, data: null }); return; }
    const run = async () => {
      if (demo) {
        await fetch("/api/public/reservations/confirm-demo", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        }).catch(() => {});
      }
      const r = await fetch(`/api/public/reservations/${sessionId}`);
      const j = r.ok ? await r.json() : null;
      setState({ loading: false, data: j?.data || null });
    };
    run();
  }, [sessionId, demo]);

  return (
    <section className="blk container" style={{ maxWidth: 620, textAlign: "center", padding: "3rem 1.25rem" }}>
      {state.loading ? (
        <p>Vérification du paiement…</p>
      ) : state.data?.status === "paid" ? (
        <>
          <div style={{ fontSize: "3rem" }}>✅</div>
          <h1>Merci, réservation confirmée !</h1>
          <p style={{ color: "var(--muted)" }}>
            {state.data.item_name} · du {state.data.start_date} au {state.data.end_date}
            {" "}— {state.data.amount} € payés.
          </p>
          <p>Un email de confirmation vous a été envoyé.</p>
          <a className="btn" href="/">Retour à l'accueil</a>
        </>
      ) : state.data ? (
        <>
          <div style={{ fontSize: "3rem" }}>⏳</div>
          <h1>Paiement en attente</h1>
          <p style={{ color: "var(--muted)" }}>Votre réservation est enregistrée mais le paiement n'est pas encore confirmé.</p>
          <a className="btn" href="/">Retour à l'accueil</a>
        </>
      ) : (
        <>
          <h1>Réservation introuvable</h1>
          <a className="btn" href="/reserver">Refaire une réservation</a>
        </>
      )}
    </section>
  );
}
