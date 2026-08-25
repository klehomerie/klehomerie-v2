import 'server-only';

import { PDFParse } from 'pdf-parse';

// Only PDFs are attempted -- no OCR, no other file type. Returns null if
// there is no text layer (a scanned image PDF) or if the file isn't a
// PDF at all. "No text layer" is judged on literal emptiness, not a
// guessed threshold -- per the project instructions, this never OCRs and
// never guesses.
export async function extractPdfText(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  if (mimeType !== 'application/pdf') {
    return null;
  }

  const parser = new PDFParse({ data: fileBuffer });
  try {
    const result = await parser.getText();
    const text = result.text.trim();
    return text.length > 0 ? text : null;
  } catch {
    // A malformed or unparseable PDF is treated the same as "no text
    // layer" -- there is nothing extractable to summarize.
    return null;
  } finally {
    await parser.destroy();
  }
}
