import { PDFParse } from "pdf-parse";

export async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const parsed = await parser.getText();
    return parsed.text?.replace(/\n\n-- \d+ of \d+ --\n?/g, "").trim() || "";
  } finally {
    await parser.destroy();
  }
}
