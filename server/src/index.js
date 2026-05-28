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
import { readHistory, readRubrics, saveFeedback, updateFeedbackFinalText, updateFeedbackStatus } from "./storage.js";

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

app.get("/api/history", async (_req, res, next) => {
  try {
    res.json(await readHistory());
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

    const feedback = await generateFeedback({
      professorName: req.body.professorName,
      course: req.body.course,
      group: req.body.group,
      activityName: rubric.name,
      criteria: rubric.criteria,
      submissionText
    });

    const record = {
      id: randomUUID(),
      professorName: req.body.professorName || "",
      course: req.body.course || "",
      group: req.body.group || "",
      activity: rubric.name,
      activityId: rubric.id,
      criteria: rubric.criteria,
      fileName: req.file?.originalname || "",
      feedback,
      finalText: feedback.finalSuggestion || "",
      status: "pendiente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveFeedback(record);

    if (req.file) await fs.rm(req.file.path, { force: true });
    res.status(201).json(record);
  } catch (error) {
    if (req.file) await fs.rm(req.file.path, { force: true }).catch(() => {});
    next(error);
  }
});

app.patch("/api/history/:id/status", async (req, res, next) => {
  try {
    const allowed = new Set(["pendiente", "revisada", "aprobada"]);
    if (!allowed.has(req.body.status)) {
      res.status(400).json({ message: "Estado no valido." });
      return;
    }
    const record = await updateFeedbackStatus(req.params.id, req.body.status);
    if (!record) {
      res.status(404).json({ message: "Registro no encontrado." });
      return;
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/history/:id/final-text", async (req, res, next) => {
  try {
    const record = await updateFeedbackFinalText(req.params.id, req.body.finalText || "");
    if (!record) {
      res.status(404).json({ message: "Registro no encontrado." });
      return;
    }
    res.json(record);
  } catch (error) {
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
