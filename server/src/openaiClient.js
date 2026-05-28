import OpenAI from "openai";

const basePrompt =
  "Actua como especialista en educacion medica, evaluacion docente y diseno curricular. Analiza la entrega del profesor con base en la rubrica seleccionada. Genera una retroalimentacion clara, respetuosa, academica y util. No inventes informacion. Si falta evidencia, indicalo. La respuesta debe ser breve, personalizada y lista para pegar en Moodle.";

function fallbackFeedback({ professorName, course, group, activityName, criteria, submissionText }) {
  const hasEvidence = submissionText && submissionText.trim().length > 80;
  const addressed = criteria.slice(0, 3).map((criterion) => `- ${criterion}: evidencia parcial o por confirmar.`);
  const missing = criteria.slice(3).map((criterion) => `- ${criterion}: conviene explicitar evidencia en la entrega.`);

  return {
    strengths: hasEvidence
      ? "La entrega muestra una intencion academica clara y permite identificar elementos relacionados con la actividad solicitada."
      : "La informacion disponible es limitada; aun asi, se reconoce la disposicion para atender la actividad.",
    criteriaCompliance: addressed.join("\n"),
    adjustments: missing.join("\n") || "No se identifican ajustes adicionales con la evidencia disponible.",
    finalSuggestion: `${professorName || "Profesor/a"}, gracias por la entrega de ${activityName} para ${course || "el curso"}${group ? `, grupo ${group}` : ""}. Se observan avances relevantes; para fortalecerla, se sugiere hacer mas explicita la evidencia de cumplimiento de los criterios y precisar los elementos que aun requieren ajuste antes de su version final.`
  };
}

export async function generateFeedback(input) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return {
      ...fallbackFeedback(input),
      mode: "demo"
    };
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: basePrompt },
      {
        role: "user",
        content: JSON.stringify({
          instrucciones:
            "Devuelve JSON con las llaves strengths, criteriaCompliance, adjustments y finalSuggestion. Mantente breve, academico y respetuoso.",
          profesor: input.professorName,
          curso: input.course,
          grupo: input.group,
          actividad: input.activityName,
          criterios: input.criteria,
          entrega: input.submissionText.slice(0, 16000)
        })
      }
    ]
  });

  const content = response.choices[0]?.message?.content || "{}";
  return {
    ...JSON.parse(content),
    mode: "openai"
  };
}
