import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CheckCircle2, Clipboard, FileText, History, Loader2, ShieldCheck } from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "";
const initialForm = {
  professorName: "",
  course: "",
  group: "",
  activity: "",
  submissionText: ""
};

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-pmcd-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }) {
  const color = {
    pendiente: "bg-amber-50 text-amber-800 ring-amber-200",
    revisada: "bg-blue-50 text-blue-800 ring-blue-200",
    aprobada: "bg-emerald-50 text-emerald-800 ring-emerald-200"
  }[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${color}`}>{status}</span>;
}

function FeedbackBlock({ title, children }) {
  return (
    <section className="border-l-4 border-pmcd-gold bg-white px-4 py-3">
      <h3 className="text-sm font-bold text-pmcd-blue">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{children || "Sin informacion."}</p>
    </section>
  );
}

function App() {
  const [rubrics, setRubrics] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [editableFinal, setEditableFinal] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedRubric = useMemo(
    () => rubrics.find((rubric) => rubric.id === form.activity),
    [rubrics, form.activity]
  );

  async function loadData() {
    const [rubricsResponse, historyResponse] = await Promise.all([
      fetch(`${API_URL}/api/rubrics`),
      fetch(`${API_URL}/api/history`)
    ]);
    setRubrics(await rubricsResponse.json());
    setHistory(await historyResponse.json());
  }

  useEffect(() => {
    loadData().catch(() => setMessage("No fue posible cargar la configuracion inicial."));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (file) payload.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        body: payload
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setResult(data);
      setEditableFinal(data.feedback.finalSuggestion || "");
      setHistory((current) => [data, ...current]);
      setMessage(data.feedback.mode === "demo" ? "Retroalimentacion generada en modo demo." : "Retroalimentacion generada.");
    } catch (error) {
      setMessage(error.message || "No se pudo generar la retroalimentacion.");
    } finally {
      setLoading(false);
    }
  }

  async function copyFeedback() {
    if (result?.id) {
      const response = await fetch(`${API_URL}/api/history/${result.id}/final-text`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalText: editableFinal })
      });
      const updated = await response.json();
      setHistory((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setResult(updated);
    }
    await navigator.clipboard.writeText(editableFinal);
    setMessage("Retroalimentacion final copiada.");
  }

  async function updateStatus(id, status) {
    const response = await fetch(`${API_URL}/api/history/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const updated = await response.json();
    setHistory((current) => current.map((item) => (item.id === id ? updated : item)));
    if (result?.id === id) setResult(updated);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-pmcd-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-pmcd-gold">PMCD modalidad intermedia</p>
            <h1 className="mt-1 text-3xl font-bold text-pmcd-blue">Retroalimentacion docente</h1>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-pmcd-gold/40 bg-pmcd-goldSoft px-4 py-3 text-sm text-pmcd-ink">
            <ShieldCheck className="h-5 w-5 text-pmcd-blue" />
            Sin publicacion automatica en Moodle
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-pmcd-blue">
            <FileText className="h-5 w-5" />
            <h2 className="text-xl font-bold">Entrega del profesor</h2>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nombre del profesor">
                <input className="input" value={form.professorName} onChange={(e) => setForm({ ...form, professorName: e.target.value })} required />
              </Field>
              <Field label="Curso">
                <input className="input" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required />
              </Field>
              <Field label="Grupo">
                <input className="input" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} />
              </Field>
            </div>

            <Field label="Actividad">
              <select className="input" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} required>
                <option value="">Selecciona tipo de actividad</option>
                {rubrics.map((rubric) => (
                  <option key={rubric.id} value={rubric.id}>{rubric.name}</option>
                ))}
              </select>
            </Field>

            {selectedRubric && (
              <div className="rounded-md bg-pmcd-blueSoft p-4">
                <h3 className="font-bold text-pmcd-blue">Criterios de evaluacion</h3>
                <ul className="mt-2 grid gap-2 text-sm text-slate-700">
                  {selectedRubric.criteria.map((criterion) => (
                    <li key={criterion} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pmcd-gold" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Field label="Archivo de entrega">
              <input
                className="input file:mr-4 file:rounded-md file:border-0 file:bg-pmcd-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                type="file"
                accept=".docx,.pdf,.pptx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Field>

            <Field label="Texto de entrega">
              <textarea
                className="input min-h-40"
                value={form.submissionText}
                onChange={(e) => setForm({ ...form, submissionText: e.target.value })}
                placeholder="Pega aqui la entrega exportada de Moodle si no usaras archivo."
              />
            </Field>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              Generar retroalimentacion
            </button>
          </form>
        </section>

        <section className="grid gap-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-pmcd-blue">Retroalimentacion generada</h2>
              {result && <StatusPill status={result.status} />}
            </div>

            {result ? (
              <div className="grid gap-4">
                <FeedbackBlock title="Fortalezas">{result.feedback.strengths}</FeedbackBlock>
                <FeedbackBlock title="Cumplimiento de criterios">{result.feedback.criteriaCompliance}</FeedbackBlock>
                <FeedbackBlock title="Aspectos que requieren ajuste">{result.feedback.adjustments}</FeedbackBlock>

                <Field label="Sugerencia de retroalimentacion final editable">
                  <textarea className="input min-h-36" value={editableFinal} onChange={(e) => setEditableFinal(e.target.value)} />
                </Field>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="btn-primary" type="button" onClick={copyFeedback}>
                    <Clipboard className="h-5 w-5" />
                    Copiar retroalimentacion final
                  </button>
                  <select className="input sm:max-w-44" value={result.status} onChange={(e) => updateStatus(result.id, e.target.value)}>
                    <option value="pendiente">pendiente</option>
                    <option value="revisada">revisada</option>
                    <option value="aprobada">aprobada</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                La retroalimentacion aparecera aqui para revision. Podras editarla antes de copiarla y pegarla manualmente en Moodle.
              </div>
            )}
          </div>

          {message && <div className="rounded-md border border-pmcd-gold/40 bg-pmcd-goldSoft px-4 py-3 text-sm font-semibold">{message}</div>}

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-pmcd-blue">
              <History className="h-5 w-5" />
              <h2 className="text-xl font-bold">Historial</h2>
            </div>
            <div className="grid max-h-[420px] gap-3 overflow-auto pr-1">
              {history.length === 0 && <p className="text-sm text-slate-500">Aun no hay retroalimentaciones.</p>}
              {history.map((item) => (
                <button
                  key={item.id}
                  className="rounded-md border border-slate-200 p-4 text-left transition hover:border-pmcd-gold hover:bg-slate-50"
                  type="button"
                  onClick={() => {
                    setResult(item);
                    setEditableFinal(item.finalText || item.feedback.finalSuggestion || "");
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-pmcd-blue">{item.professorName || "Sin nombre"}</p>
                      <p className="text-sm text-slate-600">{item.course} · {item.activity}</p>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.feedback.finalSuggestion}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
