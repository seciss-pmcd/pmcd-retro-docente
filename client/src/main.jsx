import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CheckCircle2, Clipboard, FileText, Loader2, ShieldCheck } from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "";
const COURSES = [
  "Formacion y Actualizacion Docente en Ciencias de la Salud y Planeacion Didactica de la Asignatura",
  "Planeacion Didactica de la Asignatura",
  "Educacion en Ciencias de la Salud con Perspectiva de Genero"
];

const initialForm = {
  professorName: "",
  course: "",
  activity: "",
  criteriaText: "",
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

  useEffect(() => {
    fetch(`${API_URL}/api/rubrics`)
      .then((response) => response.json())
      .then(setRubrics)
      .catch(() => setMessage("No fue posible cargar las rubricas."));
  }, []);

  function updateActivity(activityId) {
    const rubric = rubrics.find((item) => item.id === activityId);
    setForm({
      ...form,
      activity: activityId,
      criteriaText: rubric ? rubric.rubricText || formatRubric(rubric.criteria) : ""
    });
  }

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
      setMessage(data.feedback.mode === "demo" ? "Retroalimentacion generada en modo demo." : "Retroalimentacion generada.");
    } catch (error) {
      setMessage(error.message || "No se pudo generar la retroalimentacion.");
    } finally {
      setLoading(false);
    }
  }

  async function copyFeedback() {
    await navigator.clipboard.writeText(editableFinal);
    setMessage("Retroalimentacion final copiada.");
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
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del profesor">
                <input className="input" value={form.professorName} onChange={(event) => setForm({ ...form, professorName: event.target.value })} required />
              </Field>
              <Field label="Curso">
                <select className="input" value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} required>
                  <option value="">Selecciona curso</option>
                  {COURSES.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Actividad">
              <select className="input" value={form.activity} onChange={(event) => updateActivity(event.target.value)} required>
                <option value="">Selecciona tipo de actividad</option>
                {rubrics.map((rubric) => (
                  <option key={rubric.id} value={rubric.id}>{rubric.name}</option>
                ))}
              </select>
            </Field>

            {selectedRubric && (
              <div className="rounded-md bg-pmcd-blueSoft p-4">
                <h3 className="font-bold text-pmcd-blue">Criterios base de la actividad</h3>
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

            <Field label="Rubrica de evaluacion">
              <textarea
                className="input min-h-32"
                value={form.criteriaText}
                onChange={(event) => setForm({ ...form, criteriaText: event.target.value })}
                placeholder="Pega aqui la rubrica oficial o deja los criterios base precargados."
                required
              />
            </Field>

            <Field label="Archivo de entrega">
              <input
                className="input file:mr-4 file:rounded-md file:border-0 file:bg-pmcd-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                type="file"
                accept=".docx,.pdf,.pptx,.txt,.md"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </Field>

            <Field label="Texto de entrega">
              <textarea
                className="input min-h-40"
                value={form.submissionText}
                onChange={(event) => setForm({ ...form, submissionText: event.target.value })}
                placeholder="Pega aqui la entrega exportada de Moodle si no usaras archivo."
              />
            </Field>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              Generar retroalimentacion
            </button>
          </form>
        </section>

        <section className="grid content-start gap-6">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-pmcd-blue">Retroalimentacion generada</h2>

            {result ? (
              <div className="grid gap-4">
                <FeedbackBlock title="Fortalezas">{result.feedback.strengths}</FeedbackBlock>
                <FeedbackBlock title="Cumplimiento de la rubrica">{result.feedback.criteriaCompliance}</FeedbackBlock>
                <FeedbackBlock title="Mejoras sugeridas">{result.feedback.improvements}</FeedbackBlock>

                <Field label="Sugerencia de retroalimentacion final editable">
                  <textarea className="input min-h-36" value={editableFinal} onChange={(event) => setEditableFinal(event.target.value)} />
                </Field>

                <button className="btn-primary" type="button" onClick={copyFeedback}>
                  <Clipboard className="h-5 w-5" />
                  Copiar retroalimentacion final
                </button>
              </div>
            ) : (
              <div className="rounded-md bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                La retroalimentacion aparecera aqui para revision. Podras editarla antes de copiarla y pegarla manualmente en Moodle.
              </div>
            )}
          </div>

          {message && <div className="rounded-md border border-pmcd-gold/40 bg-pmcd-goldSoft px-4 py-3 text-sm font-semibold">{message}</div>}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

function formatRubric(criteria) {
  return criteria
    .map((criterion, index) => {
      const [title, levels] = criterion.split(" Niveles: ");
      return `${index + 1}. ${title}\nNiveles: ${levels || "Por definir."}`;
    })
    .join("\n\n");
}
