import OpenAI from "openai";

const basePrompt =
  "Actua como especialista en educacion medica, evaluacion docente y diseno curricular. Analiza la entrega del profesor con base en la rubrica proporcionada. Genera retroalimentacion clara, respetuosa, academica y util, centrada en fortalezas y mejoras. No inventes informacion. Si falta evidencia, indicalo. La respuesta debe estar lista para pegar en Moodle.";

const styleGuide = `
Estilo esperado para la retroalimentacion final:
- Escribir en espanol academico, cordial, formativo y respetuoso.
- Usar 3 o 4 parrafos breves.
- Iniciar con una valoracion general de la actividad: "La actividad presenta..." o "La planeacion didactica presenta...".
- Segundo parrafo: "Se reconoce como fortaleza..." y mencionar evidencias especificas de la entrega.
- Tercer parrafo: "Como area de mejora..." o "Sin embargo, es importante..." con recomendaciones concretas y accionables.
- Cierre: "En general..." con una sintesis positiva y la mejora prioritaria.
- No usar listas en la retroalimentacion final.
- No sonar generico; personalizar segun la actividad y evidencia disponible.
- Evitar frases punitivas; preferir "seria recomendable", "podria fortalecerse", "conviene revisar".
`;

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
    finalSuggestion: `La actividad presenta una organizacion general que permite identificar avances relacionados con ${activityName} en ${course || "el curso"}, aunque la revision completa depende de la evidencia incluida en la entrega.\n\nSe reconoce como fortaleza la disposicion para atender los elementos solicitados y vincular la actividad con los criterios establecidos en la rubrica.\n\nComo area de mejora, seria recomendable hacer mas explicita la evidencia de cumplimiento de cada criterio, especialmente en los apartados donde la informacion disponible no permite confirmar plenamente los elementos requeridos.\n\nEn general, la entrega muestra avances importantes; para fortalecerla, conviene precisar los elementos pendientes y cuidar que la version final responda con claridad a la rubrica de evaluacion.`
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
            `Devuelve JSON con las llaves strengths, criteriaCompliance, improvements y finalSuggestion. Usa la rubrica y sus niveles de desempeno como referencia para identificar evidencias, fortalezas y mejoras. No asignes calificacion numerica ni color. No inventes cumplimiento si no hay evidencia. ${styleGuide}`,
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
