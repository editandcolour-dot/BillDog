import { extractTextFromImage } from '@/lib/claude/vision';
import { PDFParse, PasswordException } from 'pdf-parse';

export async function parseBillFile(buffer: Buffer, mimeType: string): Promise<string> {
  let extractedText = '';

  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      extractedText = result.text;
    } catch (error) {
      console.error('[pdf-parse] Raw extraction error:', error);
      if (error instanceof PasswordException) {
        throw new Error('This PDF is password protected. Please unlock it and try again.');
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract text from PDF: ${msg}`);
    } finally {
      await parser.destroy();
    }
  } else if (mimeType.startsWith('image/')) {
    const base64Data = buffer.toString('base64');
    // Claude Vision only natively lists jpeg, png, webp, and gif. Treat HEIC as jpeg for API routing
    const normalizedMime = (mimeType === 'image/heic' ? 'image/jpeg' : mimeType) as 'image/jpeg' | 'image/png' | 'image/webp';
    extractedText = await extractTextFromImage(base64Data, normalizedMime);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Clean the extracted string of common OCR and PDF encoding errors
  extractedText = extractedText
    .replace(/\0/g, '') // remove null bytes
    .replace(/\r\n/g, '\n') // normalize CRLF to LF
    .replace(/\n{3,}/g, '\n\n') // max 2 blank lines
    .trim();

  if (extractedText.length < 100) {
    if (mimeType.startsWith('image/')) {
      throw new Error("We couldn't read the text. The image may be too blurry. Please try a clearer photo.");
    }
    throw new Error("We couldn't find enough text in this PDF. It might be just a scanned image inside a PDF.");
  }

  return extractedText;
}
