---
name: pdf-parse
description: PDF and image text extraction patterns for Billdog bill uploads. Upload Agent MUST read this before handling any file upload or text extraction.
---

# PDF & Image Parsing — Billdog

> **Consumed by:** Upload Agent — read before handling any bill file upload or text extraction
> **Project:** Billdog — SA municipal billing dispute platform
> **Bill formats:** City of Cape Town (3pp), eThekwini (4+pp), Johannesburg, Tshwane, Ekurhuleni
> **Core principle:** Clean extraction is critical. Garbage in = garbage out. Claude can only analyse what it can read.

---

## 1. pdf-parse Library

### Installation
```bash
npm install pdf-parse
npm install -D @types/pdf-parse  # TypeScript types
```

### Basic Usage
```typescript
import pdfParse from 'pdf-parse';

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
  // data.numpages — number of pages
  // data.info — PDF metadata
}
```

### What pdf-parse Returns
| Property | Type | Use |
|---|---|---|
| `data.text` | `string` | All text from all pages concatenated |
| `data.numpages` | `number` | Page count — useful for logging |
| `data.info` | `object` | PDF metadata (author, title, etc.) |

**Rule:** Always work with `Buffer`, not file paths. Read the file from Supabase Storage into a Buffer before parsing.

---

## 2. Buffer-Based Workflow

Never use file paths. The pipeline is: **Supabase Storage → Buffer → pdf-parse → cleaned text → database**.

```typescript
import { createClient } from '@/lib/supabase/server';
import pdfParse from 'pdf-parse';

async function extractBillText(filePath: string): Promise<string> {
  const supabase = await createClient();

  // 1. Download file from Supabase Storage into Buffer
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('bills')
    .download(filePath);

  if (downloadError || !fileData) {
    throw new ExtractionError(
      "We couldn't read your bill. Please check the file and try again.",
      'DOWNLOAD_FAILED',
    );
  }

  // 2. Convert Blob to Buffer
  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length === 0) {
    throw new ExtractionError(
      'The uploaded file appears to be empty. Please try a different file.',
      'EMPTY_FILE',
    );
  }

  // 3. Parse PDF
  const data = await pdfParse(buffer);
  return cleanExtractedText(data.text);
}
```

---

## 3. Multi-Page PDFs

pdf-parse handles multi-page bills automatically. `data.text` contains all pages concatenated.

| Municipality | Typical Pages | Notes |
|---|---|---|
| City of Cape Town | 3 | Water, electricity, rates on separate pages |
| eThekwini | 4+ | Detailed line items across pages |
| City of Johannesburg | 3–4 | Varies by service bundle |
| City of Tshwane | 3 | Standard format |
| Ekurhuleni | 3–4 | Combined services bill |

**Rule:** Never assume a bill is single-page. Always process the full `data.text` output.

---

## 4. Text Cleaning

Raw pdf-parse output contains noise. Clean it before sending to Claude.

```typescript
function cleanExtractedText(raw: string): string {
  return raw
    // Normalise line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // Remove null bytes and non-printable characters (except newline/tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // Replace multiple spaces with single space (per line)
    .replace(/[^\S\n]+/g, ' ')

    // Remove excessive blank lines (3+ → 2)
    .replace(/\n{3,}/g, '\n\n')

    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')

    // Trim overall
    .trim();
}
```

### What to Preserve
- **Line structure** — Claude needs to see line items, amounts, and dates in context
- **Numbers** — account numbers, amounts, dates are critical
- **Table-like alignment** — helps Claude parse structured data

### What to Remove
- **Null bytes** — cause issues in database and API calls
- **Excessive whitespace** — wastes tokens and confuses Claude
- **Non-printable characters** — invisible garbage from PDF encoding

---

## 5. Image Upload — Claude Vision

For JPG, PNG, and HEIC uploads, use Claude Vision to extract text.

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function extractTextFromImage(
  buffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<string> {
  const anthropic = new Anthropic();

  const base64 = buffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: [
              'Extract all text from this South African municipal bill image exactly as it appears.',
              'Preserve all numbers, dates, line items, amounts, account numbers, and addresses.',
              'Maintain the structure of tables and line items.',
              'Return only the extracted text, nothing else.',
            ].join(' '),
          },
        ],
      },
    ],
  });

  const extractedText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Validate extraction quality
  if (extractedText.length < 100) {
    throw new ExtractionError(
      'Image quality too low — please retake the photo with better lighting.',
      'LOW_QUALITY_IMAGE',
    );
  }

  return cleanExtractedText(extractedText);
}
```

### Rules
- **Always use `claude-sonnet-4-20250514`** for vision extraction.
- **Always validate result length** — under 100 chars likely means failed extraction.
- **Treat output the same as pdf-parse output** — run through `cleanExtractedText`.
- **Wrap in try/catch** — Claude Vision can fail on very large or corrupt images.

---

## 6. HEIC Conversion

HEIC (iPhone photo format) must be converted to JPEG before Claude Vision.

```typescript
import sharp from 'sharp';

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Usage in pipeline
if (mimeType === 'image/heic') {
  buffer = await convertHeicToJpeg(buffer);
  mimeType = 'image/jpeg';
}
```

### Installation
```bash
npm install sharp
```

**Rule:** Always convert HEIC to JPEG before processing. Claude Vision and most web APIs don't support HEIC natively.

---

## 7. File Validation

Validate **before** any parsing attempt.

```typescript
const ALLOWED_MIME_TYPES: Record<string, 'pdf' | 'image'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/heic': 'image',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ValidationResult {
  valid: boolean;
  fileType: 'pdf' | 'image';
  error?: string;
}

