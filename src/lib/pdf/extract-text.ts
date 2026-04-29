import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function extractPdfText(buffer: Buffer) {
  const filePath = path.join(tmpdir(), `shortlist-${randomUUID()}.pdf`);

  try {
    await writeFile(filePath, buffer);

    const { stdout } = await execFileAsync(process.execPath, [
      path.join(process.cwd(), "scripts/extract-pdf-text.cjs"),
      filePath,
    ]);

    return stdout.trim();
  } finally {
    await unlink(filePath).catch(() => undefined);
  }
}
