import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const historyPath = path.join(dataDir, "history.json");
const rubricsPath = path.join(dataDir, "rubrics.json");

export async function readRubrics() {
  const contents = await fs.readFile(rubricsPath, "utf8");
  return JSON.parse(contents);
}

export async function readHistory() {
  try {
    const contents = await fs.readFile(historyPath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function saveFeedback(record) {
  await fs.mkdir(dataDir, { recursive: true });
  const history = await readHistory();
  const updated = [record, ...history].slice(0, 250);
  await fs.writeFile(historyPath, JSON.stringify(updated, null, 2));
  return record;
}

export async function updateFeedbackStatus(id, status) {
  const history = await readHistory();
  const updated = history.map((item) =>
    item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item
  );
  await fs.writeFile(historyPath, JSON.stringify(updated, null, 2));
  return updated.find((item) => item.id === id);
}

export async function updateFeedbackFinalText(id, finalText) {
  const history = await readHistory();
  const updated = history.map((item) =>
    item.id === id ? { ...item, finalText, updatedAt: new Date().toISOString() } : item
  );
  await fs.writeFile(historyPath, JSON.stringify(updated, null, 2));
  return updated.find((item) => item.id === id);
}
