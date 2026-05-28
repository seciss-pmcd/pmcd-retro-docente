import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTextFromFile } from "./extractText.js";
import { generateFeedback } from "./openaiClient.js";
import { readRubrics } from "./storage.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(projectRoot, "server", "uploads");
const clientDist = path.join(projectRoot, "client", "dist");
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "pmcd-retro-docente" });
});

app.get("/api/rubrics", async (_req, res, next) => {
  try {
    res.json(await readRubrics());
  } catch (error) {
    next(error);
  }
});

app.post("/api/feedback", upload.single("file"), async (req, res, next) => {
  try {
    const rubrics = await readRubrics();
    const rubric = rubrics.find((item) => item.id === req.body.activity);
    if (!rubric) {
      res.status(400).json({ message: "Selecciona un tipo de actividad valido." });
      return;
    }

    const fileText = req.file ? await extractTextFromFile(req.file) : "";
    const submissionText = [req.body.submissionText, fileText].filter(Boolean).join("\n\n").trim();

    if (!submissionText) {
      res.status(400).json({ message: "Agrega texto de entrega o carga un archivo." });
      return;
    }

    const criteriaText = req.body.criteriaText || rubric.rubricText || rubric.criteria.join("\n");
    const feedback = await generateFeedback({
      professorName: req.body.professorName,
      course: req.body.course,
      activityName: rubric.name,
      criteria: splitCriteria(criteriaText),
      rubricText: criteriaText,
      submissionText
    });

    const record = {
      id: randomUUID(),
      professorName: req.body.professorName || "",
      course: req.body.course || "",
      activity: rubric.name,
      activityId: rubric.id,
      criteria: splitCriteria(criteriaText),
      fileName: req.file?.originalname || "",
      feedback,
      finalText: feedback.finalSuggestion || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (req.file) await fs.rm(req.file.path, { force: true });
    res.status(201).json(record);
  } catch (error) {
    if (req.file) await fs.rm(req.file.path, { force: true }).catch(() => {});
    next(error);
  }
});

app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Ocurrio un error al procesar la solicitud." });
});

app.listen(port, () => {
  console.log(`PMCD Retro Docente disponible en http://localhost:${port}`);
});

function splitCriteria(criteriaText) {
  return criteriaText
    .split(/\n|;/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}