function validateBillFile(file: File): ValidationResult {
  // Check MIME type
  const fileType = ALLOWED_MIME_TYPES[file.type];
  if (!fileType) {
    return {
      valid: false,
      fileType: 'pdf',
      error: 'We only accept PDF, JPG, or PNG files.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      fileType,
      error: `Your file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload a file under 10MB.`,
    };
  }

  // Check not empty
  if (file.size === 0) {
    return {
      valid: false,
      fileType,
      error: 'The file appears to be empty. Please try a different file.',
    };
  }

  return { valid: true, fileType };
}
```

---

## 8. Error Handling

### Error Types and User Messages

| Error | Cause | User Message |
|---|---|---|
| Corrupt PDF | Damaged file, incomplete download | "We couldn't read your bill. The file may be damaged. Please try a different copy." |
| Password protected | pdf-parse throws specific error | "This PDF is password protected. Please remove the password and re-upload." |
| Image too blurry | Claude Vision returns <100 chars | "Image quality too low — please retake the photo with better lighting." |
| Empty result | data.text <50 chars | "We couldn't extract text from this file. Please try a clearer photo or the original PDF." |
| Unsupported type | Wrong MIME type | "We only accept PDF, JPG, or PNG files." |
| File too large | Over 10MB | "Your file is too large. Please upload a file under 10MB." |

### Implementation
```typescript
async function parseBill(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    let text: string;

    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      // Image path — Claude Vision
      let imageBuffer = buffer;
      let imageMime = mimeType as 'image/jpeg' | 'image/png' | 'image/webp';

      if (mimeType === 'image/heic') {
        imageBuffer = await convertHeicToJpeg(buffer);
        imageMime = 'image/jpeg';
      }

      text = await extractTextFromImage(imageBuffer, imageMime);
    }

    const cleaned = cleanExtractedText(text);

    // Validate extraction quality
    if (cleaned.length < 50) {
      throw new ExtractionError(
        "We couldn't extract text from this file. Please try a clearer photo or the original PDF.",
        'INSUFFICIENT_TEXT',
      );
    }

    return cleaned;

  } catch (error) {
    // Password-protected PDF detection
    if (error instanceof Error && error.message.includes('password')) {
      throw new ExtractionError(
        'This PDF is password protected. Please remove the password and re-upload.',
        'PASSWORD_PROTECTED',
      );
    }

    // Re-throw ExtractionErrors as-is
    if (error instanceof ExtractionError) throw error;

    // Generic extraction failure
    console.error('[pdf-parse] Extraction failed', {
      mimeType,
      bufferSize: buffer.length,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new ExtractionError(
      "We couldn't read your bill. The file may be damaged. Please try a different copy.",
      'PARSE_FAILED',
    );
  }
}
```

---

## 9. Custom Error Class

```typescript
// lib/errors.ts
export class ExtractionError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ExtractionError';
    this.code = code;
  }
}
```

---

## 10. Storing Extracted Text

```typescript
// After successful extraction — save to database
const { error: updateError } = await supabase
  .from('cases')
  .update({
    bill_text: cleanedText,
    status: 'analysing',
  })
  .eq('id', caseId);

if (updateError) {
  throw new Error(`Failed to save extracted text: ${updateError.message}`);
}

// Log extraction stats to case_events
await supabase.from('case_events').insert({
  case_id: caseId,
  event_type: 'text_extracted',
  note: `Extracted ${cleanedText.split(/\s+/).length} words from ${mimeType}`,
});
```

### Rules
- **Save raw cleaned text** to `cases.bill_text` — this is the audit trail.
- **Never delete the original file** from Supabase Storage — keep for re-processing.
- **Log word count** to `case_events` for debugging failed analyses.
- **Update case status** to `analysing` after successful extraction.

---

## 11. Complete Upload Pipeline

```
User uploads file
      │
      ▼
  Validate file (type, size)
      │
      ▼
  Upload to Supabase Storage (bills/{userId}/{caseId}/{timestamp}.ext)
      │
      ▼
  Download buffer from Storage
      │
      ▼
  Extract text (pdf-parse for PDF, Claude Vision for images)
      │
      ▼
  Clean extracted text
      │
      ▼
  Validate extraction quality (>50 chars)
      │
      ▼
  Save bill_text to cases table
      │
      ▼
  Log extraction event to case_events
      │
      ▼
  Update case status → "analysing"
      │
      ▼
  Trigger analysis (next step — handled by Analysis Agent)
```

### Rules
- Every step has error handling.
- Every step logs on failure.
- The original file is **never modified or deleted**.
- The pipeline is **idempotent** — re-running extraction on the same file produces the same result.
