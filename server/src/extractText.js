import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import mammoth from "mammoth";
import pdf from "pdf-parse";

const plainTextTypes = new Set([".txt", ".md", ".csv"]);

export async function extractTextFromFile(file) {
  if (!file) return "";

  const extension = path.extname(file.originalname).toLowerCase();
  const buffer = await fs.readFile(file.path);

  if (plainTextTypes.has(extension)) {
    return buffer.toString("utf8");
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (extension === ".pdf") {
    const result = await pdf(buffer);
    return result.text;
  }

  if (extension === ".pptx") {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

    const textParts = [];
    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async("text");
      const matches = [...xml.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g)];
      textParts.push(...matches.map((match) => decodeXml(match[1])));
    }

    return textParts.join(" ").replace(/\s+/g, " ").trim();
  }

  throw new Error("Formato no soportado. Usa DOCX, PDF, PPTX, TXT o texto directo.");
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}
