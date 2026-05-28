import OpenAI from "openai";

const basePrompt =
  "Actua como especialista en educacion medica, evaluacion docente y diseno curricular. Analiza la entrega del profesor con base en la rubrica proporcionada. Genera retroalimentacion clara, respetuosa, academica y util, centrada en fortalezas y mejoras. No inventes informacion. Si falta evidencia, indicalo. La respuesta debe ser breve, personalizada y lista para pegar en Moodle.";

function fallbackFeedback({ professorName, course, activityName, criteria, rubricText, submissionText }) {
  const hasEvidence = submissionText && submissionText.trim().length > 80;
  const rubricLines = rubricText ? rubricText.split("\n").filter(Boolean) : criteria;
  const addressed = rubricLines.slice(0, 3).map((criterion) => `- ${criterion}: evidencia parcial o por confirmar.`);
  const missing = rubricLines.slice(3, 6).map((criterion) => `- ${criterion}: conviene reforzar o hacer mas explicita la evidencia.`);

  return {
    strengths: hasEvidence
      ? "La entrega muestra una intencion academica clara y permite identificar elementos relacionados con la actividad solicitada."
      : "La informacion disponible es limitada; aun asi, se reconoce la disposicion para atender la actividad.",
    criteriaCompliance: addressed.join("\n"),
    improvements: missing.join("\n") || "No se identifican mejoras adicionales con la evidencia disponible.",
    finalSuggestion: `${professorName || "Profesor/a"}, gracias por la entrega de ${activityName} para ${course || "el curso"}. Se observan avances relevantes; para fortalecerla, se sugiere hacer mas explicita la evidencia de cumplimiento de la rubrica y precisar los elementos que aun requieren mejora antes de su version final.`
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
            "Devuelve JSON con las llaves strengths, criteriaCompliance, improvements y finalSuggestion. Usa la rubrica y sus niveles de desempeno como referencia para identificar evidencias, fortalezas y mejoras. No asignes calificacion numerica ni color. No inventes cumplimiento si no hay evidencia. Mantente breve, academico y respetuoso. La retroalimentacion final debe mencionar fortalezas y mejoras prioritarias.",
          profesor: input.professorName,
          curso: input.course,
          actividad: input.activityName,
          rubrica: input.rubricText || input.criteria,
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
