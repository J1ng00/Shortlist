const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const { getData } = require("pdf-parse/worker");

PDFParse.setWorker(getData());

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error("Missing PDF path.");
  }

  const parser = new PDFParse({ data: fs.readFileSync(filePath) });

  try {
    const parsed = await parser.getText();
    process.stdout.write(parsed.text?.replace(/\n\n-- \d+ of \d+ --\n?/g, "").trim() || "");
  } finally {
    await parser.destroy();
  }
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
