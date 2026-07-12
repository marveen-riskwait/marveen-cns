import { useEffect, useMemo, useState } from "react";

import { SettingsAPI, errMsg } from "../api/client";
import { FieldInput } from "../components/FieldInput";
import { SETTINGS_FIELDS, SETTINGS_GROUPS } from "../config/settings";
import { useToast } from "../contexts/ToastContext";

// Coerce a stored JSON value into the shape a field control expects.
function toFieldValue(field, raw) {
  if (field.type === "bool") return !!raw;
  if (raw == null) return "";
  return typeof raw === "string" ? raw : String(raw);
}

export function Settings() {
  const { push } = useToast();
  const [values, setValues] = useState({});
  const [initial, setInitial] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    SettingsAPI.getAll()
      .then(({ map }) => {
        if (!alive) return;
        const next = {};
        for (const f of SETTINGS_FIELDS) next[f.key] = toFieldValue(f, map?.[f.key]);
        setValues(next);
        setInitial(next);
      })
      .catch((err) => push(errMsg(err, "Chargement impossible"), "error"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [push]);

  const set = (key, v) => setValues((s) => ({ ...s, [key]: v }));

  const dirtyKeys = useMemo(
    () => SETTINGS_FIELDS.filter((f) => values[f.key] !== initial[f.key]).map((f) => f.key),
    [values, initial]
  );

  const save = async () => {
    if (dirtyKeys.length === 0) return;
    setBusy(true);
    try {
      for (const key of dirtyKeys) {
        const f = SETTINGS_FIELDS.find((x) => x.key === key);
        await SettingsAPI.put(key, values[key], f.group, f.public);
      }
      setInitial({ ...values });
      push(`${dirtyKeys.length} paramètre(s) enregistré(s)`);
    } catch (err) {
      push(errMsg(err, "Enregistrement impossible"), "error");
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
        <h1 className="h4 mb-0">Paramètres</h1>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || dirtyKeys.length === 0}>
          <i className="bi bi-check-lg me-1" />
          {busy ? "…" : dirtyKeys.length ? `Enregistrer (${dirtyKeys.length})` : "Enregistré"}
        </button>
      </div>

      <div className="row g-3" style={{ maxWidth: 820 }}>
        {SETTINGS_GROUPS.map((group) => (
          <div className="col-12" key={group.title}>
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent d-flex align-items-center gap-2">
                <i className={`bi ${group.icon} text-secondary`} />
                <span className="fw-medium">{group.title}</span>
              </div>
              <div className="card-body">
                {group.fields.map((f) => (
                  <div className="mb-3" key={f.key}>
                    {f.type !== "bool" && (
                      <label className="form-label small d-flex align-items-center gap-2">
                        {f.label}
                        {!f.public && <span className="badge text-bg-light border">privé</span>}
                      </label>
                    )}
                    <FieldInput f={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
