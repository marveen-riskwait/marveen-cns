import { useState } from "react";
import { resource, errMsg } from "../api/client";
import { useToast } from "../contexts/ToastContext";
import { LabelledField } from "./FieldInput";

function toInputValue(field, value) {
  if (value == null) return field.type === "bool" ? false : "";
  if (field.type === "datetime") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  if (field.type === "tags") return Array.isArray(value) ? value.join(", ") : value;
  return value;
}

function initState(descriptor, item) {
  const state = {};
  for (const f of descriptor.fields) {
    if (item) state[f.name] = toInputValue(f, item[f.name]);
    else if (f.default !== undefined) state[f.name] = f.type === "bool" ? f.default : toInputValue(f, f.default);
    else state[f.name] = f.type === "bool" ? false : "";
  }
  return state;
}

function toPayload(descriptor, state) {
  const out = {};
  for (const f of descriptor.fields) {
    let v = state[f.name];
    if (f.type === "number") v = v === "" ? null : Number(v);
    else if (f.type === "bool") v = !!v;
    else if (f.type === "tags") v = String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (f.type === "datetime") v = v ? new Date(v).toISOString() : null;
    out[f.name] = v;
  }
  return out;
}

export function ResourceForm({ descriptor, item, onClose, onSaved }) {
  const { push } = useToast();
  const [state, setState] = useState(() => initState(descriptor, item));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (name, value) => setState((s) => ({ ...s, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const api = resource(descriptor.api);
      const payload = toPayload(descriptor, state);
      if (item) await api.update(item.id, payload);
      else await api.create(payload);
      push(item ? "Modifié" : "Créé");
      onSaved();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErrors(data.errors);
      push(errMsg(err, "Enregistrement impossible"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="modal d-block" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={submit}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {item ? "Modifier" : "Nouveau"} — {descriptor.label}
                </h5>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>
              <div className="modal-body">
                {descriptor.fields.map((f) => (
                  <LabelledField key={f.name} f={f} value={state[f.name]}
                                 onChange={(v) => set(f.name, v)} error={errors[f.name]} />
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Annuler</button>
                <button className="btn btn-primary" disabled={busy}>{busy ? "…" : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
